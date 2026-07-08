export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords, getCurrentSessionFromCookies } from "@/lib/records/scoped-data";
import { getTenantFilter } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { MANUAL_RENEWAL_SQL_EXCLUSION, withoutManualRenewalSources } from "@/lib/records/manual-renewal-source";

// Simple in-memory cache for slow dashboard tab counts (30 seconds TTL)
const countsCache = new Map();

async function getCachedTabCounts({ key, fetcher }) {
  const now = Date.now();
  const cached = countsCache.get(key);
  if (cached && (now - cached.timestamp < 30000)) {
    return cached.data;
  }
  const data = await fetcher();
  countsCache.set(key, { data, timestamp: now });
  return data;
}

export default async function PolicyRecordsPage(props) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || "1", 10);
  const limit = parseInt(searchParams.limit || "20", 10);
  const q = searchParams.q || "";
  const filterField = searchParams.filterField || "";
  const filterValue = searchParams.filterValue || "";
  const pdfFilter = searchParams.pdfFilter || "all";
  const viewCategory = searchParams.viewCategory || "all";
  const startDate = searchParams.startDate || "";
  const endDate = searchParams.endDate || "";
  const datePreset = searchParams.datePreset || "all";

  const session = await getCurrentSessionFromCookies();
  const tenantFilter = session
    ? getTenantFilter(session, "read")
    : { id: "00000000-0000-0000-0000-000000000000" };
  const isSuperAdmin = session?.role === "SUPER_ADMIN";
  const orgId = session?.organizationId || null;
  const basePolicyWhere = {
    ...tenantFilter,
    deletedAt: null,
  };
  const policyRecordWhere = withoutManualRenewalSources(basePolicyWhere);
  const dataPayload = await loadScopedPolicyRecords({
    includeInactive: true,
    page,
    limit,
    q,
    filterField,
    filterValue,
    pdfFilter,
    viewCategory,
    startDate,
    endDate,
    datePreset,
  });

  const cacheKey = `${orgId || "global"}_${isSuperAdmin}`;
  const countsPayload = await getCachedTabCounts({
    key: cacheKey,
    fetcher: () => loadPolicyRecordTabCounts({
      basePolicyWhere: policyRecordWhere,
      isSuperAdmin,
      orgId,
      session,
    })
  });
  const {
    totalAll,
    totalDuplicates,
    categories,
    error: countsError,
  } = countsPayload;

  const { records, totalCount, totalPages } = dataPayload;

  const tabCounts = {
    all: totalAll,
    duplicates: totalDuplicates,
    categories,
  };

  return (
    <Dashboard
      initialRecords={records.map(normalizeRecord)}
      activePage="records"
      totalCount={totalCount}
      currentPage={page}
      limit={limit}
      totalPages={totalPages}
      initialQ={q}
      initialFilterField={filterField}
      initialFilterValue={filterValue}
      initialPdfFilter={pdfFilter}
      initialViewCategory={viewCategory}
      initialStartDate={startDate}
      initialEndDate={endDate}
      initialDatePreset={datePreset}
      tabCounts={tabCounts}
      serverLoadError={
        countsError ||
        (dataPayload.serverLoadError
          ? "Policy records could not be loaded from the database. Please try again after database access is restored."
          : "")
      }
    />
  );
}

async function loadPolicyRecordTabCounts({ basePolicyWhere, isSuperAdmin, orgId, session }) {
  try {
    void session;
    const duplicateCountQuery = `
      SELECT COUNT(*)::integer as count FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id = $2::uuid)
        ${MANUAL_RENEWAL_SQL_EXCLUSION}
        AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') IN (
          SELECT COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          FROM pdf_records
          WHERE deleted_at IS NULL
            AND ($1::boolean OR organization_id = $2::uuid)
            ${MANUAL_RENEWAL_SQL_EXCLUSION}
            AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') != ''
          GROUP BY COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          HAVING COUNT(*) > 1
        )
    `;

    const motorTerms = [
      "motor", "vehicle", "private car", "two wheeler", "bike", "scooter",
      "commercial vehicle", "taxi", "school bus", "goods carrying",
      "passenger carrying", "auto secure", "liability only", "comprehensive", "own damage"
    ];
    const healthTerms = ["health", "mediclaim", "hospital", "family floater"];
    const warehouseTerms = [
      "fire", "sfsp", "burglary", "msme", "warehouse", "stock", "property",
      "business guard", "laghu", "sookshma", "fidelity", "guarantee", "house breaking"
    ];

    const [totalAll, totalDuplicatesResult, motorCount, warehouseCount, healthCount] = await Promise.all([
      prisma.policyRecord.count({ where: basePolicyWhere }),
      prisma.$queryRawUnsafe(duplicateCountQuery, isSuperAdmin, orgId),
      prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, motorTerms) }),
      prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, warehouseTerms) }),
      prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, healthTerms) }),
    ]);

    const totalDuplicates = totalDuplicatesResult[0]?.count || 0;

    // "Other" LOB counts are those that don't match motor, health, or warehouse
    const otherCount = await prisma.policyRecord.count({
      where: {
        ...basePolicyWhere,
        NOT: [
          withPolicyTypeTerms({}, motorTerms),
          withPolicyTypeTerms({}, warehouseTerms),
          withPolicyTypeTerms({}, healthTerms),
        ],
      },
    });

    const categories = [];
    if (motorCount > 0) {
      categories.push({ key: "motor", label: "Motor Policy", count: motorCount });
    }
    if (warehouseCount > 0) {
      categories.push({ key: "warehouse", label: "Warehouse Policy", count: warehouseCount });
    }
    if (healthCount > 0) {
      categories.push({ key: "health", label: "Health Policy", count: healthCount });
    }
    if (otherCount > 0) {
      categories.push({ key: "other", label: "Other Policy", count: otherCount });
    }

    return {
      totalAll,
      totalDuplicates,
      categories,
      error: "",
    };
  } catch (error) {
    console.error("Policy record tab counts failed:", error instanceof Error ? error.message : error);
    return {
      totalAll: 0,
      totalDuplicates: 0,
      categories: [],
      error:
        "Policy records could not be loaded from the database. Please try again after database access is restored.",
    };
  }
}

function withPolicyTypeTerms(baseWhere, terms) {
  return {
    ...baseWhere,
    OR: terms.flatMap((term) => [
      { selectedPolicyType: { contains: term, mode: "insensitive" } },
      { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
      { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
    ]),
  };
}
