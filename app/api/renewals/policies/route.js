import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policies/type-display";
import { startOfDay } from "@/app/lib/reporting/filters";
import { getDaysStatus, getExpiryState } from "@/lib/renewals/dates";

export const dynamic = "force-dynamic";

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
    const company = searchParams.get("company") || "All";
    const policyType = searchParams.get("policyType") || "All";
    const tab = searchParams.get("tab") || "upcoming";
    const q = searchParams.get("q") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const offset = (page - 1) * limit;
    const daysParam = searchParams.get("days");

    const requestedMaxDays = daysParam ? parseInt(daysParam, 10) : 29;
    const maxDays = Math.min(Math.max(Number.isFinite(requestedMaxDays) ? requestedMaxDays : 29, 1), 30);

    const today = startOfDay(new Date());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;
    const actorId = user.userId || user.id || null;

    const queryParams = [
      isSuperAdmin,
      orgId,
      todayStr,
      tab,
      maxDays,
      company,
      policyType,
      q.trim(),
      `%${q.trim().toLowerCase()}%`,
      actorId
    ];

    const baseCTE = `
      WITH normalized_policies AS (
        SELECT 
          id,
          saved_at,
          updated_at,
          is_active_policy,
          COALESCE(renewal_status, 'ACTIVE') AS renewal_status,
          created_by_id,
          updated_by_id,
          selected_company,
          selected_policy_type,
          COALESCE(reviewed_data->>'assignedTo', data->>'assignedTo', '') AS assigned_to,
          COALESCE(reviewed_data->'renewalFollowUp'->>'nextFollowUpDate', data->'renewalFollowUp'->>'nextFollowUpDate', '') AS raw_follow_up,
          COALESCE(reviewed_data->'renewalFollowUp'->>'priority', data->'renewalFollowUp'->>'priority', '') AS priority,
          COALESCE(reviewed_data->'renewalFollowUp'->>'lastRemarkBy', data->'renewalFollowUp'->>'lastRemarkBy', '') AS last_remark_by,
          COALESCE(reviewed_data->'renewalRemarks'->0->>'text', data->'renewalRemarks'->0->>'text', reviewed_data->>'remark', data->>'remark', '') AS latest_remark,
          COALESCE(reviewed_data->>'insuranceCompany', reviewed_data->>'Insurance Company', data->>'insuranceCompany', data->>'Insurance Company', '') AS company,
          COALESCE(reviewed_data->>'policyType', reviewed_data->>'Policy Type', data->>'policyType', data->>'Policy Type', '') AS policy_type,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry,
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
          ) AS policy_haystack,
          LOWER(
            COALESCE(reviewed_data->>'insuredName', data->>'insuredName', '') || ' ' ||
            COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') || ' ' ||
            COALESCE(reviewed_data->>'contactNumber', data->>'contactNumber', '') || ' ' ||
            COALESCE(reviewed_data->>'vehicleNumber', data->>'vehicleNumber', '') || ' ' ||
            COALESCE(reviewed_data->>'registrationNumber', data->>'registrationNumber', '') || ' ' ||
            COALESCE(reviewed_data->'renewalRemarks'->0->>'text', data->'renewalRemarks'->0->>'text', reviewed_data->>'remark', data->>'remark', '') || ' ' ||
            COALESCE(reviewed_data->>'assignedTo', data->>'assignedTo', '') || ' ' ||
            COALESCE(selected_company, '') || ' ' ||
            COALESCE(selected_policy_type, '') || ' ' ||
            COALESCE((SELECT name FROM users WHERE users.id = created_by_id), '') || ' ' ||
            COALESCE((SELECT email FROM users WHERE users.id = created_by_id), '') || ' ' ||
            COALESCE((SELECT name FROM users WHERE users.id = updated_by_id), '') || ' ' ||
            COALESCE((SELECT email FROM users WHERE users.id = updated_by_id), '')
          ) AS search_text
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id = $2::uuid)
      ),
      parsed_policies AS (
        SELECT 
          id,
          saved_at,
          updated_at,
          is_active_policy,
          renewal_status,
          created_by_id,
          updated_by_id,
          assigned_to,
          raw_follow_up,
          priority,
          latest_remark,
          last_remark_by,
          company,
          policy_type,
          selected_company,
          selected_policy_type,
          search_text,
          (CASE
            WHEN policy_haystack ~ '\\m(motor|vehicle|private\\s+car|two\\s+wheeler|commercial\\s+vehicle|goods\\s+carrying|auto\\s+secure|registration|chassis|engine)\\M'
              OR policy_haystack ~ '\\m[a-z]{2}[-\\s]?\\d{1,2}[-\\s]?[a-z]{1,3}[-\\s]?\\d{4}\\M' THEN 'Motor Policy'
            WHEN policy_haystack ~ '\\m(fire|sfsp|standard\\s+fire|msme\\s+suraksha|burglary|warehouse|stock|contents|property|industrial\\s+all\\s+risk)\\M' THEN 'Fire Policy'
            WHEN policy_haystack ~ '\\m(health|mediclaim|medical|family\\s+floater|critical\\s+illness|hospital|personal\\s+accident|pa policy)\\M' THEN 'Health Policy'
            WHEN policy_haystack ~ '\\m(life|term\\s+life|endowment|ulip|whole\\s+life|annuity|pension)\\M' THEN 'Life Policy'
            WHEN policy_haystack ~ '\\m(travel|journey|overseas|student\\s+travel)\\M' THEN 'Travel Policy'
            WHEN policy_haystack ~ '\\m(marine|transit|cargo|inland\\s+transit)\\M' THEN 'Marine Policy'
            WHEN policy_haystack ~ '\\m(commercial|business|shop|office|sme|package)\\M' THEN 'Commercial Policy'
            ELSE 'Other Policy'
           END) AS policy_family,
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
           END) AS follow_up_date,
          (CASE
            WHEN COALESCE(TRIM(raw_expiry), '') = '' THEN 'missing'
            WHEN raw_expiry ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])' OR raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2,4}' THEN 'valid'
            ELSE 'invalid'
           END) AS expiry_state
        FROM normalized_policies
      ),
      active_policies AS (
        SELECT *
        FROM parsed_policies
        WHERE 
          (expiry_date IS NOT NULL AND (expiry_date - $3::date) >= -30 AND (expiry_date - $3::date) <= 30)
          OR (is_active_policy = true AND expiry_date IS NOT NULL AND (expiry_date - $3::date) < -30 AND LOWER(renewal_status) IN ('follow-up', 'follow_up', 'interested', 'quote sent', 'quote_sent', 'negotiation', 'pending approval', 'pending_approval'))
          OR (expiry_state IN ('missing', 'invalid'))
      ),
      filtered_policies AS (
        SELECT 
          id,
          saved_at,
          expiry_date,
          expiry_state,
          follow_up_date,
          (expiry_date - $3::date) AS days_remaining
        FROM active_policies
        WHERE 
          -- Tab Filter
          (
            ($4 = 'upcoming' AND is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND (
              ((expiry_date - $3::date) >= -30 AND (expiry_date - $3::date) <= 30)
              OR (
                (expiry_date - $3::date) < -30
                AND LOWER(renewal_status) IN ('follow-up', 'follow_up', 'interested', 'quote sent', 'quote_sent', 'negotiation', 'pending approval', 'pending_approval')
              )
            ))
            OR ($4 IN ('due_7', 'due_in_7') AND is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 7)
            OR ($4 IN ('due_15', 'due_in_15') AND is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 15)
            OR ($4 IN ('due_30', 'due_in_30') AND is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 30)
            OR ($4 IN ('due_today', 'today') AND is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date = $3::date)
            OR ($4 IN ('expired', 'overdue') AND is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND (expiry_date - $3::date) < 0 AND (
              ((expiry_date - $3::date) >= -30)
              OR LOWER(renewal_status) IN ('follow-up', 'follow_up', 'interested', 'quote sent', 'quote_sent', 'negotiation', 'pending approval', 'pending_approval')
            ))
            OR ($4 = 'bad_expiry' AND expiry_state IN ('missing', 'invalid'))
            OR ($4 = 'missing_expiry' AND expiry_state = 'missing')
            OR ($4 = 'invalid_expiry' AND expiry_state = 'invalid')
            OR ($4 = 'followup_today' AND follow_up_date = $3::date)
            OR ($4 = 'missed_followup' AND follow_up_date IS NOT NULL AND follow_up_date < $3::date AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE'))
            OR ($4 = 'renewed' AND renewal_status = 'RENEWED')
            OR ($4 = 'lost' AND renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE'))
            OR ($4 = 'not_interested' AND renewal_status = 'NOT_INTERESTED')
            OR ($4 = 'wrong_number' AND renewal_status = 'WRONG_NUMBER')
            OR ($4 = 'renewed_elsewhere' AND renewal_status = 'RENEWED_ELSEWHERE')
            OR ($4 = 'assigned_to_me' AND (created_by_id = $10::uuid OR LOWER(assigned_to) = LOWER((SELECT COALESCE(name, email, '') FROM users WHERE id = $10::uuid))))
            OR ($4 = 'updated_by_me' AND updated_by_id = $10::uuid)
            OR ($4 = 'created_by_me' AND created_by_id = $10::uuid)
            OR ($4 = 'today_work' AND (
              (updated_by_id = $10::uuid AND updated_at >= $3::date::timestamp AND updated_at < ($3::date + INTERVAL '1 day'))
              OR id::text IN (
                SELECT entity_id
                FROM audit_logs
                WHERE user_id = $10::uuid
                  AND entity_type = 'PolicyRecord'
                  AND action IN ('RENEWAL_REMARK_ADDED', 'POLICY_RENEWED', 'POLICY_MARK_LOST', 'RENEWAL_REASSIGNED', 'WHATSAPP_REMINDER_SENT')
                  AND created_at >= $3::date::timestamp
                  AND created_at < ($3::date + INTERVAL '1 day')
                  AND ($1::boolean OR organization_id = $2::uuid)
              )
            ))
            OR ($4 = 'priority_high' AND LOWER(priority) IN ('high', 'urgent'))
            OR ($4 = 'priority_medium' AND LOWER(priority) IN ('medium', 'normal'))
            OR ($4 = 'priority_low' AND LOWER(priority) = 'low')
            OR ($4 = 'all')
          )
          -- Company Filter
          AND (
            $6 = 'All' 
            OR LOWER(company) = LOWER($6) 
            OR LOWER(selected_company) = LOWER($6)
          )
          -- Policy Type Filter
          AND (
            $7 = 'All' 
            OR LOWER(policy_type) = LOWER($7) 
            OR LOWER(selected_policy_type) = LOWER($7)
            OR LOWER(policy_family) = LOWER($7)
            OR LOWER(policy_family) = LOWER($7 || ' Policy')
          )
          -- Text Search
          AND (
            $8 = '' 
            OR search_text LIKE $9
          )
      )
    `;

    const countQuery = `${baseCTE} SELECT COUNT(*)::integer as count FROM filtered_policies`;
    const summaryQuery = `
      ${baseCTE}
      SELECT
        COUNT(*)::integer AS total,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date = $3::date THEN 1 END)::integer AS due_today,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 7 THEN 1 END)::integer AS due7,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 15 THEN 1 END)::integer AS due15,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 30 THEN 1 END)::integer AS due30,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date < $3::date AND (((expiry_date - $3::date) >= -30) OR LOWER(renewal_status) IN ('follow-up', 'follow_up', 'interested', 'quote sent', 'quote_sent', 'negotiation', 'pending approval', 'pending_approval')) THEN 1 END)::integer AS overdue,
        COUNT(CASE WHEN follow_up_date = $3::date THEN 1 END)::integer AS follow_up_today,
        COUNT(CASE WHEN follow_up_date IS NOT NULL AND follow_up_date < $3::date AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS missed_followups,
        COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END)::integer AS renewed,
        COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS lost,
        COUNT(CASE WHEN expiry_state = 'missing' THEN 1 END)::integer AS missing_expiry,
        COUNT(CASE WHEN expiry_state = 'invalid' THEN 1 END)::integer AS invalid_expiry,
        COUNT(DISTINCT CASE
          WHEN (
            (updated_by_id = $10::uuid AND updated_at >= $3::date::timestamp AND updated_at < ($3::date + INTERVAL '1 day'))
            OR id::text IN (
              SELECT entity_id
              FROM audit_logs
              WHERE user_id = $10::uuid
                AND entity_type = 'PolicyRecord'
                AND action IN ('RENEWAL_REMARK_ADDED', 'POLICY_RENEWED', 'POLICY_MARK_LOST', 'RENEWAL_REASSIGNED', 'WHATSAPP_REMINDER_SENT')
                AND created_at >= $3::date::timestamp
                AND created_at < ($3::date + INTERVAL '1 day')
                AND ($1::boolean OR organization_id = $2::uuid)
            )
          ) THEN id
        END)::integer AS today_work
      FROM active_policies
      WHERE
        (
          $6 = 'All'
          OR LOWER(company) = LOWER($6)
          OR LOWER(selected_company) = LOWER($6)
        )
        AND (
          $7 = 'All'
          OR LOWER(policy_type) = LOWER($7)
          OR LOWER(selected_policy_type) = LOWER($7)
          OR LOWER(policy_family) = LOWER($7)
          OR LOWER(policy_family) = LOWER($7 || ' Policy')
        )
        AND (
          $8 = ''
          OR search_text LIKE $9
        )
    `;
    const dataQuery = `
      ${baseCTE} 
      SELECT id, days_remaining FROM filtered_policies
      ORDER BY 
        CASE WHEN days_remaining IS NOT NULL THEN 0 ELSE 1 END,
        days_remaining ASC,
        saved_at DESC
      LIMIT $11::integer OFFSET $12::integer
    `;

    const [countResult, dataResult, summaryResult] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...queryParams),
      prisma.$queryRawUnsafe(dataQuery, ...queryParams, limit, offset),
      prisma.$queryRawUnsafe(summaryQuery, ...queryParams)
    ]);

    const totalCount = countResult[0]?.count || 0;
    const ids = dataResult.map((r) => r.id);
    const daysRemainingMap = {};
    dataResult.forEach((r) => {
      daysRemainingMap[r.id] = r.days_remaining;
    });

    let policies = [];
    if (ids.length > 0) {
      const rawRecords = await prisma.policyRecord.findMany({
        where: { id: { in: ids } },
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
          updatedAt: true,
          createdById: true,
          updatedById: true,
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } }
        }
      });

      const recordMap = {};
      rawRecords.forEach((record) => {
        recordMap[record.id] = record;
      });

      // Look up new policy numbers for renewed entries
      const renewedPolicyIds = rawRecords.map(r => r.renewedPolicyId).filter(Boolean);
      const renewedPolicyMap = {};
      if (renewedPolicyIds.length > 0) {
        const renewedPolicies = await prisma.policyRecord.findMany({
          where: { id: { in: renewedPolicyIds } },
          select: { id: true, data: true, reviewedData: true }
        });
        renewedPolicies.forEach(p => {
          const payload = p.reviewedData || p.data || {};
          renewedPolicyMap[p.id] = payload.policyNumber || "";
        });
      }

      const orderedRecords = ids.map((id) => recordMap[id]).filter(Boolean);
      policies = orderedRecords.map((record) => {
        const normalized = withRenewalPolicyDisplay(normalizeRecord(record));
        normalized.daysRemaining = daysRemainingMap[record.id];
        normalized.expiryState = getExpiryState(normalized.expiryDate);
        normalized.daysStatus = getDaysStatus(normalized.expiryDate);
        if (record.renewedPolicyId && renewedPolicyMap[record.renewedPolicyId]) {
          normalized.newPolicyNumber = renewedPolicyMap[record.renewedPolicyId];
        }
        return normalized;
      });
    }

    return Response.json({
      policies,
      totalCount,
      pages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      summaryCounts: normalizeSummaryCounts(summaryResult[0] || {})
    });
  } catch (error) {
    console.error("Renewals policies fetch failed:", error);
    return Response.json({ error: "Failed to load renewal policies." }, { status: 500 });
  }
}

function normalizeSummaryCounts(row = {}) {
  return {
    total: Number(row.total) || 0,
    dueToday: Number(row.due_today) || 0,
    due7: Number(row.due7) || 0,
    due15: Number(row.due15) || 0,
    due30: Number(row.due30) || 0,
    overdue: Number(row.overdue) || 0,
    followUpToday: Number(row.follow_up_today) || 0,
    missedFollowUps: Number(row.missed_followups) || 0,
    renewed: Number(row.renewed) || 0,
    lost: Number(row.lost) || 0,
    missingExpiry: Number(row.missing_expiry) || 0,
    invalidExpiry: Number(row.invalid_expiry) || 0,
    todayWork: Number(row.today_work) || 0
  };
}
