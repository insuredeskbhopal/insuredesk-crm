export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords, getCurrentSessionFromCookies } from "@/lib/records/scoped-data";
import { getTenantFilter, applyLOBRestriction, getLOBFilterSQL } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";

export default async function PolicyRecordsPage(props) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || "1", 10);
  const limit = parseInt(searchParams.limit || "20", 10);
  const q = searchParams.q || "";
  const filterField = searchParams.filterField || "";
  const filterValue = searchParams.filterValue || "";
  const pdfFilter = searchParams.pdfFilter || "all";
  const viewCategory = searchParams.viewCategory || "all";

  const session = await getCurrentSessionFromCookies();
  const tenantFilter = session ? getTenantFilter(session, "read") : { id: "00000000-0000-0000-0000-000000000000" };
  const isSuperAdmin = session?.role === "SUPER_ADMIN";
  const orgId = session?.organizationId || null;
  const basePolicyWhere = {
    ...tenantFilter,
    deletedAt: null
  };

  applyLOBRestriction(basePolicyWhere, session);

  const dataPayload = await loadScopedPolicyRecords({
    includeInactive: true,
    page,
    limit,
    q,
    filterField,
    filterValue,
    pdfFilter,
    viewCategory
  });
  const countsPayload = await loadPolicyRecordTabCounts({ basePolicyWhere, isSuperAdmin, orgId, session });
  const {
    totalAll,
    totalDuplicates,
    motorCount,
    healthCount,
    fireCount,
    lifeCount,
    homeCount,
    cyberCount,
    error: countsError
  } = countsPayload;

  const { records, totalCount, totalPages } = dataPayload;

  const tabCounts = {
    all: totalAll,
    duplicates: totalDuplicates,
    motor: motorCount,
    health: healthCount,
    fire: fireCount,
    life: lifeCount,
    home: homeCount,
    cyber: cyberCount
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
      tabCounts={tabCounts}
      serverLoadError={countsError || (dataPayload.serverLoadError ? "Policy records could not be loaded from the database. Please try again after database access is restored." : "")}
    />
  );
}

async function loadPolicyRecordTabCounts({ basePolicyWhere, isSuperAdmin, orgId, session }) {
  try {
    const lobSql = isSuperAdmin ? "" : getLOBFilterSQL(session?.assignedLOBs);
    const duplicateCountQuery = `
      SELECT COUNT(*)::integer as count FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id = $2::uuid)
        ${lobSql}
        AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') IN (
          SELECT COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          FROM pdf_records
          WHERE deleted_at IS NULL
            AND ($1::boolean OR organization_id = $2::uuid)
            ${lobSql}
            AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') != ''
          GROUP BY COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          HAVING COUNT(*) > 1
        )
    `;

    const [totalAll, totalDuplicates, motorCount, healthCount, fireCount, lifeCount, homeCount, cyberCount] = await Promise.all([
      prisma.policyRecord.count({ where: basePolicyWhere }),
      prisma.$queryRawUnsafe(duplicateCountQuery, isSuperAdmin, orgId).then(res => res[0]?.count || 0),
      prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['motor', 'vehicle', 'car', 'two wheeler', 'bike', 'scooter', 'commercial vehicle', 'taxi', 'cab', 'bus']) }),
      prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['health', 'mediclaim', 'hospital', 'family floater']) }),
      prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['fire', 'sfsp', 'burglary', 'msme', 'warehouse', 'stock', 'property']) }),
      prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['life assured', 'life policy', 'term life', 'endowment']) }),
      prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['home building', 'home contents', 'home policy']) }),
      prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['cyber', 'ransomware', 'data breach']) })
    ]);

    return { totalAll, totalDuplicates, motorCount, healthCount, fireCount, lifeCount, homeCount, cyberCount, error: "" };
  } catch (error) {
    console.error("Policy record tab counts failed:", error instanceof Error ? error.message : error);
    return {
      totalAll: 0,
      totalDuplicates: 0,
      motorCount: 0,
      healthCount: 0,
      fireCount: 0,
      lifeCount: 0,
      homeCount: 0,
      cyberCount: 0,
      error: "Policy records could not be loaded from the database. Please try again after database access is restored."
    };
  }
}

function withPolicyTypeTerms(baseWhere, terms) {
  return {
    ...baseWhere,
    OR: terms.flatMap((term) => [
      { selectedPolicyType: { contains: term, mode: "insensitive" } },
      { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
      { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } }
    ])
  };
}
