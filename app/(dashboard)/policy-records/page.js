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

  const [totalAll, totalDuplicates, motorCount, healthCount, fireCount, lifeCount, homeCount, cyberCount, dataPayload] = await Promise.all([
    prisma.policyRecord.count({ where: { ...tenantFilter, deletedAt: null, isActivePolicy: true } }),
    // duplicates count
    prisma.$queryRaw`
      SELECT COUNT(*)::integer as count FROM pdf_records
      WHERE deleted_at IS NULL
        AND (${isSuperAdmin}::boolean OR organization_id = ${orgId}::uuid)
        AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') IN (
          SELECT COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          FROM pdf_records
          WHERE deleted_at IS NULL
            AND (${isSuperAdmin}::boolean OR organization_id = ${orgId}::uuid)
            AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') != ''
          GROUP BY COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          HAVING COUNT(*) > 1
        )
    `.then(res => res[0]?.count || 0),
    // motor count
    prisma.policyRecord.count({ where: { ...tenantFilter, deletedAt: null, isActivePolicy: true, OR: [
      { selectedPolicyType: { contains: 'motor', mode: 'insensitive' } },
      { reviewedData: { path: ['policyType'], string_contains: 'motor' } },
      { data: { path: ['policyType'], string_contains: 'motor' } }
    ] } }),
    // health count
    prisma.policyRecord.count({ where: { ...tenantFilter, deletedAt: null, isActivePolicy: true, OR: [
      { selectedPolicyType: { contains: 'health', mode: 'insensitive' } },
      { reviewedData: { path: ['policyType'], string_contains: 'health' } },
      { data: { path: ['policyType'], string_contains: 'health' } }
    ] } }),
    // fire count
    prisma.policyRecord.count({ where: { ...tenantFilter, deletedAt: null, isActivePolicy: true, OR: [
      { selectedPolicyType: { contains: 'fire', mode: 'insensitive' } },
      { reviewedData: { path: ['policyType'], string_contains: 'fire' } },
      { data: { path: ['policyType'], string_contains: 'fire' } }
    ] } }),
    // life count
    prisma.policyRecord.count({ where: { ...tenantFilter, deletedAt: null, isActivePolicy: true, OR: [
      { selectedPolicyType: { contains: 'life', mode: 'insensitive' } },
      { reviewedData: { path: ['policyType'], string_contains: 'life' } },
      { data: { path: ['policyType'], string_contains: 'life' } }
    ] } }),
    // home count
    prisma.policyRecord.count({ where: { ...tenantFilter, deletedAt: null, isActivePolicy: true, OR: [
      { selectedPolicyType: { contains: 'home', mode: 'insensitive' } },
      { reviewedData: { path: ['policyType'], string_contains: 'home' } },
      { data: { path: ['policyType'], string_contains: 'home' } }
    ] } }),
    // cyber count
    prisma.policyRecord.count({ where: { ...tenantFilter, deletedAt: null, isActivePolicy: true, OR: [
      { selectedPolicyType: { contains: 'cyber', mode: 'insensitive' } },
      { reviewedData: { path: ['policyType'], string_contains: 'cyber' } },
      { data: { path: ['policyType'], string_contains: 'cyber' } }
    ] } }),
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
