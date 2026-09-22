import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policies/type-display";
import { normalizeRenewalRegisterMonth } from "@/lib/renewals/register";
import { moveOverdueRenewalsToLost } from "@/lib/renewals/auto-lost";
import {
  getRenewalCompanyFilterTerms,
  normalizeRenewalInsuranceCompany,
  withRenewalCompanyDisplay,
} from "@/lib/renewals/companies";
import { startOfDay } from "@/app/lib/reporting/filters";
import {
  getDaysStatus,
  getExpiryState,
  calculateDaysLeft,
  calculateRenewalStatus,
} from "@/lib/renewals/dates";

export const dynamic = "force-dynamic";

const AUTO_LOST_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const autoLostSyncState = globalThis.__renewalAutoLostSyncState || new Map();
globalThis.__renewalAutoLostSyncState = autoLostSyncState;

async function ensureOverdueRenewalSync({ organizationId, referenceDate }) {
  const key = organizationId === undefined ? "all-organizations" : organizationId || "null-organization";
  const now = Date.now();
  const current = autoLostSyncState.get(key);
  if (current?.promise) return current.promise;
  if (now - (current?.completedAt || 0) < AUTO_LOST_SYNC_INTERVAL_MS) return 0;

  const promise = moveOverdueRenewalsToLost({ organizationId, referenceDate })
    .then((count) => {
      autoLostSyncState.set(key, { completedAt: Date.now(), promise: null });
      return count;
    })
    .catch((error) => {
      autoLostSyncState.delete(key);
      throw error;
    });
  autoLostSyncState.set(key, { completedAt: current?.completedAt || 0, promise });
  return promise;
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
    const company = searchParams.get("company") || "All";
    const companyFilterTerms = getRenewalCompanyFilterTerms(company);
    const policyType = searchParams.get("policyType") || "All";
    const tab = searchParams.get("tab") || "upcoming";
    const q = searchParams.get("q") || "";
    const summaryOnly = searchParams.get("summaryOnly") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const offset = (page - 1) * limit;
    const daysParam = searchParams.get("days");
    const normalizedMonth = normalizeRenewalRegisterMonth(searchParams.get("month"));
    const renewalMonth = normalizedMonth === "All" ? 0 : Number(normalizedMonth);

    const requestedMaxDays = daysParam ? parseInt(daysParam, 10) : 29;
    const maxDays = Math.min(Math.max(Number.isFinite(requestedMaxDays) ? requestedMaxDays : 29, 1), 30);

    const today = startOfDay(new Date());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;
    const actorId = user.userId || user.id || null;

    ensureOverdueRenewalSync({ organizationId: isSuperAdmin ? undefined : orgId, referenceDate: today }).catch((err) =>
      console.error("Overdue renewal sync error:", err),
    );

    const queryParams = [
      isSuperAdmin,
      orgId,
      todayStr,
      tab,
      maxDays,
      companyFilterTerms,
      policyType,
      q.trim(),
      `%${q.trim().toLowerCase()}%`,
      actorId,
      renewalMonth,
    ];

    const baseCTE = `
      WITH normalized_policies AS (
        SELECT 
          p.id,
          p.saved_at,
          p.updated_at,
          p.is_active_policy,
          COALESCE(p.renewal_status, 'ACTIVE') AS renewal_status,
          p.created_by_id,
          p.updated_by_id,
          p.selected_company,
          p.selected_policy_type,
          p.extraction_method,
          LOWER(COALESCE(p.reviewed_data->>'manualRenewalSource', p.data->>'manualRenewalSource', '')) = 'true' AS manual_renewal_source,
          COALESCE(p.reviewed_data->>'assignedTo', p.data->>'assignedTo', '') AS assigned_to,
          COALESCE(p.reviewed_data->'renewalFollowUp'->>'nextFollowUpDate', p.data->'renewalFollowUp'->>'nextFollowUpDate', '') AS raw_follow_up,
          COALESCE(p.reviewed_data->'renewalFollowUp'->>'priority', p.data->'renewalFollowUp'->>'priority', '') AS priority,
          COALESCE(p.reviewed_data->'renewalFollowUp'->>'lastRemarkBy', p.data->'renewalFollowUp'->>'lastRemarkBy', '') AS last_remark_by,
          COALESCE(p.reviewed_data->'renewalRemarks'->0->>'text', p.data->'renewalRemarks'->0->>'text', p.reviewed_data->>'remark', p.data->>'remark', '') AS latest_remark,
          COALESCE(p.reviewed_data->>'insuranceCompany', p.reviewed_data->>'Insurance Company', p.data->>'insuranceCompany', p.data->>'Insurance Company', '') AS company,
          COALESCE(p.reviewed_data->>'policyType', p.reviewed_data->>'Policy Type', p.data->>'policyType', p.data->>'Policy Type', '') AS policy_type,
          COALESCE(p.reviewed_data->>'expiryDate', p.reviewed_data->>'policyEndDate', p.data->>'expiryDate', p.data->>'policyEndDate') AS raw_expiry,
          LOWER(
            COALESCE(p.selected_policy_type, '') || ' ' ||
            COALESCE(p.reviewed_data->>'policyType', p.reviewed_data->>'Policy Type', p.data->>'policyType', p.data->>'Policy Type', '') || ' ' ||
            COALESCE(p.reviewed_data->>'documentCategory', p.data->>'documentCategory', '') || ' ' ||
            COALESCE(p.reviewed_data->>'policyCoverType', p.data->>'policyCoverType', '') || ' ' ||
            COALESCE(p.reviewed_data->>'insuranceCompany', p.reviewed_data->>'Insurance Company', p.data->>'insuranceCompany', p.data->>'Insurance Company', '') || ' ' ||
            COALESCE(p.reviewed_data->>'insuredName', p.data->>'insuredName', '') || ' ' ||
            COALESCE(p.reviewed_data->>'sourceFile', p.data->>'sourceFile', p.pdf_file_name, '') || ' ' ||
            COALESCE(p.reviewed_data->>'description', p.data->>'description', '') || ' ' ||
            COALESCE(p.reviewed_data->>'vehicleNumber', p.data->>'vehicleNumber', '') || ' ' ||
            COALESCE(p.reviewed_data->>'registrationNumber', p.data->>'registrationNumber', '') || ' ' ||
            COALESCE(p.reviewed_data->>'engineNumber', p.data->>'engineNumber', '') || ' ' ||
            COALESCE(p.reviewed_data->>'chassisNumber', p.data->>'chassisNumber', '')
          ) AS policy_haystack,
          (CASE WHEN $8 = '' THEN '' ELSE LOWER(
            COALESCE(p.reviewed_data->>'insuredName', p.data->>'insuredName', '') || ' ' ||
            COALESCE(p.reviewed_data->>'policyNumber', p.data->>'policyNumber', '') || ' ' ||
            COALESCE(p.contact_person_name, p.reviewed_data->>'contactPerson', p.data->>'contactPerson', '') || ' ' ||
            COALESCE(p.contact_person_mobile, p.reviewed_data->>'contactNumber', p.data->>'contactNumber', '') || ' ' ||
            COALESCE(p.renewal_recipient_name, p.reviewed_data->>'renewalRecipientName', p.data->>'renewalRecipientName', '') || ' ' ||
            COALESCE(p.renewal_recipient_mobile, p.reviewed_data->>'renewalRecipientMobile', p.data->>'renewalRecipientMobile', '') || ' ' ||
            COALESCE(p.reviewed_data->>'vehicleNumber', p.data->>'vehicleNumber', '') || ' ' ||
            COALESCE(p.reviewed_data->>'registrationNumber', p.data->>'registrationNumber', '') || ' ' ||
            COALESCE(p.reviewed_data->'renewalRemarks'->0->>'text', p.data->'renewalRemarks'->0->>'text', p.reviewed_data->>'remark', p.data->>'remark', '') || ' ' ||
            COALESCE(p.reviewed_data->>'assignedTo', p.data->>'assignedTo', '') || ' ' ||
            COALESCE(p.selected_company, '') || ' ' ||
            COALESCE(p.selected_policy_type, '') || ' ' ||
            COALESCE(uc.name, '') || ' ' ||
            COALESCE(uc.email, '') || ' ' ||
            COALESCE(uu.name, '') || ' ' ||
            COALESCE(uu.email, '')
          ) END) AS search_text
        FROM pdf_records p
        LEFT JOIN users uc ON uc.id = p.created_by_id
        LEFT JOIN users uu ON uu.id = p.updated_by_id
        WHERE p.deleted_at IS NULL
          AND ($1::boolean OR p.organization_id IS NOT DISTINCT FROM $2::uuid)
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
          extraction_method,
          manual_renewal_source,
          search_text,
          (CASE
            WHEN policy_haystack ~ '\\m(motor|vehicle|private\\s+car|two\\s+wheeler|commercial\\s+vehicle|goods\\s+carrying|auto\\s+secure|registration|chassis|engine)\\M'
              OR policy_haystack ~ '\\m[a-z]{2}[-\\s]?\\d{1,2}[-\\s]?[a-z]{1,3}[-\\s]?\\d{4}\\M' THEN 'Motor Policy'
            WHEN policy_haystack ~ '\\m(warehouse|mpwlc|godown|warehousing)\\M' THEN 'Warehouse Policy'
            WHEN policy_haystack ~ '\\m(health|mediclaim|medical|family\\s+floater|critical\\s+illness|hospital|personal\\s+accident|pa policy)\\M' THEN 'Health Policy'
            WHEN policy_haystack ~ '\\m(life|term\\s+life|endowment|ulip|whole\\s+life|annuity|pension)\\M' THEN 'Life Policy'
            WHEN policy_haystack ~ '\\m(travel|journey|overseas|student\\s+travel)\\M' THEN 'Travel Policy'
            WHEN policy_haystack ~ '\\m(marine|transit|cargo|inland\\s+transit)\\M' THEN 'Marine Policy'
            WHEN policy_haystack ~ '\\m(commercial|business|shop|office|sme|package|fire|sfsp|standard\\s+fire|msme\\s+suraksha|burglary|wc|workman|liability|cgl|ear|erection|griha)\\M' THEN 'Commercial Policy'
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
          ($4 = 'register' AND (extraction_method = 'renewal_excel_import' OR manual_renewal_source = true))
          OR ($4 != 'register' AND (
            (expiry_date IS NOT NULL AND (expiry_date - $3::date) >= -30 AND (expiry_date - $3::date) <= 30)
            OR (is_active_policy = true AND expiry_date IS NOT NULL AND (expiry_date - $3::date) < -30 AND LOWER(renewal_status) IN ('follow-up', 'follow_up', 'interested', 'quote sent', 'quote_sent', 'negotiation', 'pending approval', 'pending_approval'))
            OR ($4 IN ('renewed', 'lost', 'not_interested', 'wrong_number', 'renewed_elsewhere') AND renewal_status IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE'))
            OR (expiry_state IN ('missing', 'invalid'))
          ))
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
                  AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
              )
            ))
            OR ($4 = 'priority_high' AND LOWER(priority) IN ('high', 'urgent'))
            OR ($4 = 'priority_medium' AND LOWER(priority) IN ('medium', 'normal'))
            OR ($4 = 'priority_low' AND LOWER(priority) = 'low')
            OR ($4 = 'register' AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE'))
            OR ($4 = 'all' AND is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND (expiry_date - $3::date) >= -30 AND (expiry_date - $3::date) <= 30)
          )
          -- Company Filter
          AND (
            $6 = ''
            OR EXISTS (
              SELECT 1
              FROM unnest(string_to_array($6, '|||')) AS filter_company(value)
              WHERE LOWER(TRIM(company)) LIKE '%' || LOWER(TRIM(filter_company.value)) || '%'
                OR LOWER(TRIM(selected_company)) LIKE '%' || LOWER(TRIM(filter_company.value)) || '%'
            )
          )
          -- Policy Type Filter
          AND (
            $7 = 'All' 
            OR (LOWER($7) IN ('other', 'non-motor', 'nonmotor') AND policy_family NOT IN ('Motor Policy', 'Warehouse Policy'))
            OR (LOWER($7) IN ('warehouse', 'fire') AND policy_family = 'Warehouse Policy')
            OR (LOWER($7) = 'motor' AND policy_family = 'Motor Policy')
            OR LOWER(policy_type) = LOWER($7) 
            OR LOWER(selected_policy_type) = LOWER($7)
            OR LOWER(policy_family) = LOWER($7)
            OR LOWER(policy_family) = LOWER($7 || ' Policy')
          )
          -- Renewal Month Filter (expiry month, across all years)
          AND (
            $11::integer = 0
            OR EXTRACT(MONTH FROM expiry_date)::integer = $11::integer
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
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND (expiry_date - $3::date) BETWEEN -30 AND 30 THEN 1 END)::integer AS pending,
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
                AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
            )
          ) THEN id
        END)::integer AS today_work
      FROM active_policies
      WHERE
        (
          $6 = ''
          OR EXISTS (
            SELECT 1
            FROM unnest(string_to_array($6, '|||')) AS filter_company(value)
            WHERE LOWER(TRIM(company)) LIKE '%' || LOWER(TRIM(filter_company.value)) || '%'
              OR LOWER(TRIM(selected_company)) LIKE '%' || LOWER(TRIM(filter_company.value)) || '%'
          )
        )
        AND (
          $7 = 'All'
          OR (LOWER($7) IN ('other', 'non-motor', 'nonmotor') AND policy_family NOT IN ('Motor Policy', 'Warehouse Policy'))
          OR (LOWER($7) IN ('warehouse', 'fire') AND policy_family = 'Warehouse Policy')
          OR (LOWER($7) = 'motor' AND policy_family = 'Motor Policy')
          OR LOWER(policy_type) = LOWER($7)
          OR LOWER(selected_policy_type) = LOWER($7)
          OR LOWER(policy_family) = LOWER($7)
          OR LOWER(policy_family) = LOWER($7 || ' Policy')
        )
        AND (
          $11::integer = 0
          OR EXTRACT(MONTH FROM expiry_date)::integer = $11::integer
        )
        AND (
          $8 = ''
          OR search_text LIKE $9
        )
    `;
    const categoryQuery = `
      ${baseCTE}
      SELECT
        COUNT(*)::integer AS all_count,
        COUNT(*) FILTER (WHERE policy_family = 'Motor Policy')::integer AS motor_count,
        COUNT(*) FILTER (WHERE policy_family = 'Warehouse Policy')::integer AS warehouse_count,
        COUNT(*) FILTER (WHERE policy_family NOT IN ('Motor Policy', 'Warehouse Policy'))::integer AS other_count
      FROM active_policies
      WHERE
        (
          $6 = ''
          OR EXISTS (
            SELECT 1
            FROM unnest(string_to_array($6, '|||')) AS filter_company(value)
            WHERE LOWER(TRIM(company)) LIKE '%' || LOWER(TRIM(filter_company.value)) || '%'
              OR LOWER(TRIM(selected_company)) LIKE '%' || LOWER(TRIM(filter_company.value)) || '%'
          )
        )
        AND (
          $11::integer = 0
          OR EXTRACT(MONTH FROM expiry_date)::integer = $11::integer
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
      LIMIT $12::integer OFFSET $13::integer
    `;

    if (summaryOnly) {
      const summaryResult = await prisma.$queryRawUnsafe(summaryQuery, ...queryParams);
      return Response.json({
        summaryCounts: normalizeSummaryCounts(summaryResult[0] || {}),
      });
    }

    const isRegisterTab = tab === "register";
    const runCountQuery = !isRegisterTab || q.trim() !== "";

    const [countResult, dataResult, summaryResult, categoryResult] = await Promise.all([
      runCountQuery ? prisma.$queryRawUnsafe(countQuery, ...queryParams) : Promise.resolve([{ count: 0 }]),
      prisma.$queryRawUnsafe(dataQuery, ...queryParams, limit, offset),
      isRegisterTab ? Promise.resolve([{}]) : prisma.$queryRawUnsafe(summaryQuery, ...queryParams),
      prisma.$queryRawUnsafe(categoryQuery, ...queryParams),
    ]);

    let totalCount = countResult[0]?.count || 0;
    if (!runCountQuery && categoryResult[0]) {
      const cat = categoryResult[0];
      if (policyType === "All") totalCount = cat.all_count || 0;
      else if (policyType.toLowerCase() === "motor") totalCount = cat.motor_count || 0;
      else if (policyType.toLowerCase() === "warehouse" || policyType.toLowerCase() === "fire") totalCount = cat.warehouse_count || 0;
      else totalCount = cat.other_count || 0;
    }
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
          extractionMethod: true,
          customerPortfolioId: true,
          contactPersonName: true,
          contactPersonMobile: true,
          contactPersonEmail: true,
          renewalRecipientName: true,
          renewalRecipientMobile: true,
          renewalRecipientEmail: true,
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } },
        },
      });

      const recordMap = {};
      rawRecords.forEach((record) => {
        recordMap[record.id] = record;
      });

      // Look up new policy numbers for renewed entries
      const renewedPolicyIds = rawRecords.map((r) => r.renewedPolicyId).filter(Boolean);
      const renewedPolicyMap = {};
      if (renewedPolicyIds.length > 0) {
        const renewedPolicies = await prisma.policyRecord.findMany({
          where: { id: { in: renewedPolicyIds } },
          select: { id: true, data: true, reviewedData: true, selectedCompany: true, savedAt: true, createdAt: true },
        });
        renewedPolicies.forEach((p) => {
          const payload = p.reviewedData || p.data || {};
          const ic = payload.insuranceCompany || payload.insurerName || p.selectedCompany || "";
          const tp = payload.totalPremium || payload.premium || "";
          renewedPolicyMap[p.id] = {
            policyNumber: payload.policyNumber || "",
            insuranceCompany: normalizeRenewalInsuranceCompany(ic),
            totalPremium: tp,
            savedAt: p.savedAt || p.createdAt || null,
          };
        });
      }

      const orderedRecords = ids.map((id) => recordMap[id]).filter(Boolean);
      policies = orderedRecords.map((record) => {
        const normalized = withRenewalCompanyDisplay(withRenewalPolicyDisplay(normalizeRecord(record)));
        normalized.daysRemaining = calculateDaysLeft(normalized.expiryDate);
        normalized.renewalStatus = calculateRenewalStatus(normalized.expiryDate, record.renewalStatus);
        normalized.expiryState = getExpiryState(normalized.expiryDate);
        normalized.daysStatus = getDaysStatus(normalized.expiryDate);
        const renewedInfo = renewedPolicyMap[record.renewedPolicyId];
        normalized.renewalDate = record.renewalDate || (renewedInfo ? renewedInfo.savedAt : null) || null;
        if (renewedInfo) {
          normalized.newPolicyNumber = renewedInfo.policyNumber;
          normalized.renewedInsuranceCompany = renewedInfo.insuranceCompany;
          normalized.newPremium = renewedInfo.totalPremium;
        }
        const payload = record.reviewedData || record.data || {};
        normalized.quote = payload.quote || "";
        normalized.message = payload.msg || payload.message || "";
        normalized.paymentLink = payload.paymentLink || "";
        normalized.callStatus = payload.call || payload.callStatus || "";
        return normalized;
      });

      const whatsappLogs = await prisma.auditLog.findMany({
        where: {
          action: "WHATSAPP_REMINDER_SENT",
          entityType: "PolicyRecord",
          entityId: { in: ids },
          ...(isSuperAdmin ? {} : { organizationId: orgId }),
        },
        select: { entityId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      const whatsappSentAtByPolicy = new Map();
      whatsappLogs.forEach((log) => {
        if (log.entityId && !whatsappSentAtByPolicy.has(log.entityId)) {
          whatsappSentAtByPolicy.set(log.entityId, log.createdAt);
        }
      });
      policies = policies.map((policy) => ({
        ...policy,
        whatsappMessageSentAt: whatsappSentAtByPolicy.get(policy.id) || null,
      }));
    }

    return Response.json({
      policies,
      totalCount,
      pages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      summaryCounts: normalizeSummaryCounts(summaryResult[0] || {}),
      categoryCounts: normalizeCategoryCounts(categoryResult[0] || {}),
    });
  } catch (error) {
    console.error("Renewals policies fetch failed:", error);
    return Response.json({ error: "Failed to load renewal policies." }, { status: 500 });
  }
}

function normalizeCategoryCounts(row = {}) {
  return {
    all: Number(row.all_count) || 0,
    motor: Number(row.motor_count) || 0,
    warehouse: Number(row.warehouse_count) || 0,
    other: Number(row.other_count) || 0,
  };
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
    pending: Number(row.pending) || 0,
    missingExpiry: Number(row.missing_expiry) || 0,
    invalidExpiry: Number(row.invalid_expiry) || 0,
    todayWork: Number(row.today_work) || 0,
  };
}
