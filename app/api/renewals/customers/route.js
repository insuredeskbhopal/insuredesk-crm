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

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "All"; // Active, Partially Renewed, Fully Renewed, Lost, All
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
          COALESCE(reviewed_data->>'contactNumber', data->>'contactNumber', reviewed_data->>'customerMobile', data->>'customerMobile', '') AS contact_number,
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
          COALESCE(NULLIF(regexp_replace(contact_number, '[^0-9]', '', 'g'), ''), 'NO-MOBILE-' || id) AS contact_number,
          (CASE
            WHEN COALESCE(TRIM(raw_expiry), '') = '' THEN NULL
            WHEN raw_expiry ~ '^\\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[0-1])' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_expiry ~ '^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
            ELSE NULL
           END) AS expiry_date
        FROM normalized_policies
      ),
      active_renewals AS (
        SELECT 
          *
        FROM parsed_policies
        WHERE 
          -- Standard Expiry window: -30 days to +30 days
          (expiry_date IS NOT NULL AND (expiry_date - $3::date) >= -30 AND (expiry_date - $3::date) <= 30)
          -- Exception list: Keep visible if status is Follow-up, Interested, Quote Sent, Negotiation, Pending Approval
          OR (is_active_policy = true AND LOWER(renewal_status) IN ('follow-up', 'follow_up', 'interested', 'quote sent', 'quote_sent', 'negotiation', 'pending approval', 'pending_approval'))
          -- Also include recently renewed/lost policies for correct group aggregation
          OR (renewal_status IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE'))
      ),
      customer_groups AS (
        SELECT 
          contact_number AS mobile,
          MAX(insured_name) AS customer_name,
          COUNT(*)::integer AS total_policies,
          COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer AS policies_due,
          MIN(expiry_date) AS nearest_expiry,
          MAX(assigned_to) AS assigned_user,
          -- Customer status aggregation
          (CASE
            WHEN COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END) = COUNT(*) THEN 'Fully Renewed'
            WHEN COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END) = COUNT(*) THEN 'Lost'
            WHEN COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END) > 0 THEN 'Partially Renewed'
            ELSE 'Active'
           END) AS customer_status
        FROM active_renewals
        GROUP BY contact_number
      ),
      filtered_groups AS (
        SELECT *
        FROM customer_groups
        WHERE
          -- Status Filter
          ($4 = 'All' OR LOWER(customer_status) = LOWER($4))
          -- Text Search
          AND (
            $5 = '' 
            OR LOWER(customer_name) LIKE $6 
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
        nearest_expiry ASC,
        customer_name ASC
      LIMIT $8::integer OFFSET $9::integer
    `;

    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...queryParams),
      prisma.$queryRawUnsafe(dataQuery, ...queryParams, limit, offset)
    ]);

    const totalCount = countResult[0]?.count || 0;

    return Response.json({
      customers: dataResult,
      totalCount,
      pages: Math.ceil(totalCount / limit) || 1,
      currentPage: page
    });
  } catch (error) {
    console.error("Customers list fetch failed:", error);
    return Response.json({ error: "Failed to load customer renewals." }, { status: 500 });
  }
}
