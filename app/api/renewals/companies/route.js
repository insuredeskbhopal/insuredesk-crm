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

    const queryParams = [
      isSuperAdmin,
      orgId,
      todayStr
    ];

    const sql = `
      WITH normalized_policies AS (
        SELECT 
          id,
          is_active_policy,
          COALESCE(renewal_status, 'ACTIVE') AS renewal_status,
          COALESCE(reviewed_data->>'insuranceCompany', reviewed_data->>'Insurance Company', data->>'insuranceCompany', data->>'Insurance Company', '') AS company,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id = $2::uuid)
      ),
      parsed_policies AS (
        SELECT
          id,
          is_active_policy,
          renewal_status,
          company,
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
        company,
        COUNT(*)::integer AS total,
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
      GROUP BY company
    `;

    const result = await prisma.$queryRawUnsafe(sql, ...queryParams);
    return Response.json({ companyStats: result });
  } catch (error) {
    console.error("Renewals companies fetch failed:", error);
    return Response.json({ error: "Failed to load companies." }, { status: 500 });
  }
}
