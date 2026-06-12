import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";

export const POLICY_RECORD_SELECT = {
  id: true,
  createdAt: true,
  savedAt: true,
  sourceFile: true,
  data: true,
  reviewedData: true,
  extractedData: true,
  extractionMethod: true,
  extractionQuality: true,
  extractionLog: true,
  confidenceScore: true,
  pdfFileName: true,
  pdfMimeType: true,
  organizationId: true,
  createdById: true,
  renewalStatus: true,
  previousPolicyId: true,
  renewedPolicyId: true,
  renewalDate: true,
  lostReason: true,
  isActivePolicy: true,
  createdBy: {
    select: {
      name: true,
      email: true
    }
  },
  uploadedFile: {
    select: {
      createdAt: true,
      createdBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  }
};

export async function getCurrentSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyJWT(token);
}

export async function loadScopedPolicyRecords(options = {}) {
  try {
    return await loadScopedPolicyRecordsUnsafe(options);
  } catch (error) {
    console.error("Policy records server load failed:", getServerLoadErrorMessage(error));
    return options.page || options.limit
      ? { records: [], totalCount: 0, page: parseInt(options.page || "1", 10), limit: parseInt(options.limit || "20", 10), totalPages: 1, serverLoadError: true }
      : [];
  }
}

async function loadScopedPolicyRecordsUnsafe(options = {}) {
  const session = await getCurrentSessionFromCookies();
  if (!session) return options.page ? { records: [], totalCount: 0, page: 1, limit: 20, totalPages: 1 } : [];
  const tenantFilter = getTenantFilter(session, "read");

  const page = parseInt(options.page || "1", 10);
  const limit = parseInt(options.limit || "20", 10);
  const skip = (page - 1) * limit;

  const q = options.q || "";
  const filterField = options.filterField || "";
  const filterValue = options.filterValue || "";
  const pdfFilter = options.pdfFilter || "all";
  const viewCategory = options.viewCategory || "all";

  const where = {
    ...tenantFilter,
    deletedAt: null,
    ...(options.includeInactive ? {} : { isActivePolicy: true })
  };
  const andFilters = [];

  // 1. Search Query (q)
  if (q.trim()) {
    const searchTerms = q.trim().toLowerCase();
    const searchKeys = [
      'insuredName', 'policyNumber', 'contactNumber', 'contactPerson', 
      'whatsappGroupName', 'groupName', 'policyType', 'vehicleNumber', 
      'registrationNumber', 'engineNumber', 'chassisNumber', 'makeModel', 
      'rtoLocation', 'district', 'tehsil', 'insuranceCompany'
    ];
    const searchOrs = [];
    for (const key of searchKeys) {
      searchOrs.push({ reviewedData: { path: [key], string_contains: searchTerms, mode: 'insensitive' } });
      searchOrs.push({ data: { path: [key], string_contains: searchTerms, mode: 'insensitive' } });
    }
    andFilters.push({ OR: searchOrs });
  }

  // 2. Custom Field Filter
  if (filterField && filterValue.trim()) {
    const val = filterValue.trim().toLowerCase();
    andFilters.push({
      OR: [
        { reviewedData: { path: [filterField], string_contains: val, mode: 'insensitive' } },
        { data: { path: [filterField], string_contains: val, mode: 'insensitive' } }
      ]
    });
  }

  // 3. PDF Filter
  if (pdfFilter === "with") {
    andFilters.push({
      OR: [
        { pdfFileName: { not: null } },
        { pdfBytes: { not: null } }
      ]
    });
  } else if (pdfFilter === "missing") {
    andFilters.push({ pdfFileName: null, pdfBytes: null });
  }

  // 4. View Category (Schema Group or Duplicates)
  if (viewCategory !== "all" && viewCategory !== "duplicates") {
    const group = viewCategory.toLowerCase();
    const motorTerms = ['motor', 'vehicle', 'car', 'two wheeler', 'bike', 'scooter', 'commercial vehicle', 'taxi', 'cab', 'bus'];
    const healthTerms = ['health', 'mediclaim', 'hospital', 'family floater'];
    const fireTerms = ['fire', 'sfsp', 'burglary', 'msme', 'warehouse', 'stock', 'property'];
    const lifeTerms = ['life assured', 'life policy', 'term life', 'endowment'];
    const homeTerms = ['home building', 'home contents', 'home policy'];
    const cyberTerms = ['cyber', 'ransomware', 'data breach'];

    let terms = [];
    if (group === "motor") terms = motorTerms;
    else if (group === "health") terms = healthTerms;
    else if (group === "fire") terms = fireTerms;
    else if (group === "life") terms = lifeTerms;
    else if (group === "home") terms = homeTerms;
    else if (group === "cyber") terms = cyberTerms;

    if (terms.length > 0) {
      const ors = terms.map(term => ({
        OR: [
          { selectedPolicyType: { contains: term, mode: 'insensitive' } },
          { reviewedData: { path: ['policyType'], string_contains: term, mode: 'insensitive' } },
          { data: { path: ['policyType'], string_contains: term, mode: 'insensitive' } }
        ]
      }));
      andFilters.push({ OR: ors.flatMap(o => o.OR) });
    }
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  if (viewCategory === "duplicates") {
    if (!options.page && !options.limit) {
      const dupQuery = `
        SELECT id FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id = $2::uuid)
          AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') IN (
            SELECT COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
            FROM pdf_records
            WHERE deleted_at IS NULL
              AND ($1::boolean OR organization_id = $2::uuid)
              AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') != ''
            GROUP BY COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
            HAVING COUNT(*) > 1
          )
      `;
      const isSuperAdmin = session.role === "SUPER_ADMIN";
      const orgId = session.organizationId || null;
      const dupIdsResult = await prisma.$queryRawUnsafe(dupQuery, isSuperAdmin, orgId);
      where.id = { in: dupIdsResult.map((r) => r.id) };
    } else {
      return loadDuplicatePolicyRecords({
        session,
        q,
        pdfFilter,
        page,
        limit,
        skip,
        select: options.select || POLICY_RECORD_SELECT
      });
    }
  }

  if (options.page || options.limit) {
    const [records, totalCount] = await Promise.all([
      prisma.policyRecord.findMany({
        where,
        orderBy: { savedAt: "desc" },
        select: options.select || POLICY_RECORD_SELECT,
        skip,
        take: limit
      }),
      prisma.policyRecord.count({ where })
    ]);

    return {
      records,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1
    };
  }

  return prisma.policyRecord.findMany({
    where,
    orderBy: { savedAt: "desc" },
    select: options.select || POLICY_RECORD_SELECT
  });
}

async function loadDuplicatePolicyRecords({ session, q, pdfFilter, page, limit, skip, select }) {
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  const orgId = session.organizationId || null;
  const queryParams = [isSuperAdmin, orgId];
  const filters = [];

  if (q.trim()) {
    const searchParam = `%${q.trim().toLowerCase()}%`;
    queryParams.push(searchParam);
    const placeholder = `$${queryParams.length}`;
    const searchKeys = [
      "insuredName",
      "policyNumber",
      "contactNumber",
      "contactPerson",
      "whatsappGroupName",
      "groupName",
      "policyType",
      "vehicleNumber",
      "registrationNumber",
      "engineNumber",
      "chassisNumber",
      "makeModel",
      "rtoLocation",
      "district",
      "tehsil",
      "insuranceCompany"
    ];
    const searchSql = searchKeys
      .map((key) => `LOWER(COALESCE(reviewed_data->>'${key}', data->>'${key}', '')) LIKE ${placeholder}`)
      .join(" OR ");
    filters.push(`(${searchSql})`);
  }

  if (pdfFilter === "with") {
    filters.push("(pdf_file_name IS NOT NULL OR pdf_bytes IS NOT NULL)");
  } else if (pdfFilter === "missing") {
    filters.push("(pdf_file_name IS NULL AND pdf_bytes IS NULL)");
  }

  const extraWhere = filters.length ? `AND ${filters.join(" AND ")}` : "";
  const duplicateBase = `
    WITH duplicate_keys AS (
        SELECT COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') AS policy_number
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id = $2::uuid)
        AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') != ''
      GROUP BY COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
      HAVING COUNT(*) > 1
    ),
    duplicate_records AS (
      SELECT id, saved_at
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id = $2::uuid)
        AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') IN (SELECT policy_number FROM duplicate_keys)
        ${extraWhere}
    )
  `;

  const [countResult, idResult] = await Promise.all([
    prisma.$queryRawUnsafe(`${duplicateBase} SELECT COUNT(*)::integer AS count FROM duplicate_records`, ...queryParams),
    prisma.$queryRawUnsafe(
      `${duplicateBase} SELECT id FROM duplicate_records ORDER BY saved_at DESC LIMIT $${queryParams.length + 1}::integer OFFSET $${queryParams.length + 2}::integer`,
      ...queryParams,
      limit,
      skip
    )
  ]);

  const ids = idResult.map((row) => row.id);
  if (!ids.length) {
    return {
      records: [],
      totalCount: countResult[0]?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.count || 0) / limit) || 1
    };
  }

  const records = await prisma.policyRecord.findMany({
    where: { id: { in: ids } },
    select
  });
  const recordMap = new Map(records.map((record) => [record.id, record]));
  const orderedRecords = ids.map((id) => recordMap.get(id)).filter(Boolean);
  const totalCount = countResult[0]?.count || 0;

  return {
    records: orderedRecords,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1
  };
}

