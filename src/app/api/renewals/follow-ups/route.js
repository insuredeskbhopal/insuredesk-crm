import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { startOfDay } from "@/app/lib/reporting/filters";
import { normalizeRenewalInsuranceCompany } from "@/lib/renewals/companies";

export const dynamic = "force-dynamic";

const FILTERS = new Set(["today", "tomorrow", "this_week", "overdue"]);

const followUpsCTE = `
  WITH normalized_follow_ups AS (
    SELECT
      pr.id,
      pr.saved_at,
      pr.is_active_policy,
      COALESCE(pr.renewal_status, 'ACTIVE') AS renewal_status,
      COALESCE(pr.reviewed_data->>'insuredName', pr.data->>'insuredName', pr.reviewed_data->>'customerName', pr.data->>'customerName', pr.reviewed_data->>'Insured Name', '') AS insured_name,
      COALESCE(pr.reviewed_data->>'policyNumber', pr.data->>'policyNumber', pr.reviewed_data->>'Policy No.', pr.data->>'Policy No.', '') AS policy_number,
      COALESCE(pr.reviewed_data->>'insuranceCompany', pr.reviewed_data->>'Insurance Company', pr.data->>'insuranceCompany', pr.data->>'Insurance Company', pr.selected_company, '') AS company,
      COALESCE(pr.reviewed_data->>'assignedTo', pr.data->>'assignedTo', pr.reviewed_data->'renewalFollowUp'->>'assignedTo', pr.data->'renewalFollowUp'->>'assignedTo', creator.name, creator.email, '') AS assigned_to,
      COALESCE(pr.reviewed_data->'renewalRemarks'->0->>'text', pr.data->'renewalRemarks'->0->>'text', pr.reviewed_data->>'remark', pr.data->>'remark', '') AS latest_remark,
      COALESCE(
        NULLIF(pr.reviewed_data->'renewalFollowUp'->>'nextFollowUpDate', ''),
        NULLIF(pr.data->'renewalFollowUp'->>'nextFollowUpDate', ''),
        ''
      ) AS raw_follow_up,
      COALESCE(pr.reviewed_data->>'expiryDate', pr.reviewed_data->>'policyEndDate', pr.data->>'expiryDate', pr.data->>'policyEndDate') AS raw_expiry,
      COALESCE(
        NULLIF(pr.renewal_recipient_mobile, ''),
        NULLIF(pr.contact_person_mobile, ''),
        NULLIF(pr.reviewed_data->>'renewalRecipientMobile', ''),
        NULLIF(pr.data->>'renewalRecipientMobile', ''),
        NULLIF(pr.reviewed_data->>'contactNumber', ''),
        NULLIF(pr.data->>'contactNumber', ''),
        NULLIF(pr.reviewed_data->>'customerMobile', ''),
        NULLIF(pr.data->>'customerMobile', ''),
        ''
      ) AS renewal_recipient_mobile,
      COALESCE(
        NULLIF(pr.contact_person_mobile, ''),
        NULLIF(pr.reviewed_data->>'contactNumber', ''),
        NULLIF(pr.data->>'contactNumber', ''),
        NULLIF(pr.reviewed_data->>'customerMobile', ''),
        NULLIF(pr.data->>'customerMobile', ''),
        NULLIF(pr.reviewed_data->>'mobileNumber', ''),
        NULLIF(pr.data->>'mobileNumber', ''),
        ''
      ) AS contact_number
    FROM pdf_records pr
    LEFT JOIN users creator ON creator.id = pr.created_by_id
    WHERE pr.deleted_at IS NULL
      AND ($1::boolean OR pr.organization_id IS NOT DISTINCT FROM $2::uuid)
  ),
  parsed_follow_ups AS (
    SELECT
      id,
      saved_at,
      is_active_policy,
      renewal_status,
      insured_name,
      policy_number,
      company,
      assigned_to,
      latest_remark,
      raw_follow_up,
      renewal_recipient_mobile,
      contact_number,
      (CASE
        WHEN COALESCE(TRIM(raw_expiry), '') = '' THEN NULL
        WHEN raw_expiry ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
        WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
        WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
        ELSE NULL
      END) AS expiry_date,
      (CASE
        WHEN COALESCE(TRIM(raw_follow_up), '') = '' THEN NULL
        WHEN raw_follow_up ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])' THEN CAST(SUBSTRING(raw_follow_up FROM 1 FOR 10) AS DATE)
        WHEN raw_follow_up ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_follow_up, '/', '-'), 'DD-MM-YYYY')
        WHEN raw_follow_up ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_follow_up, '/', '-'), 'DD-MM-YY')
        ELSE NULL
      END) AS follow_up_date
    FROM normalized_follow_ups
  ),
  eligible_follow_ups AS (
    SELECT
      id,
      saved_at,
      renewal_status,
      insured_name,
      policy_number,
      company,
      assigned_to,
      latest_remark,
      raw_follow_up,
      renewal_recipient_mobile,
      contact_number,
      follow_up_date
    FROM parsed_follow_ups
    WHERE is_active_policy = true
      AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE')
      AND expiry_date IS NOT NULL
      AND (expiry_date - $3::date) BETWEEN -30 AND 30
      AND follow_up_date IS NOT NULL
  )
`;

