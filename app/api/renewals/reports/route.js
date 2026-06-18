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

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    const today = startOfDay(new Date());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Base query inputs
    const queryParams = [
      isSuperAdmin,
      orgId,
      todayStr
    ];

    // CTE to extract and normalize all policy records for analytics
    const baseCTE = `
      WITH normalized_policies AS (
        SELECT 
          id,
          saved_at,
          is_active_policy,
          COALESCE(renewal_status, 'ACTIVE') AS renewal_status,
          created_by_id,
          lost_reason,
          COALESCE(reviewed_data->>'assignedTo', data->>'assignedTo', '') AS assigned_to,
          COALESCE(reviewed_data->>'insuredName', data->>'insuredName', reviewed_data->>'customerName', data->>'customerName', '') AS insured_name,
          COALESCE(reviewed_data->>'contactNumber', data->>'contactNumber', reviewed_data->>'customerMobile', data->>'customerMobile', '') AS contact_number,
          COALESCE(reviewed_data->>'insuranceCompany', reviewed_data->>'Insurance Company', data->>'insuranceCompany', data->>'Insurance Company', 'Other') AS company,
          COALESCE(reviewed_data->>'policyType', reviewed_data->>'Policy Type', data->>'policyType', data->>'Policy Type', 'Other') AS policy_type,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry,
          COALESCE(reviewed_data->>'premium', reviewed_data->>'totalPremium', data->>'premium', data->>'totalPremium', '0') AS raw_premium,
          COALESCE(reviewed_data->'renewalFollowUp'->>'nextFollowUpDate', data->'renewalFollowUp'->>'nextFollowUpDate', '') AS raw_follow_up
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
          lost_reason,
          company,
          policy_type,
          raw_follow_up,
          -- Clean numeric values
          CAST(COALESCE(NULLIF(regexp_replace(raw_premium, '[^0-9.]', '', 'g'), ''), '0') AS DECIMAL) as premium,
          (CASE
            WHEN COALESCE(TRIM(raw_expiry), '') = '' THEN NULL
            WHEN raw_expiry ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
            ELSE NULL
           END) AS expiry_date
        FROM normalized_policies
      )
    `;

    // 1. Agent Performance
    const agentQuery = `
      ${baseCTE}
      SELECT 
        COALESCE(NULLIF(TRIM(assigned_to), ''), 'Unassigned') AS agent_name,
        COUNT(*)::integer AS total_assigned,
        COUNT(CASE WHEN renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS due_count,
        COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END)::integer AS renewed_count,
        COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS lost_count,
        SUM(CASE WHEN renewal_status = 'RENEWED' THEN premium ELSE 0 END)::double precision AS premium_renewed
      FROM parsed_policies
      WHERE expiry_date IS NOT NULL
      GROUP BY COALESCE(NULLIF(TRIM(assigned_to), ''), 'Unassigned')
      ORDER BY premium_renewed DESC
    `;

    // 2. Company Performance
    const companyQuery = `
      ${baseCTE}
      SELECT 
        COALESCE(NULLIF(TRIM(company), ''), 'Other') AS company_name,
        COUNT(*)::integer AS total_policies,
        COUNT(CASE WHEN renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS due_count,
        COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END)::integer AS renewed_count,
        COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS lost_count,
        SUM(CASE WHEN renewal_status = 'RENEWED' THEN premium ELSE 0 END)::double precision AS premium_renewed
      FROM parsed_policies
      WHERE expiry_date IS NOT NULL
      GROUP BY COALESCE(NULLIF(TRIM(company), ''), 'Other')
      ORDER BY total_policies DESC
      LIMIT 15
    `;

    // 3. Policy Type Performance
    const typeQuery = `
      ${baseCTE}
      SELECT 
        COALESCE(NULLIF(TRIM(policy_type), ''), 'Other') AS type_name,
        COUNT(*)::integer AS total_policies,
        COUNT(CASE WHEN renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS due_count,
        COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END)::integer AS renewed_count,
        COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS lost_count,
        SUM(CASE WHEN renewal_status = 'RENEWED' THEN premium ELSE 0 END)::double precision AS premium_renewed
      FROM parsed_policies
      WHERE expiry_date IS NOT NULL
      GROUP BY COALESCE(NULLIF(TRIM(policy_type), ''), 'Other')
      ORDER BY total_policies DESC
    `;

    // 4. Lost Analysis
    const lostQuery = `
      ${baseCTE}
      SELECT 
        COALESCE(NULLIF(TRIM(lost_reason), ''), 'Unspecified') AS reason,
        COUNT(*)::integer AS count
      FROM parsed_policies
      WHERE renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE')
      GROUP BY COALESCE(NULLIF(TRIM(lost_reason), ''), 'Unspecified')
      ORDER BY count DESC
    `;

    // 5. Monthly Trends
    const trendQuery = `
      ${baseCTE}
      SELECT 
        TO_CHAR(expiry_date, 'YYYY-MM') AS month_key,
        COUNT(*)::integer AS expired_count,
        COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END)::integer AS renewed_count,
        SUM(premium)::double precision AS total_premium,
        SUM(CASE WHEN renewal_status = 'RENEWED' THEN premium ELSE 0 END)::double precision AS premium_renewed
      FROM parsed_policies
      WHERE expiry_date IS NOT NULL
        AND expiry_date >= $3::date - INTERVAL '6 months'
        AND expiry_date <= $3::date + INTERVAL '6 months'
      GROUP BY TO_CHAR(expiry_date, 'YYYY-MM')
      ORDER BY month_key ASC
    `;

    // 6. Follow-up Effectiveness
    const followUpQuery = `
      ${baseCTE}
      SELECT
        (CASE WHEN TRIM(raw_follow_up) != '' THEN 'With Follow-up' ELSE 'No Follow-up' END) AS has_followup,
        COUNT(*)::integer AS count,
        COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END)::integer AS renewed_count,
        COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS lost_count
      FROM parsed_policies
      WHERE expiry_date IS NOT NULL
      GROUP BY (CASE WHEN TRIM(raw_follow_up) != '' THEN 'With Follow-up' ELSE 'No Follow-up' END)
    `;

    const [agents, companies, types, lostReasons, monthlyTrends, followUps] = await Promise.all([
      prisma.$queryRawUnsafe(agentQuery, ...queryParams),
      prisma.$queryRawUnsafe(companyQuery, ...queryParams),
      prisma.$queryRawUnsafe(typeQuery, ...queryParams),
      prisma.$queryRawUnsafe(lostQuery, ...queryParams),
      prisma.$queryRawUnsafe(trendQuery, ...queryParams),
      prisma.$queryRawUnsafe(followUpQuery, ...queryParams)
    ]);

    return Response.json({
      success: true,
      agents,
      companies,
      types,
      lostReasons,
      monthlyTrends,
      followUps
    });
  } catch (error) {
    console.error("Reports API failed:", error);
    return Response.json({ error: "Failed to generate renewal reports statistics." }, { status: 500 });
  }
}
