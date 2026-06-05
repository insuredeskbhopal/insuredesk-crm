import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policies/type-display";
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
    const company = searchParams.get("company") || "All";
    const policyType = searchParams.get("policyType") || "All";
    const tab = searchParams.get("tab") || "upcoming";
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;
    const daysParam = searchParams.get("days");

    const requestedMaxDays = daysParam ? parseInt(daysParam, 10) : 29;
    const maxDays = Math.min(Number.isFinite(requestedMaxDays) ? requestedMaxDays : 29, 29);

    const today = startOfDay(new Date());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    const queryParams = [
      isSuperAdmin,
      orgId,
      todayStr,
      tab,
      maxDays,
      company,
      policyType,
      q.trim(),
      `%${q.trim().toLowerCase()}%`
    ];

    const baseCTE = `
      WITH normalized_policies AS (
        SELECT 
          id,
          saved_at,
          is_active_policy,
          renewal_status,
          selected_company,
          selected_policy_type,
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
            COALESCE(selected_company, '') || ' ' ||
            COALESCE(selected_policy_type, '')
          ) AS search_text
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
            WHEN raw_expiry ~ '^\\d{4}-\\d{2}-\\d{2}' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
            WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
            ELSE NULL
           END) AS expiry_date
        FROM normalized_policies
      ),
      filtered_policies AS (
        SELECT 
          id,
          saved_at,
          expiry_date,
          (expiry_date - $3::date) AS days_remaining
        FROM parsed_policies
        WHERE 
          -- Tab Filter
          (
            ($4 = 'upcoming' AND is_active_policy = true AND renewal_status = 'ACTIVE' AND expiry_date IS NOT NULL AND (expiry_date - $3::date) >= 0 AND (expiry_date - $3::date) < 30 AND (expiry_date - $3::date) <= $5::integer)
            OR ($4 = 'expired' AND is_active_policy = true AND renewal_status = 'ACTIVE' AND expiry_date IS NOT NULL AND (expiry_date - $3::date) < 0)
            OR ($4 = 'renewed' AND renewal_status = 'RENEWED')
            OR ($4 = 'lost' AND renewal_status = 'LOST')
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
    const dataQuery = `
      ${baseCTE} 
      SELECT id, days_remaining FROM filtered_policies
      ORDER BY 
        CASE WHEN $4 = 'upcoming' THEN days_remaining END ASC,
        CASE WHEN $4 = 'expired' THEN days_remaining END DESC,
        CASE WHEN $4 NOT IN ('upcoming', 'expired') THEN saved_at END DESC,
        saved_at DESC
      LIMIT $10::integer OFFSET $11::integer
    `;

    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...queryParams),
      prisma.$queryRawUnsafe(dataQuery, ...queryParams, limit, offset)
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
          pdfFileName: true
        }
      });

      const recordMap = {};
      rawRecords.forEach((record) => {
        recordMap[record.id] = record;
      });

      const orderedRecords = ids.map((id) => recordMap[id]).filter(Boolean);
      policies = orderedRecords.map((record) => {
        const normalized = withRenewalPolicyDisplay(normalizeRecord(record));
        normalized.daysRemaining = daysRemainingMap[record.id];
        return normalized;
      });
    }

    return Response.json({
      policies,
      totalCount,
      pages: Math.ceil(totalCount / limit) || 1,
      currentPage: page
    });
  } catch (error) {
    console.error("Renewals policies fetch failed:", error);
    return Response.json({ error: "Failed to load renewal policies." }, { status: 500 });
  }
}