const selectedFilterSQL = `
  ($4 = 'today' AND follow_up_date = $3::date)
  OR ($4 = 'tomorrow' AND follow_up_date = ($3::date + 1))
  OR ($4 = 'this_week' AND follow_up_date BETWEEN $3::date AND ($3::date + 7))
  OR ($4 = 'overdue' AND follow_up_date < $3::date)
`;

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const user = await verifyJWT(token);
    if (!user) return Response.json({ error: "Invalid session" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestedFilter = searchParams.get("filter") || "today";
    const filter = FILTERS.has(requestedFilter) ? requestedFilter : "today";
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "25", 10) || 25));
    const offset = (page - 1) * limit;

    const today = startOfDay(new Date());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const organizationId = user.organizationId ?? null;
    const queryParams = [isSuperAdmin, organizationId, todayStr, filter];

    const countsQuery = `
      ${followUpsCTE}
      SELECT
        COUNT(*) FILTER (WHERE follow_up_date = $3::date)::integer AS today_count,
        COUNT(*) FILTER (WHERE follow_up_date = ($3::date + 1))::integer AS tomorrow_count,
        COUNT(*) FILTER (WHERE follow_up_date BETWEEN $3::date AND ($3::date + 7))::integer AS this_week_count,
        COUNT(*) FILTER (WHERE follow_up_date < $3::date)::integer AS overdue_count,
        COUNT(*) FILTER (WHERE ${selectedFilterSQL})::integer AS selected_count
      FROM eligible_follow_ups
    `;
    const dataQuery = `
      ${followUpsCTE}
      SELECT
        id,
        insured_name,
        policy_number,
        company,
        raw_follow_up,
        latest_remark,
        assigned_to,
        renewal_recipient_mobile,
        contact_number,
        renewal_status
      FROM eligible_follow_ups
      WHERE ${selectedFilterSQL}
      ORDER BY follow_up_date ASC, saved_at DESC
      LIMIT $5::integer OFFSET $6::integer
    `;

    const [countRows, rows] = await Promise.all([
      prisma.$queryRawUnsafe(countsQuery, ...queryParams),
      prisma.$queryRawUnsafe(dataQuery, ...queryParams, limit, offset),
    ]);

    const counts = countRows[0] || {};
    const totalCount = Number(counts.selected_count) || 0;
    const filterCounts = {
      today: Number(counts.today_count) || 0,
      tomorrow: Number(counts.tomorrow_count) || 0,
      this_week: Number(counts.this_week_count) || 0,
      overdue: Number(counts.overdue_count) || 0,
    };
    const followUps = rows.map((row) => ({
      id: row.id,
      insuredName: row.insured_name || "",
      policyNumber: row.policy_number || "",
      insuranceCompany: normalizeRenewalInsuranceCompany(row.company),
      nextFollowUpDate: row.raw_follow_up || "",
      latestRemark: row.latest_remark || "",
      assignedTo: row.assigned_to || "",
      renewalRecipientMobile: row.renewal_recipient_mobile || "",
      contactNumber: row.contact_number || "",
      renewalStatus: row.renewal_status || "ACTIVE",
    }));

    return Response.json({
      followUps,
      totalCount,
      pages: Math.max(1, Math.ceil(totalCount / limit)),
      currentPage: page,
      filter,
      filterCounts,
    });
  } catch (error) {
    console.error("Renewal follow-ups fetch failed:", error);
    return Response.json({ error: "Failed to load renewal follow-ups." }, { status: 500 });
  }
}
