export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords, getCurrentSessionFromCookies } from "@/lib/records/scoped-data";
import { getTenantFilter } from "@/lib/auth/rbac";
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
    deletedAt: null,
    NOT: [
      { sourceFile: "Renewal Page data.xlsx" },
      { sourceFile: "Manual Renewal" }
    ]
  };

  const [totalAll, totalDuplicates, motorCount, healthCount, fireCount, lifeCount, homeCount, cyberCount, dataPayload] = await Promise.all([
    prisma.policyRecord.count({ where: basePolicyWhere }),
    // duplicates count
    prisma.$queryRaw`
      SELECT COUNT(*)::integer as count FROM pdf_records
      WHERE deleted_at IS NULL
        AND (${isSuperAdmin}::boolean OR organization_id = ${orgId}::uuid)
        AND (source_file IS NULL OR source_file NOT IN ('Renewal Page data.xlsx', 'Manual Renewal'))
        AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') IN (
          SELECT COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          FROM pdf_records
          WHERE deleted_at IS NULL
            AND (${isSuperAdmin}::boolean OR organization_id = ${orgId}::uuid)
            AND (source_file IS NULL OR source_file NOT IN ('Renewal Page data.xlsx', 'Manual Renewal'))
            AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') != ''
          GROUP BY COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          HAVING COUNT(*) > 1
        )
    `.then(res => res[0]?.count || 0),
    // motor count
    prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['motor', 'vehicle', 'car', 'two wheeler', 'bike', 'scooter', 'commercial vehicle', 'taxi', 'cab', 'bus']) }),
    // health count
    prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['health', 'mediclaim', 'hospital', 'family floater']) }),
    // fire count
    prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['fire', 'sfsp', 'burglary', 'msme', 'warehouse', 'stock', 'property']) }),
    // life count
    prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['life assured', 'life policy', 'term life', 'endowment']) }),
    // home count
    prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['home building', 'home contents', 'home policy']) }),
    // cyber count
    prisma.policyRecord.count({ where: withPolicyTypeTerms(basePolicyWhere, ['cyber', 'ransomware', 'data breach']) }),
    // load scoped policy records
    loadScopedPolicyRecords({
      includeInactive: true,
      page,
      limit,
      q,
      filterField,
      filterValue,
      pdfFilter,
      viewCategory
    })
  ]);

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
    />
  );
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
