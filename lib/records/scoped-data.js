import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";

export const POLICY_RECORD_SELECT = {
  id: true,
  savedAt: true,
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
    const orgId = session.organizationId || "";
    const dupIdsResult = await prisma.$queryRawUnsafe(dupQuery, isSuperAdmin, orgId);
    const dupIds = dupIdsResult.map((r) => r.id);
    where.id = { in: dupIds };
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

export async function loadScopedUploads(options = {}) {
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