export async function loadScopedUploads(options = {}) {
  try {
    return await loadScopedUploadsUnsafe(options);
  } catch (error) {
    console.error("Uploads server load failed:", getServerLoadErrorMessage(error));
    return options.page || options.limit
      ? { uploads: [], totalCount: 0, page: parseInt(options.page || "1", 10), limit: parseInt(options.limit || "20", 10), totalPages: 1, serverLoadError: true }
      : [];
  }
}

async function loadScopedUploadsUnsafe(options = {}) {
  const session = await getCurrentSessionFromCookies();
  if (!session) return options.page ? { uploads: [], totalCount: 0, page: 1, limit: 20, totalPages: 1 } : [];
  const where = getTenantFilter(session, "read");

  if (options.page || options.limit) {
    const page = parseInt(options.page || "1", 10);
    const limit = parseInt(options.limit || "20", 10);
    const skip = (page - 1) * limit;

    const [uploads, totalCount] = await Promise.all([
      prisma.uploadedFile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        ...(options.select ? { select: options.select } : {})
      }),
      prisma.uploadedFile.count({ where })
    ]);

    return {
      uploads,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1
    };
  }

  return prisma.uploadedFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...(options.take ? { take: options.take } : {}),
    ...(options.select ? { select: options.select } : {})
  });
}

function getServerLoadErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown server data load error");
}
