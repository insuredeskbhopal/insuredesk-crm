import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { startOfDay } from "@/app/lib/reporting/filters";
import { normalizeRecord } from "@/lib/records";
import { calculateRenewalStatus, calculateDaysLeft } from "@/lib/renewals/dates";

export const dynamic = "force-dynamic";

function cleanMobile(value = "") {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function isUsefulContactName(contactName = "", companyName = "") {
  const contact = String(contactName || "")
    .replace(/\s+/g, " ")
    .trim();
  const companyText = String(companyName || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!contact) return false;
  const normalizedContact = contact.toLowerCase();
  const companyNames = companyText
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  if (companyNames.includes(normalizedContact)) return false;
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
    const companyFilter = searchParams.get("company") || "All";
    const policyTypeFilter = searchParams.get("policyType") || "All";
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
      assignedTo,
      companyFilter,
      policyTypeFilter,
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
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry,
          COALESCE(reviewed_data->>'insuranceCompany', reviewed_data->>'Insurance Company', data->>'insuranceCompany', data->>'Insurance Company', '') AS raw_company,
          COALESCE(reviewed_data->>'policyType', reviewed_data->>'Policy Type', data->>'policyType', data->>'Policy Type', '') AS raw_policy_type,
          COALESCE(selected_company, '') AS selected_company,
          COALESCE(selected_policy_type, '') AS selected_policy_type,
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
          raw_company,
          raw_policy_type,
          selected_company,
          selected_policy_type,
          (CASE
            WHEN policy_haystack ~ '\\m(motor|vehicle|private\\s+car|two\\s+wheeler|commercial\\s+vehicle|goods\\s+carrying|auto\\s+secure|registration|chassis|engine)\\M'
              OR policy_haystack ~ '\\m[a-z]{2}[-\\s]?\\d{1,2}[-\\s]?[a-z]{1,3}[-\\s]?\\d{4}\\M' THEN 'Motor'
            WHEN policy_haystack ~ '\\m(fire|sfsp|standard\\s+fire|msme\\s+suraksha|burglary|warehouse|stock|contents|property|industrial\\s+all\\s+risk)\\M' THEN 'Fire'
            WHEN policy_haystack ~ '\\m(health|mediclaim|medical|family\\s+floater|critical\\s+illness|hospital|personal\\s+accident|pa policy)\\M' THEN 'Health'
            WHEN policy_haystack ~ '\\m(life|term\\s+life|endowment|ulip|whole\\s+life|annuity|pension)\\M' THEN 'Life'
            WHEN policy_haystack ~ '\\m(travel|journey|overseas|student\\s+travel)\\M' THEN 'Travel'
            WHEN policy_haystack ~ '\\m(marine|transit|cargo|inland\\s+transit)\\M' THEN 'Marine'
            WHEN policy_haystack ~ '\\m(commercial|business|shop|office|sme|package)\\M' THEN 'Commercial'
            ELSE 'Other'
           END) AS policy_family,
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
          -- Company Filter
          AND (
            $8 = 'All'
            OR LOWER(raw_company) LIKE LOWER('%' || $8 || '%')
            OR LOWER(selected_company) LIKE LOWER('%' || $8 || '%')
          )
          -- Policy Type Filter
          AND (
            $9 = 'All'
            OR LOWER(policy_family) = LOWER($9)
            OR LOWER(raw_policy_type) LIKE LOWER('%' || $9 || '%')
            OR LOWER(selected_policy_type) LIKE LOWER('%' || $9 || '%')
            OR ($9 = 'Commercial' AND LOWER(raw_policy_type) IN ('shop', 'office', 'commercial'))
            OR ($9 = 'Shop' AND (LOWER(raw_policy_type) LIKE '%shop%' OR LOWER(policy_family) = 'commercial'))
            OR ($9 = 'Office' AND (LOWER(raw_policy_type) LIKE '%office%' OR LOWER(policy_family) = 'commercial'))
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
            WHEN COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND days_left BETWEEN -30 AND 30 THEN 1 END) > 0 THEN
              -- There are due policies
              CASE 
                WHEN MIN(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND days_left BETWEEN -30 AND 30 THEN days_left END) < 0 THEN 'expired'
                ELSE 'expiry_soon'
              END
            ELSE
              -- No due policies in window
              CASE
                WHEN COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END) > 0 THEN 'renewed'
                WHEN COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END) > 0 THEN 'lost'
                ELSE 'active'
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
          (
            ($4 = 'All' AND customer_status IN ('expiry_soon', 'expired'))
            OR ($4 = 'Due Soon' AND customer_status = 'expiry_soon')
            OR ($4 = 'Expired' AND customer_status = 'expired')
            OR ($4 = 'Renewed' AND customer_status = 'renewed')
            OR ($4 = 'Lost' AND customer_status = 'lost')
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
        CASE 
          WHEN customer_status = 'expiry_soon' THEN 0
          WHEN customer_status = 'expired' THEN 1
          WHEN customer_status = 'renewed' THEN 2
          WHEN customer_status = 'lost' THEN 3
          ELSE 4
        END ASC,
        CASE 
          WHEN customer_status = 'expiry_soon' THEN nearest_days_left 
        END ASC,
        CASE 
          WHEN customer_status = 'expired' THEN nearest_days_left 
        END DESC,
        nearest_expiry ASC NULLS LAST,
        contact_person_name ASC
      LIMIT $10::integer OFFSET $11::integer
    `;

    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...queryParams),
      prisma.$queryRawUnsafe(dataQuery, ...queryParams, limit, offset),
    ]);

    const totalCount = countResult[0]?.count || 0;
    const pageMobiles = dataResult
      .map((row) => String(row.mobile || ""))
      .filter((mobile) => mobile && !mobile.startsWith("NO-MOBILE-"));
    const rawPagePolicies = pageMobiles.length
      ? await prisma.policyRecord.findMany({
          where: {
            deletedAt: null,
            ...(isSuperAdmin ? {} : { organizationId: orgId }),
            OR: pageMobiles.flatMap((mobile) => [
              { reviewedData: { path: ["contactNumber"], string_contains: mobile } },
              { reviewedData: { path: ["customerMobile"], string_contains: mobile } },
              { data: { path: ["contactNumber"], string_contains: mobile } },
              { data: { path: ["customerMobile"], string_contains: mobile } },
            ]),
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
            updatedAt: true,
          },
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
        : isUsefulContactName(policyContact, row.company_names)
          ? policyContact
          : isUsefulContactName(row.contact_person, row.company_names)
          ? row.contact_person
          : "";

      const nearestDaysLeft = calculateDaysLeft(row.nearest_expiry);
      const computedStatus = calculateRenewalStatus(row.nearest_expiry, row.customer_status);

      return {
        ...row,
        nearest_days_left: nearestDaysLeft,
        customer_status: computedStatus,
        contact_person_name: resolvedContact || "",
        contact_person: resolvedContact || row.contact_person || "",
      };
    });

    return Response.json({
      customers: enrichedCustomers,
      totalCount,
      pages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    });
  } catch (error) {
    console.error("Customers list fetch failed:", error);
    return Response.json({ error: "Failed to load customer renewals." }, { status: 500 });
  }
}
