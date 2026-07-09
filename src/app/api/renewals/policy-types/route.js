import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { startOfDay } from "@/app/lib/reporting/filters";

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

    const today = startOfDay(new Date());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    const queryParams = [isSuperAdmin, orgId, todayStr];

    const sql = `
      WITH normalized_policies AS (
        SELECT 
          id,
          is_active_policy,
          COALESCE(renewal_status, 'ACTIVE') AS renewal_status,
          COALESCE(reviewed_data->>'policyType', reviewed_data->>'Policy Type', data->>'policyType', data->>'Policy Type', '') AS policy_type,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry,
          LOWER(
            COALESCE(selected_policy_type, '') || ' ' ||
            COALESCE(reviewed_data->>'policyType', reviewed_data->>'Policy Type', data->>'policyType', data->>'Policy Type', '') || ' ' ||
            COALESCE(reviewed_data->>'documentCategory', data->>'documentCategory', '') || ' ' ||
            COALESCE(reviewed_data->>'policyCoverType', data->>'policyCoverType', '') || ' ' ||
            COALESCE(reviewed_data->>'insuranceCompany', reviewed_data->>'Insurance Company', data->>'insuranceCompany', data->>'Insurance Company', '') || ' ' ||
            COALESCE(reviewed_data->>'sourceFile', data->>'sourceFile', '') || ' ' ||
            COALESCE(reviewed_data->>'description', data->>'description', '')
          ) AS policy_haystack
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
      ),
      parsed_policies AS (
        SELECT
          id,
          is_active_policy,
          renewal_status,
          (CASE
            WHEN policy_haystack ~ '\\m(motor|vehicle|private\\s+car|two\\s+wheeler|commercial\\s+vehicle|goods\\s+carrying|auto\\s+secure|registration|chassis|engine)\\M' THEN 'Motor'
            WHEN policy_haystack ~ '\\m(health|mediclaim|medical|family\\s+floater|critical\\s+illness|hospital|personal\\s+accident|pa policy)\\M' THEN 'Health'
            WHEN policy_haystack ~ '\\m(life|term\\s+life|endowment|ulip|whole\\s+life|annuity|pension)\\M' THEN 'Life'
            WHEN policy_haystack ~ '\\m(fire|sfsp|standard\\s+fire|msme\\s+suraksha|burglary|warehouse|stock|contents|property|industrial\\s+all\\s+risk)\\M' THEN 'Fire'
            WHEN policy_haystack ~ '\\m(marine|transit|cargo|inland\\s+transit)\\M' THEN 'Marine'
            WHEN policy_haystack ~ '\\m(shop|merchant|store|retail|shopkeeper)\\M' THEN 'Shop'
            WHEN policy_haystack ~ '\\m(office|workspace|workplace|business\\s+package)\\M' THEN 'Office'
            WHEN policy_haystack ~ '\\m(cyber|data\\s+breach|online\\s+secure|hack)\\M' THEN 'Cyber'
            WHEN policy_haystack ~ '\\m(liability|professional\\s+indemnity|wc|workmen|workman|employer\\s+liability)\\M' THEN 'Liability'
            WHEN policy_haystack ~ '\\m(engineering|contractor|plant|machinery|erection|car|ear)\\M' THEN 'Engineering'
            ELSE 'Others'
           END) AS policy_family,
          (CASE
            WHEN COALESCE(TRIM(raw_expiry), '') = '' THEN NULL
            WHEN raw_expiry ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
            ELSE NULL
           END) AS expiry_date
        FROM normalized_policies
      )
      SELECT 
        policy_family,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND (
          ((expiry_date - $3::date) >= -30 AND (expiry_date - $3::date) <= 30)
          OR (
            (expiry_date - $3::date) < -30
            AND LOWER(renewal_status) IN ('follow-up', 'follow_up', 'interested', 'quote sent', 'quote_sent', 'negotiation', 'pending approval', 'pending_approval')
          )
        ) THEN 1 END)::integer AS due,
        COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END)::integer AS renewed,
        COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS lost
      FROM parsed_policies
      GROUP BY policy_family
    `;

    const result = await prisma.$queryRawUnsafe(sql, ...queryParams);
    return Response.json({ typeStats: result });
  } catch (error) {
    console.error("Renewals policy-types fetch failed:", error);
    return Response.json({ error: "Failed to load policy types." }, { status: 500 });
  }
}
