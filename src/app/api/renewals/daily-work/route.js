import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policies/type-display";
import { withRenewalCompanyDisplay } from "@/lib/renewals/companies";
import { calculateDaysLeft, calculateRenewalStatus } from "@/lib/renewals/dates";
import { startOfDay } from "@/app/lib/reporting/filters";

export const dynamic = "force-dynamic";

const VALID_FILTERS = new Set([
  "all_work",
  "due_today",
  "followup_today",
  "overdue_followup",
  "completed_today",
]);
const VALID_LOBS = new Set(["all", "motor", "warehouse", "other"]);

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const user = await verifyJWT(token);
    if (!user) return Response.json({ error: "Invalid session" }, { status: 401 });

    const actorId = user.userId || user.id || null;
    if (!actorId) return Response.json({ error: "User session is invalid." }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const requestedFilter = searchParams.get("filter") || "all_work";
    const requestedLob = searchParams.get("lob") || "all";
    const filter = VALID_FILTERS.has(requestedFilter) ? requestedFilter : "all_work";
    const lob = VALID_LOBS.has(requestedLob) ? requestedLob : "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25));
    const offset = (page - 1) * limit;
    const includeCounts = searchParams.get("includeCounts") !== "false";

    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const organizationId = user.organizationId ?? null;
    const queryParams = [
      isSuperAdmin,
      organizationId,
      todayStr,
      filter,
      lob,
      actorId,
      today.toISOString(),
      tomorrow.toISOString(),
    ];

    const baseCTE = `
      WITH normalized_policies AS (
        SELECT
          id,
          saved_at,
          updated_at,
          updated_by_id,
          renewal_date,
          is_active_policy,
          UPPER(REPLACE(TRIM(COALESCE(renewal_status, 'ACTIVE')), ' ', '_')) AS renewal_status,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry,
          COALESCE(reviewed_data->'renewalFollowUp'->>'nextFollowUpDate', data->'renewalFollowUp'->>'nextFollowUpDate', '') AS raw_follow_up,
          LOWER(
            COALESCE(selected_policy_type, '') || ' ' ||
            COALESCE(reviewed_data->>'policyType', reviewed_data->>'Policy Type', data->>'policyType', data->>'Policy Type', '') || ' ' ||
            COALESCE(reviewed_data->>'documentCategory', data->>'documentCategory', '') || ' ' ||
            COALESCE(reviewed_data->>'policyCoverType', data->>'policyCoverType', '') || ' ' ||
            COALESCE(reviewed_data->>'insuranceCompany', reviewed_data->>'Insurance Company', data->>'insuranceCompany', data->>'Insurance Company', '') || ' ' ||
            COALESCE(reviewed_data->>'sourceFile', data->>'sourceFile', '') || ' ' ||
            COALESCE(reviewed_data->>'description', data->>'description', '') || ' ' ||
            COALESCE(reviewed_data->>'vehicleNumber', data->>'vehicleNumber', '') || ' ' ||
            COALESCE(reviewed_data->>'registrationNumber', data->>'registrationNumber', '') || ' ' ||
            COALESCE(reviewed_data->>'engineNumber', data->>'engineNumber', '') || ' ' ||
            COALESCE(reviewed_data->>'chassisNumber', data->>'chassisNumber', '')
          ) AS policy_haystack
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
      ),
      parsed_policies AS (
        SELECT
          id,
          saved_at,
          updated_at,
          updated_by_id,
          renewal_date,
          is_active_policy,
          renewal_status,
          CASE
            WHEN COALESCE(TRIM(raw_expiry), '') = '' THEN NULL
            WHEN raw_expiry ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
            ELSE NULL
          END AS expiry_date,
          CASE
            WHEN COALESCE(TRIM(raw_follow_up), '') = '' THEN NULL
            WHEN raw_follow_up ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])' THEN CAST(SUBSTRING(raw_follow_up FROM 1 FOR 10) AS DATE)
            WHEN raw_follow_up ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_follow_up, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_follow_up ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_follow_up, '/', '-'), 'DD-MM-YY')
            ELSE NULL
          END AS follow_up_date,
          CASE
            WHEN policy_haystack ~ '\\m(motor|vehicle|private\\s+car|two\\s+wheeler|bike|scooter|commercial\\s+vehicle|taxi|school\\s+bus|goods\\s+carrying|passenger\\s+carrying|auto\\s+secure|liability\\s+only|comprehensive|own\\s+damage|registration|chassis|engine)\\M'
              OR policy_haystack ~ '\\m[a-z]{2}[-\\s]?\\d{1,2}[-\\s]?[a-z]{1,3}[-\\s]?\\d{4}\\M' THEN 'motor'
            WHEN policy_haystack ~ '\\m(fire|sfsp|standard\\s+fire|msme|msme\\s+suraksha|burglary|warehouse|stock|contents|property|business\\s+guard|laghu|sookshma|fidelity|guarantee|house\\s+breaking|industrial\\s+all\\s+risk)\\M' THEN 'warehouse'
            ELSE 'other'
          END AS policy_category
        FROM normalized_policies
      ),
      actor_work_policy_ids AS (
        SELECT DISTINCT policy.id
        FROM parsed_policies policy
        WHERE
          (
            policy.updated_by_id = $6::uuid
            AND policy.updated_at >= $7::timestamptz
            AND policy.updated_at < $8::timestamptz
          )
          OR EXISTS (
            SELECT 1
            FROM audit_logs audit
            WHERE audit.entity_id = policy.id::text
              AND audit.user_id = $6::uuid
              AND audit.entity_type = 'PolicyRecord'
              AND audit.action IN ('RENEWAL_REMARK_ADDED', 'POLICY_RENEWED', 'POLICY_MARK_LOST', 'RENEWAL_REASSIGNED', 'WHATSAPP_REMINDER_SENT')
              AND audit.created_at >= $7::timestamptz
              AND audit.created_at < $8::timestamptz
              AND ($1::boolean OR audit.organization_id IS NOT DISTINCT FROM $2::uuid)
          )
      ),
      task_policies AS (
        SELECT
          id,
          saved_at,
          renewal_date,
          expiry_date,
          follow_up_date,
          policy_category,
          (is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date = $3::date) AS is_due_today,
          (is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND (expiry_date - $3::date) BETWEEN -30 AND 30 AND follow_up_date = $3::date) AS is_followup_today,
          (is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND (expiry_date - $3::date) BETWEEN -30 AND 30 AND follow_up_date IS NOT NULL AND follow_up_date < $3::date) AS is_overdue_followup,
          EXISTS (SELECT 1 FROM actor_work_policy_ids completed WHERE completed.id = parsed_policies.id) AS is_completed_today
        FROM parsed_policies
      ),
      selected_tasks AS (
        SELECT
          id,
          saved_at,
          renewal_date,
          expiry_date,
          follow_up_date,
          policy_category,
          is_due_today,
          is_followup_today,
          is_overdue_followup,
          is_completed_today
        FROM task_policies
        WHERE
          ($4 = 'all_work' AND (is_due_today OR is_followup_today OR is_overdue_followup))
          OR ($4 = 'due_today' AND is_due_today)
          OR ($4 = 'followup_today' AND is_followup_today)
          OR ($4 = 'overdue_followup' AND is_overdue_followup)
          OR ($4 = 'completed_today' AND is_completed_today)
      )
    `;

    const dataQuery = `
      ${baseCTE}
      SELECT id, (expiry_date - $3::date) AS days_remaining
      FROM selected_tasks
      WHERE $5 = 'all' OR policy_category = $5
      ORDER BY
        CASE WHEN $4 = 'completed_today' THEN renewal_date END DESC,
        CASE WHEN $4 = 'overdue_followup' THEN follow_up_date END ASC,
        COALESCE(follow_up_date, expiry_date) ASC,
        saved_at DESC
      LIMIT $9::integer OFFSET $10::integer
    `;

    const countsQuery = `
      ${baseCTE},
      activity_counts AS (
        SELECT
          COUNT(*) FILTER (WHERE action = 'POLICY_RENEWED')::integer AS renewed,
          COUNT(*) FILTER (WHERE action = 'POLICY_MARK_LOST')::integer AS lost
        FROM audit_logs
        WHERE user_id = $6::uuid
          AND entity_type = 'PolicyRecord'
          AND entity_id IS NOT NULL
          AND action IN ('RENEWAL_REMARK_ADDED', 'POLICY_RENEWED', 'POLICY_MARK_LOST', 'RENEWAL_REASSIGNED', 'WHATSAPP_REMINDER_SENT')
          AND created_at >= $7::timestamptz
          AND created_at < $8::timestamptz
          AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
      )
      SELECT
        (SELECT COUNT(*) FROM selected_tasks WHERE $5 = 'all' OR policy_category = $5)::integer AS total_count,
        (SELECT COUNT(*) FROM task_policies WHERE is_due_today OR is_followup_today OR is_overdue_followup)::integer AS all_work,
        (SELECT COUNT(*) FROM task_policies WHERE is_due_today)::integer AS due_today,
        (SELECT COUNT(*) FROM task_policies WHERE is_followup_today)::integer AS follow_up_today,
        (SELECT COUNT(*) FROM task_policies WHERE is_overdue_followup)::integer AS overdue_follow_up,
        (SELECT COUNT(*) FROM actor_work_policy_ids)::integer AS completed_today,
        (SELECT renewed FROM activity_counts)::integer AS renewed_today,
        (SELECT lost FROM activity_counts)::integer AS lost_today,
        (SELECT COUNT(*) FROM selected_tasks)::integer AS all_count,
        (SELECT COUNT(*) FROM selected_tasks WHERE policy_category = 'motor')::integer AS motor_count,
        (SELECT COUNT(*) FROM selected_tasks WHERE policy_category = 'warehouse')::integer AS warehouse_count,
        (SELECT COUNT(*) FROM selected_tasks WHERE policy_category = 'other')::integer AS other_count
    `;

    const dataPromise = prisma.$queryRawUnsafe(dataQuery, ...queryParams, limit, offset);
    const [dataRows, countRows] = await Promise.all([
      dataPromise,
      includeCounts ? prisma.$queryRawUnsafe(countsQuery, ...queryParams) : Promise.resolve(null),
    ]);

    const ids = dataRows.map((row) => row.id);
    let policies = [];
    if (ids.length > 0) {
      const rawRecords = await prisma.policyRecord.findMany({
        where: { id: { in: ids }, ...getTenantFilter(user, "read") },
        select: {
          id: true,
          savedAt: true,
          data: true,
          reviewedData: true,
          renewalStatus: true,
          renewalDate: true,
          isActivePolicy: true,
          selectedCompany: true,
          selectedPolicyType: true,
          customerPortfolioId: true,
          contactPersonName: true,
          contactPersonMobile: true,
          contactPersonEmail: true,
          renewalRecipientName: true,
          renewalRecipientMobile: true,
          renewalRecipientEmail: true,
          createdById: true,
          createdBy: { select: { name: true, email: true } },
        },
      });
      const recordById = new Map(rawRecords.map((record) => [record.id, record]));
      policies = ids
        .map((id) => recordById.get(id))
        .filter(Boolean)
        .map((record) => {
          const normalized = withRenewalCompanyDisplay(withRenewalPolicyDisplay(normalizeRecord(record)));
          return {
            id: normalized.id,
            insuredName: normalized.insuredName,
            policyNumber: normalized.policyNumber,
            customerPortfolioId: normalized.customerPortfolioId,
            contactNumber: normalized.contactNumber,
            renewalRecipientMobile: normalized.renewalRecipientMobile,
            insuranceCompany: normalized.insuranceCompany,
            displayPolicyType: normalized.displayPolicyType,
            policyType: normalized.policyType,
            expiryDate: normalized.expiryDate,
            daysRemaining: calculateDaysLeft(normalized.expiryDate),
            renewalFollowUp: normalized.renewalFollowUp,
            nextFollowUpDate: normalized.nextFollowUpDate,
            assignedTo: normalized.assignedTo,
            renewalStatus: calculateRenewalStatus(normalized.expiryDate, record.renewalStatus),
            renewalDate: normalized.renewalDate,
          };
        });
    }

    const response = { policies, currentPage: page };
    if (countRows) {
      const row = countRows[0] || {};
      const totalCount = Number(row.total_count) || 0;
      response.totalCount = totalCount;
      response.pages = Math.ceil(totalCount / limit) || 1;
      response.summaryCounts = {
        allWork: Number(row.all_work) || 0,
        dueToday: Number(row.due_today) || 0,
        followUpToday: Number(row.follow_up_today) || 0,
        overdueFollowUp: Number(row.overdue_follow_up) || 0,
        completedToday: Number(row.completed_today) || 0,
        renewedToday: Number(row.renewed_today) || 0,
        lostToday: Number(row.lost_today) || 0,
      };
      response.categoryCounts = {
        all: Number(row.all_count) || 0,
        motor: Number(row.motor_count) || 0,
        warehouse: Number(row.warehouse_count) || 0,
        other: Number(row.other_count) || 0,
      };
    }

    return Response.json(response);
  } catch (error) {
    console.error("Renewal daily work fetch failed:", error);
    return Response.json({ error: "Failed to load renewal daily work." }, { status: 500 });
  }
}
