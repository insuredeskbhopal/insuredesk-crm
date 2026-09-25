export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords, getCurrentSessionFromCookies, getSavedAtDateFilter } from "@/lib/records/scoped-data";
import { getTenantFilter } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { MANUAL_RENEWAL_SQL_EXCLUSION, withoutManualRenewalSources } from "@/lib/records/manual-renewal-source";

import { getCachedTabCounts } from "@/lib/records/tab-counts-cache";

const POLICY_RECORD_HIDDEN_SOURCE_FILES = ["generic_renewal_template.xlsx"];

function addHiddenPolicyRecordSources(where) {
  const existingAnd = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
  where.AND = [
    ...existingAnd,
    { OR: [{ sourceFile: { notIn: POLICY_RECORD_HIDDEN_SOURCE_FILES } }, { sourceFile: null }] },
    { OR: [{ pdfFileName: { notIn: POLICY_RECORD_HIDDEN_SOURCE_FILES } }, { pdfFileName: null }] },
  ];
  return where;
}

async function loadPolicyRecordTabCounts({ isSuperAdmin, orgId, session, datePreset, startDate, endDate }) {
  try {
    void session;
    const dateFilter = getSavedAtDateFilter({ datePreset, startDate, endDate });
    let dateClause = "";
    const params = [isSuperAdmin, orgId];

    if (dateFilter?.gte && dateFilter?.lte) {
      params.push(dateFilter.gte, dateFilter.lte);
      dateClause = `AND saved_at >= $3 AND saved_at <= $4`;
    } else if (dateFilter?.gte) {
      params.push(dateFilter.gte);
      dateClause = `AND saved_at >= $3`;
    } else if (dateFilter?.lte) {
      params.push(dateFilter.lte);
      dateClause = `AND saved_at <= $3`;
    }

    const categoryCountQuery = `
      SELECT 
        COUNT(*)::integer as total_all,
        COUNT(CASE WHEN (
          (
            (COALESCE(reviewed_data->>'vehicleNumber', data->>'vehicleNumber', reviewed_data->>'registrationNumber', data->>'registrationNumber', '') ~* '^[A-Z]{2}[0-9]')
            OR (COALESCE(reviewed_data->>'makeModel', data->>'makeModel', reviewed_data->>'vehicleMake', data->>'vehicleMake', '') != '' AND COALESCE(reviewed_data->>'makeModel', data->>'makeModel', '') !~* 'hospital|waiting|benefit')
            OR (COALESCE(reviewed_data->>'policyCategory', data->>'policyCategory', reviewed_data->>'documentCategory', data->>'documentCategory', selected_service_category, detected_service_category, '') ILIKE '%motor%')
            OR (COALESCE(selected_policy_type, reviewed_data->>'policyType', data->>'policyType', '') ~* 'motor|vehicle|private car|two[ -]?wheeler|bike|scooter|commercial vehicle|taxi|school bus|goods carrying|passenger carrying|auto secure|liability only|comprehensive|own damage|package policy|bundled|drive assure|gcv|pcv|trailer|standalone motor|act policy|third party')
          )
          AND NOT (
            COALESCE(selected_policy_type, reviewed_data->>'policyType', data->>'policyType', '') ~* 'floater|health|mediclaim|hospital|optima|individual|gmc|gpa|warehouse|fire|burglary|msme|sfsp'
            OR COALESCE(selected_service_category, detected_service_category, '') ~* 'health|fire|warehouse|burglary'
            OR COALESCE(source_file, pdf_file_name, '') ~* 'health policy|health'
          )
        ) THEN 1 END)::integer as motor_count,
        COUNT(CASE WHEN (
          (
            COALESCE(selected_service_category, detected_service_category, '') ILIKE '%warehouse%'
            OR COALESCE(selected_policy_type, reviewed_data->>'policyType', data->>'policyType', '') ~* 'warehouse|warehousing|mpwlc'
            OR COALESCE(reviewed_data->>'policyCategory', data->>'policyCategory', '') ILIKE '%warehouse%'
          )
          AND COALESCE(source_file, pdf_file_name, '') !~* 'rachna fuels'
        ) THEN 1 END)::integer as warehouse_count,
        COUNT(CASE WHEN (
          COALESCE(selected_policy_type, reviewed_data->>'policyType', data->>'policyType', '') ~* 'floater|health|mediclaim|hospital|optima|individual|gmc|gpa'
          OR COALESCE(selected_service_category, detected_service_category, '') ILIKE '%health%'
          OR COALESCE(source_file, pdf_file_name, '') ~* 'health policy|health'
        ) THEN 1 END)::integer as health_count
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
        ${dateClause}
        ${MANUAL_RENEWAL_SQL_EXCLUSION}
        AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
        AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx';
    `;

    const duplicateCountQuery = `
      SELECT COUNT(*)::integer as count FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
        ${dateClause}
        ${MANUAL_RENEWAL_SQL_EXCLUSION}
        AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
        AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
        AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') IN (
          SELECT COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          FROM pdf_records
          WHERE deleted_at IS NULL
            AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
            ${dateClause}
            ${MANUAL_RENEWAL_SQL_EXCLUSION}
            AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
            AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
            AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') != ''
          GROUP BY COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
          HAVING COUNT(*) > 1
        )
    `;

    const [countsResult, totalDuplicatesResult] = await Promise.all([
      prisma.$queryRawUnsafe(categoryCountQuery, ...params),
      prisma.$queryRawUnsafe(duplicateCountQuery, ...params),
    ]);

    const counts = countsResult[0] || {};
    const totalAll = counts.total_all || 0;
    const motorCount = counts.motor_count || 0;
    const warehouseCount = counts.warehouse_count || 0;
    const healthCount = counts.health_count || 0;
    const otherCount = Math.max(0, totalAll - (motorCount + warehouseCount + healthCount));
    const totalDuplicates = totalDuplicatesResult[0]?.count || 0;

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
      categories.push({ key: "other", label: "Non-Motor Policy", count: otherCount });
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

export default async function PolicyRecordsPage(props) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.limit || "20", 10) || 20));
  const q = searchParams.q || "";
  const filterField = searchParams.filterField || "";
  const filterValue = searchParams.filterValue || "";
  const pdfFilter = searchParams.pdfFilter || "all";
  const viewCategory = searchParams.viewCategory || "all";
  const startDate = searchParams.startDate || "";
  const endDate = searchParams.endDate || "";
  const datePreset = searchParams.datePreset !== undefined ? searchParams.datePreset : "this-month";
  const lifecycle = ["active", "inactive"].includes(searchParams.lifecycle) ? searchParams.lifecycle : "all";

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
  addHiddenPolicyRecordSources(policyRecordWhere);
  const dataPayload = await loadScopedPolicyRecords({
    includeInactive: true,
    excludeSourceFiles: POLICY_RECORD_HIDDEN_SOURCE_FILES,
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
    lifecycle,
  });

  const cacheKey = `${orgId || "global"}_${isSuperAdmin}_${datePreset}_${startDate}_${endDate}`;
  const countsPayload = await getCachedTabCounts({
    key: cacheKey,
    fetcher: () => loadPolicyRecordTabCounts({
      isSuperAdmin,
      orgId,
      session,
      datePreset,
      startDate,
      endDate,
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
      initialLifecycle={lifecycle}
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
