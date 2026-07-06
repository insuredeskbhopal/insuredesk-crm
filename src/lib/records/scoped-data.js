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
      email: true,
    },
  },
  uploadedFile: {
    select: {
      createdAt: true,
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
};

export async function getCurrentSessionFromCookies() {
  const { cookies } = await import("next/headers");
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
      ? {
          records: [],
          totalCount: 0,
          page: parseInt(options.page || "1", 10),
          limit: parseInt(options.limit || "20", 10),
          totalPages: 1,
          serverLoadError: true,
        }
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
    ...(options.includeInactive ? {} : { isActivePolicy: true }),
  };
  const andFilters = [];

  // 1. Search Query (q)
  if (q.trim()) {
    const searchTerms = q.trim().toLowerCase();
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
      "insuranceCompany",
    ];
    const searchOrs = [];
    for (const key of searchKeys) {
      searchOrs.push({ reviewedData: { path: [key], string_contains: searchTerms, mode: "insensitive" } });
      searchOrs.push({ data: { path: [key], string_contains: searchTerms, mode: "insensitive" } });
    }
    andFilters.push({ OR: searchOrs });
  }

  // 2. Custom Field Filter
  if (filterField && filterValue.trim()) {
    const val = filterValue.trim().toLowerCase();
    andFilters.push({
      OR: [
        { reviewedData: { path: [filterField], string_contains: val, mode: "insensitive" } },
        { data: { path: [filterField], string_contains: val, mode: "insensitive" } },
      ],
    });
  }

  // 3. PDF Filter
  if (pdfFilter === "with") {
    andFilters.push({
      OR: [{ pdfFileName: { not: null } }, { pdfBytes: { not: null } }],
    });
  } else if (pdfFilter === "missing") {
    andFilters.push({ pdfFileName: null, pdfBytes: null });
  }

  // 4. View Category (Schema Group or Duplicates)
  if (viewCategory !== "all" && viewCategory !== "duplicates") {
    const group = viewCategory.toLowerCase();
    const motorTerms = [
      "motor",
      "vehicle",
      "private car",
      "two wheeler",
      "bike",
      "scooter",
      "commercial vehicle",
      "taxi",
      "school bus",
      "goods carrying",
      "passenger carrying",
      "auto secure",
      "liability only",
      "comprehensive",
      "own damage"
    ];
    const healthTerms = ["health", "mediclaim", "hospital", "family floater"];
    const warehouseTerms = [
      "fire",
      "sfsp",
      "burglary",
      "msme",
      "warehouse",
      "stock",
      "property",
      "business guard",
      "laghu",
      "sookshma",
      "fidelity",
      "guarantee",
      "house breaking"
    ];

    if (group === "motor") {
      const ors = motorTerms.map((term) => ({
        OR: [
          { selectedPolicyType: { contains: term, mode: "insensitive" } },
          { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
          { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
        ],
      }));
      andFilters.push({ OR: ors.flatMap((o) => o.OR) });
    } else if (group === "health") {
      const ors = healthTerms.map((term) => ({
        OR: [
          { selectedPolicyType: { contains: term, mode: "insensitive" } },
          { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
          { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
        ],
      }));
      andFilters.push({ OR: ors.flatMap((o) => o.OR) });
    } else if (group === "warehouse" || group === "fire") {
      const ors = warehouseTerms.map((term) => ({
        OR: [
          { selectedPolicyType: { contains: term, mode: "insensitive" } },
          { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
          { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
        ],
      }));
      andFilters.push({ OR: ors.flatMap((o) => o.OR) });
    } else if (group === "other") {
      const excludeTerms = [...motorTerms, ...healthTerms, ...warehouseTerms];
      excludeTerms.forEach((term) => {
        andFilters.push({
          NOT: [
            { selectedPolicyType: { contains: term, mode: "insensitive" } },
            { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
            { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
          ],
        });
      });
    } else {
      andFilters.push({
        OR: [
          { selectedPolicyType: { equals: viewCategory, mode: "insensitive" } },
          { reviewedData: { path: ["policyType"], string_contains: viewCategory, mode: "insensitive" } },
          { data: { path: ["policyType"], string_contains: viewCategory, mode: "insensitive" } },
        ],
      });
    }
  }

  const savedAtFilter = getSavedAtDateFilter(options);
  if (savedAtFilter) {
    andFilters.push({ savedAt: savedAtFilter });
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
        savedAtFilter,
        page,
        limit,
        skip,
        select: options.select || POLICY_RECORD_SELECT,
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
        take: limit,
      }),
      prisma.policyRecord.count({ where }),
    ]);

    return {
      records,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  return prisma.policyRecord.findMany({
    where,
    orderBy: { savedAt: "desc" },
    select: options.select || POLICY_RECORD_SELECT,
  });
}

async function loadDuplicatePolicyRecords({ session, q, pdfFilter, savedAtFilter, page, limit, skip, select }) {
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
      "insuranceCompany",
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

  if (savedAtFilter?.gte) {
    queryParams.push(savedAtFilter.gte);
    filters.push(`saved_at >= $${queryParams.length}::timestamptz`);
  }
  if (savedAtFilter?.lte) {
    queryParams.push(savedAtFilter.lte);
    filters.push(`saved_at <= $${queryParams.length}::timestamptz`);
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
    prisma.$queryRawUnsafe(
      `${duplicateBase} SELECT COUNT(*)::integer AS count FROM duplicate_records`,
      ...queryParams,
    ),
    prisma.$queryRawUnsafe(
      `${duplicateBase} SELECT id FROM duplicate_records ORDER BY saved_at DESC LIMIT $${queryParams.length + 1}::integer OFFSET $${queryParams.length + 2}::integer`,
      ...queryParams,
      limit,
      skip,
    ),
  ]);

  const ids = idResult.map((row) => row.id);
  if (!ids.length) {
    return {
      records: [],
      totalCount: countResult[0]?.count || 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.count || 0) / limit) || 1,
    };
  }

  const records = await prisma.policyRecord.findMany({
    where: { id: { in: ids } },
    select,
  });
  const recordMap = new Map(records.map((record) => [record.id, record]));
  const orderedRecords = ids.map((id) => recordMap.get(id)).filter(Boolean);
  const totalCount = countResult[0]?.count || 0;

  return {
    records: orderedRecords,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
}

export async function loadScopedUploads(options = {}) {
  try {
    return await loadScopedUploadsUnsafe(options);
  } catch (error) {
    console.error("Uploads server load failed:", getServerLoadErrorMessage(error));
    return options.page || options.limit
      ? {
          uploads: [],
          totalCount: 0,
          page: parseInt(options.page || "1", 10),
          limit: parseInt(options.limit || "20", 10),
          totalPages: 1,
          serverLoadError: true,
        }
      : [];
  }
}

async function loadScopedUploadsUnsafe(options = {}) {
  const session = await getCurrentSessionFromCookies();
  if (!session) return options.page ? { uploads: [], totalCount: 0, page: 1, limit: 20, totalPages: 1 } : [];
  const where = getTenantFilter(session, "read");
  const q = String(options.q || "").trim();

  if (q) {
    where.OR = [
      { sourceFile: { contains: q, mode: "insensitive" } },
      { status: { contains: q, mode: "insensitive" } },
      { errorMessage: { contains: q, mode: "insensitive" } },
    ];
  }

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
        ...(options.select ? { select: options.select } : {}),
      }),
      prisma.uploadedFile.count({ where }),
    ]);

    return {
      uploads,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  return prisma.uploadedFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...(options.take ? { take: options.take } : {}),
    ...(options.select ? { select: options.select } : {}),
  });
}

function getServerLoadErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown server data load error");
}

export function getPresetDates(preset) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "yesterday":
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "last-3-days":
      start.setDate(now.getDate() - 2);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "this-week": {
      const day = now.getDay();
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "last-week": {
      const day = now.getDay();
      start.setDate(now.getDate() - day - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - day - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "this-month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "last-month":
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth());
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "last-3-months":
      start.setMonth(now.getMonth() - 3);
      start.setDate(now.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "last-6-months":
      start.setMonth(now.getMonth() - 6);
      start.setDate(now.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "this-year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case "last-year":
      start.setFullYear(now.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(now.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    default:
      return null;
  }
}

export function getSavedAtDateFilter(options = {}) {
  if (options.datePreset && options.datePreset !== "all" && options.datePreset !== "custom") {
    const range = getPresetDates(options.datePreset);
    return range ? { gte: range.start, lte: range.end } : null;
  }

  const filter = {};
  if (options.startDate) filter.gte = new Date(options.startDate + "T00:00:00.000Z");
  if (options.endDate) filter.lte = new Date(options.endDate + "T23:59:59.999Z");
  return Object.keys(filter).length ? filter : null;
}
