import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { startOfDay } from "@/app/lib/reporting/filters";
import { normalizeRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

function cleanMobile(value = "") {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function isUsefulContactName(contactName = "", companyName = "") {
  const contact = String(contactName || "").replace(/\s+/g, " ").trim();
  const company = String(companyName || "").replace(/\s+/g, " ").trim();
  if (!contact) return false;
  if (company && contact.toLowerCase() === company.toLowerCase()) return false;
  return true;
}

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "All"; // Active, Due Soon, Overdue, Fully Renewed, Lost, All
    const assignedTo = searchParams.get("assignedTo") || "All";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const offset = (page - 1) * limit;

    const today = startOfDay(new Date());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    const queryParams = [
      isSuperAdmin,
      orgId,
      todayStr,
      status,
      q.trim(),
      `%${q.trim().toLowerCase()}%`,
      assignedTo
    ];

    const baseCTE = `
      WITH normalized_policies AS (
        SELECT 
          id,
          saved_at,
          is_active_policy,
          COALESCE(renewal_status, 'ACTIVE') AS renewal_status,
          created_by_id,
          COALESCE(reviewed_data->>'assignedTo', data->>'assignedTo', '') AS assigned_to,
          COALESCE(reviewed_data->>'insuredName', data->>'insuredName', reviewed_data->>'customerName', data->>'customerName', '') AS insured_name,
          COALESCE(
            reviewed_data->>'contactPerson',
            reviewed_data->>'contactPersonName',
            reviewed_data->>'customerName',
            data->>'contactPerson',
            data->>'contactPersonName',
            data->>'customerName',
            ''
          ) AS contact_person,
          COALESCE(
            reviewed_data->>'contactNumber',
            reviewed_data->>'customerMobile',
            reviewed_data->>'mobileNumber',
            reviewed_data->>'phone',
            data->>'contactNumber',
            data->>'customerMobile',
            data->>'mobileNumber',
            data->>'phone',
            ''
          ) AS contact_number,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id = $2::uuid)
      ),
      parsed_policies AS (
        SELECT
          id,
          saved_at,
          is_active_policy,
          renewal_status,
          created_by_id,
          assigned_to,
          insured_name,
          contact_person,
          CASE
            WHEN LENGTH(regexp_replace(contact_number, '[^0-9]', '', 'g')) >= 10
              THEN RIGHT(regexp_replace(contact_number, '[^0-9]', '', 'g'), 10)
            ELSE 'NO-MOBILE-' || id
          END AS contact_number,
          (CASE
            WHEN COALESCE(TRIM(raw_expiry), '') = '' THEN NULL
            WHEN raw_expiry ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
            ELSE NULL
           END) AS expiry_date
        FROM normalized_policies
      ),
      parsed_policies_with_days AS (
        SELECT
          *,
          CASE WHEN expiry_date IS NULL THEN NULL ELSE (expiry_date - $3::date)::integer END AS days_left,
          CASE
            WHEN renewal_status = 'RENEWED' THEN 'RENEWED'
            WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 'LOST'
            WHEN expiry_date IS NOT NULL AND (expiry_date - $3::date)::integer < 0 THEN 'EXPIRED'
            WHEN expiry_date IS NOT NULL AND (expiry_date - $3::date)::integer <= 30 THEN 'ACTIVE'
            ELSE renewal_status
          END AS computed_renewal_status
        FROM parsed_policies
      ),
      customer_profile_contacts AS (
        SELECT
          RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10) AS mobile,
          MAX(NULLIF(contact_person_name, '')) AS profile_contact_person,
          MAX(NULLIF(name, '')) AS profile_name,
          MAX(NULLIF(assigned_to, '')) AS profile_assigned_to
        FROM customer_profiles
        WHERE deleted_at IS NULL
          AND LENGTH(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10
          AND ($1::boolean OR organization_id = $2::uuid)
        GROUP BY RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
      ),
      active_renewals AS (
        SELECT 
          *
        FROM parsed_policies_with_days
        WHERE 
          -- Standard expiry window, plus closed renewal records and manual search results.
          (
            days_left BETWEEN -30 AND 30
            OR renewal_status IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE')
            OR $5 <> ''
          )
      ),
      customer_groups AS (
        SELECT 
          contact_number AS mobile,
          STRING_AGG(DISTINCT NULLIF(insured_name, ''), ', ' ORDER BY NULLIF(insured_name, '')) AS company_names,
          MAX(insured_name) AS customer_name,
          MAX(contact_person) AS contact_person,
          COALESCE(
            NULLIF(MAX(cpc.profile_contact_person), ''),
            NULLIF(MAX(cpc.profile_name), ''),
            NULLIF(MAX(contact_person), ''),
            MAX(insured_name),
            'Unknown Contact'
          ) AS contact_person_name,
          -- Count of unique company/insured names for this contact
          (SELECT COUNT(DISTINCT NULLIF(p2.insured_name, ''))::integer FROM parsed_policies_with_days p2 WHERE p2.contact_number = active_renewals.contact_number) AS total_companies,
          -- Count of ALL policies for this contact in the DB
          COUNT(*)::integer AS total_policies,
          -- Count of policies due (active and pending in window, excluding Renewed/Lost)
          COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND days_left BETWEEN -30 AND 30 THEN 1 END)::integer AS policies_due,
          MIN(expiry_date) AS nearest_expiry,
          MIN(days_left) AS nearest_days_left,
          COALESCE(NULLIF(MAX(cpc.profile_assigned_to), ''), MAX(assigned_to)) AS assigned_user,
          -- Reference Policy ID for customer level actions
          COALESCE(
            (SELECT id FROM parsed_policies_with_days p3 
             WHERE p3.contact_number = active_renewals.contact_number 
               AND p3.is_active_policy = true 
               AND p3.renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE')
             ORDER BY p3.days_left ASC LIMIT 1),
            (SELECT id FROM parsed_policies_with_days p4 
             WHERE p4.contact_number = active_renewals.contact_number 
             ORDER BY p4.days_left ASC NULLS LAST, p4.saved_at DESC LIMIT 1)
          ) AS nearest_due_policy_id,
          -- Customer status aggregation
          (CASE
            WHEN COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END) > 0 THEN
              -- There are due policies
              CASE 
                WHEN MIN(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN days_left END) < 0 THEN 'Expired'
                ELSE 'Due Soon'
              END
            ELSE
              -- No due policies in window
              CASE
                WHEN COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END) > 0 AND COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END) = 0 THEN 'Renewed'
                WHEN COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END) > 0 AND COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END) = 0 THEN 'Lost'
                ELSE 'Active'
              END
          END) AS customer_status
        FROM active_renewals
        LEFT JOIN customer_profile_contacts cpc
          ON cpc.mobile = active_renewals.contact_number
        GROUP BY contact_number
      ),
      filtered_groups AS (
        SELECT *
        FROM customer_groups
        WHERE
          -- Status Filter
          ($4 = 'All' 
           OR LOWER(customer_status) = LOWER($4) 
           OR ($4 = 'Overdue' AND LOWER(customer_status) = 'expired')
           OR ($4 = 'Expired' AND LOWER(customer_status) = 'expired')
           OR ($4 = 'Fully Renewed' AND LOWER(customer_status) = 'renewed')
           OR ($4 = 'Renewed' AND LOWER(customer_status) = 'renewed')
          )
          -- Text Search
          AND (
            $5 = '' 
            OR LOWER(COALESCE(company_names, customer_name, '')) LIKE $6 
            OR LOWER(contact_person_name) LIKE $6
            OR LOWER(contact_person) LIKE $6
            OR mobile LIKE $6
          )
          -- Assigned Agent filter
          AND (
            $7 = 'All' 
            OR LOWER(assigned_user) = LOWER($7)
          )
      )
    `;

    const countQuery = `
      ${baseCTE}
      SELECT COUNT(*)::integer as count FROM filtered_groups
    `;

    const dataQuery = `
      ${baseCTE}
      SELECT *
      FROM filtered_groups
      ORDER BY 
        CASE WHEN nearest_expiry IS NOT NULL THEN 0 ELSE 1 END,
        nearest_days_left ASC,
        contact_person_name ASC
      LIMIT $8::integer OFFSET $9::integer
    `;

    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...queryParams),
      prisma.$queryRawUnsafe(dataQuery, ...queryParams, limit, offset)
    ]);

    const totalCount = countResult[0]?.count || 0;
    const pageMobiles = dataResult.map((row) => String(row.mobile || "")).filter((mobile) => mobile && !mobile.startsWith("NO-MOBILE-"));
    const rawPagePolicies = pageMobiles.length
      ? await prisma.policyRecord.findMany({
          where: {
            deletedAt: null,
            ...(isSuperAdmin ? {} : { organizationId: orgId }),
            OR: pageMobiles.flatMap((mobile) => [
              { reviewedData: { path: ["contactNumber"], string_contains: mobile } },
              { reviewedData: { path: ["customerMobile"], string_contains: mobile } },
              { data: { path: ["contactNumber"], string_contains: mobile } },
              { data: { path: ["customerMobile"], string_contains: mobile } }
            ])
          },
          select: {
            id: true,
            savedAt: true,
            data: true,
            reviewedData: true,
            renewalStatus: true,
            previousPolicyId: true,
            renewedPolicyId: true,
            renewalDate: true,
            lostReason: true,
            isActivePolicy: true,
            selectedCompany: true,
            selectedPolicyType: true,
            pdfFileName: true,
            createdAt: true,
            updatedAt: true
          }
        })
      : [];

    const contactByMobile = new Map();
    for (const record of rawPagePolicies) {
      const policy = normalizeRecord(record);
      const mobile = cleanMobile(policy.contactNumber);
      if (!mobile || contactByMobile.has(mobile)) continue;
      if (isUsefulContactName(policy.contactPerson, policy.insuredName)) {
        contactByMobile.set(mobile, policy.contactPerson);
      }
    }

    const enrichedCustomers = dataResult.map((row) => {
      const policyContact = contactByMobile.get(String(row.mobile || ""));
      const resolvedContact = isUsefulContactName(row.contact_person_name, row.company_names)
        ? row.contact_person_name
        : isUsefulContactName(row.contact_person, row.company_names)
          ? row.contact_person
          : policyContact || "";

      return {
        ...row,
        contact_person_name: resolvedContact || "",
        contact_person: resolvedContact || row.contact_person || ""
      };
    });

    return Response.json({
      customers: enrichedCustomers,
      totalCount,
      pages: Math.ceil(totalCount / limit) || 1,
      currentPage: page
    });
  } catch (error) {
    console.error("Customers list fetch failed:", error);
    return Response.json({ error: "Failed to load customer renewals." }, { status: 500 });
  }
}
