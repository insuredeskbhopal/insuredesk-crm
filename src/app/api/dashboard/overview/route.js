import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { MANUAL_RENEWAL_SQL_EXCLUSION } from "@/lib/records/manual-renewal-source";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";
import { loadLeadAgentReport } from "@/lib/reports/lead-generation";

export const dynamic = "force-dynamic";

const DASHBOARD_OVERVIEW_TTL_MS = 30 * 1000; // 30 seconds
const dashboardOverviewCache = globalThis.__dashboardOverviewCache || new Map();
globalThis.__dashboardOverviewCache = dashboardOverviewCache;

function tenantSql(session) {
  return [session.role === "SUPER_ADMIN", session.organizationId ?? null];
}

function getPeriodBounds(period = "YTD", yearParam = null, monthParam = null) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(now);
  const currentYear = Number(parts.find((p) => p.type === "year")?.value || 2026);
  const currentMonth = Number(parts.find((p) => p.type === "month")?.value || 8);
  const currentDay = Number(parts.find((p) => p.type === "day")?.value || 20);

  let startIso = null;
  let endIso = null;
  let label = "All Time";

  const p = (period || "").toUpperCase();
  const yr = yearParam && yearParam !== "ALL" ? Number(yearParam) : null;
  const mo = monthParam && monthParam !== "ALL" ? Number(monthParam) : null;

  if (mo && (yr || p === "2026" || p === "2025" || p === "2024" || p === "YTD")) {
    const targetYr = yr || (p === "2025" ? 2025 : p === "2024" ? 2024 : currentYear);
    const start = new Date(Date.UTC(targetYr, mo - 1, 1, 0, 0, 0) - 5.5 * 3600 * 1000);
    const end = new Date(Date.UTC(targetYr, mo, 1, 0, 0, 0) - 5.5 * 3600 * 1000 - 1);
    startIso = start.toISOString();
    endIso = end.toISOString();
    const mName = new Date(targetYr, mo - 1, 1).toLocaleString("en-US", { month: "long" });
    label = `${mName} ${targetYr}`;
  } else if (yr) {
    const start = new Date(Date.UTC(yr, 0, 1, 0, 0, 0) - 5.5 * 3600 * 1000);
    const end = new Date(Date.UTC(yr + 1, 0, 1, 0, 0, 0) - 5.5 * 3600 * 1000 - 1);
    startIso = start.toISOString();
    endIso = end.toISOString();
    label = `Year ${yr}`;
  } else if (p === "TODAY") {
    const start = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay, 0, 0, 0) - 5.5 * 3600 * 1000);
    const end = new Date(Date.UTC(currentYear, currentMonth - 1, currentDay + 1, 0, 0, 0) - 5.5 * 3600 * 1000 - 1);
    startIso = start.toISOString();
    endIso = end.toISOString();
    label = `Today (${currentDay}/${currentMonth}/${currentYear})`;
  } else if (p === "MTD") {
    const start = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0) - 5.5 * 3600 * 1000);
    const end = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0) - 5.5 * 3600 * 1000 - 1);
    startIso = start.toISOString();
    endIso = end.toISOString();
    const mName = new Date(currentYear, currentMonth - 1, 1).toLocaleString("en-US", { month: "long" });
    label = `This Month (${mName} ${currentYear})`;
  } else if (p === "YTD" || p === "2026") {
    const targetYr = currentYear || 2026;
    const start = new Date(Date.UTC(targetYr, 0, 1, 0, 0, 0) - 5.5 * 3600 * 1000);
    const end = new Date(Date.UTC(targetYr + 1, 0, 1, 0, 0, 0) - 5.5 * 3600 * 1000 - 1);
    startIso = start.toISOString();
    endIso = end.toISOString();
    label = `Year ${targetYr}`;
  } else if (p === "2025") {
    const start = new Date(Date.UTC(2025, 0, 1, 0, 0, 0) - 5.5 * 3600 * 1000);
    const end = new Date(Date.UTC(2026, 0, 1, 0, 0, 0) - 5.5 * 3600 * 1000 - 1);
    startIso = start.toISOString();
    endIso = end.toISOString();
    label = "Year 2025";
  } else if (p === "2024") {
    const start = new Date(Date.UTC(2024, 0, 1, 0, 0, 0) - 5.5 * 3600 * 1000);
    const end = new Date(Date.UTC(2025, 0, 1, 0, 0, 0) - 5.5 * 3600 * 1000 - 1);
    startIso = start.toISOString();
    endIso = end.toISOString();
    label = "Year 2024";
  } else if (p === "LAST_30") {
    const end = now;
    const start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    startIso = start.toISOString();
    endIso = end.toISOString();
    label = "Last 30 Days";
  } else if (p === "LAST_90") {
    const end = now;
    const start = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
    startIso = start.toISOString();
    endIso = end.toISOString();
    label = "Last 90 Days";
  }

  return { startIso, endIso, label };
}

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const session = await verifyJWT(token);
    if (!session) return Response.json({ error: "Invalid or expired session" }, { status: 401 });

    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period") || "YTD";
    const yearParam = url.searchParams.get("year") || null;
    const monthParam = url.searchParams.get("month") || null;
    const categoryParam = (url.searchParams.get("category") || url.searchParams.get("policyType") || "").toUpperCase().trim();
    const categoryFilterVal = categoryParam && categoryParam !== "ALL" ? categoryParam : null;

    const cacheKey = `${session.role}-${session.organizationId || "all"}-${periodParam}-${yearParam || "none"}-${monthParam || "none"}-${categoryFilterVal || "none"}`;
    const cached = dashboardOverviewCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < DASHBOARD_OVERVIEW_TTL_MS) {
      return Response.json(cached.data);
    }

    const { startIso, endIso, label: dateRangeLabel } = getPeriodBounds(periodParam, yearParam, monthParam);

    const [isSuperAdmin, organizationId] = tenantSql(session);
    const sqlParams = [isSuperAdmin, organizationId, startIso, endIso, categoryFilterVal];
    const tenantFilter = getTenantFilter(session, "read");

    const safePremiumSql = `(CASE
      WHEN NULLIF(REGEXP_REPLACE(COALESCE(reviewed_data->>'totalPremium', data->>'totalPremium', reviewed_data->>'netPremium', data->>'netPremium', ''), '[^0-9.]', '', 'g'), '') ~ '^[0-9]+(\\.[0-9]+)?$'
      THEN CAST(REGEXP_REPLACE(COALESCE(reviewed_data->>'totalPremium', data->>'totalPremium', reviewed_data->>'netPremium', data->>'netPremium', ''), '[^0-9.]', '', 'g') AS NUMERIC)
      ELSE 0
    END)`;

    const policySummaryQuery = `
      WITH active_records AS (
        SELECT
          COALESCE(
            NULLIF(BTRIM(reviewed_data->>'insuredName'), ''),
            NULLIF(BTRIM(data->>'insuredName'), ''),
            NULLIF(BTRIM(reviewed_data->>'customerName'), ''),
            NULLIF(BTRIM(data->>'customerName'), ''),
            NULLIF(BTRIM(reviewed_data->>'Insured Name'), ''),
            NULLIF(BTRIM(data->>'Insured Name'), ''),
            'Unnamed insured'
          ) AS customer_name,
          is_active_policy,
          ${safePremiumSql} AS premium
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
          ${MANUAL_RENEWAL_SQL_EXCLUSION}
          AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
          AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
          AND ($3::timestamptz IS NULL OR COALESCE(saved_at, created_at) >= $3::timestamptz)
          AND ($4::timestamptz IS NULL OR COALESCE(saved_at, created_at) <= $4::timestamptz)
          AND ($5::text IS NULL OR COALESCE(
            NULLIF(BTRIM(reviewed_data->>'policyCategory'), ''),
            NULLIF(BTRIM(data->>'policyCategory'), ''),
            NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
            NULLIF(BTRIM(data->>'documentCategory'), ''),
            NULLIF(BTRIM(reviewed_data->>'policyType'), ''),
            NULLIF(BTRIM(data->>'policyType'), ''),
            'General Insurance'
          ) ILIKE '%' || $5::text || '%')
      )
      SELECT
        COUNT(*) FILTER (WHERE is_active_policy = true)::integer AS active_policies,
        COUNT(DISTINCT customer_name) FILTER (WHERE is_active_policy = true)::integer AS total_customers,
        COALESCE(SUM(premium) FILTER (WHERE is_active_policy = true), 0)::numeric AS total_premium
      FROM active_records
    `;

    let trendsQuery;
    if (periodParam === "TODAY") {
      trendsQuery = `
        SELECT
          EXTRACT(HOUR FROM COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata')::integer AS hour_num,
          TO_CHAR(COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata', 'HH12 AM') AS short_month,
          TO_CHAR(COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') AS month_label,
          TO_CHAR(COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24') AS month_key,
          COUNT(*)::integer AS policy_count,
          COALESCE(SUM(${safePremiumSql}), 0)::numeric AS total_premium
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
          ${MANUAL_RENEWAL_SQL_EXCLUSION}
          AND ($3::timestamptz IS NULL OR COALESCE(saved_at, created_at) >= $3::timestamptz)
          AND ($4::timestamptz IS NULL OR COALESCE(saved_at, created_at) <= $4::timestamptz)
          AND ($5::text IS NULL OR COALESCE(
            NULLIF(BTRIM(reviewed_data->>'policyCategory'), ''),
            NULLIF(BTRIM(data->>'policyCategory'), ''),
            NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
            NULLIF(BTRIM(data->>'documentCategory'), ''),
            NULLIF(BTRIM(reviewed_data->>'policyType'), ''),
            NULLIF(BTRIM(data->>'policyType'), ''),
            'General Insurance'
          ) ILIKE '%' || $5::text || '%')
        GROUP BY 1, 2, 3, 4
        ORDER BY hour_num ASC
      `;
    } else if (periodParam === "MTD" || (monthParam && monthParam !== "ALL")) {
      trendsQuery = `
        SELECT
          TO_CHAR(COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata', 'DD Mon') AS short_month,
          TO_CHAR(COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY') AS month_label,
          TO_CHAR(COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS month_key,
          EXTRACT(DAY FROM COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata')::integer AS day,
          COUNT(*)::integer AS policy_count,
          COALESCE(SUM(${safePremiumSql}), 0)::numeric AS total_premium
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
          ${MANUAL_RENEWAL_SQL_EXCLUSION}
          AND ($3::timestamptz IS NULL OR COALESCE(saved_at, created_at) >= $3::timestamptz)
          AND ($4::timestamptz IS NULL OR COALESCE(saved_at, created_at) <= $4::timestamptz)
          AND ($5::text IS NULL OR COALESCE(
            NULLIF(BTRIM(reviewed_data->>'policyCategory'), ''),
            NULLIF(BTRIM(data->>'policyCategory'), ''),
            NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
            NULLIF(BTRIM(data->>'documentCategory'), ''),
            NULLIF(BTRIM(reviewed_data->>'policyType'), ''),
            NULLIF(BTRIM(data->>'policyType'), ''),
            'General Insurance'
          ) ILIKE '%' || $5::text || '%')
        GROUP BY 1, 2, 3, 4
        ORDER BY month_key ASC
      `;
    } else {
      trendsQuery = `
        SELECT
          TO_CHAR(DATE_TRUNC('month', COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM') AS month_key,
          TO_CHAR(DATE_TRUNC('month', COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata'), 'Mon YY') AS short_month,
          TO_CHAR(DATE_TRUNC('month', COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata'), 'Month YYYY') AS month_label,
          EXTRACT(YEAR FROM COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata')::integer AS year,
          EXTRACT(MONTH FROM COALESCE(saved_at, created_at) AT TIME ZONE 'Asia/Kolkata')::integer AS month,
          COUNT(*)::integer AS policy_count,
          COALESCE(SUM(${safePremiumSql}), 0)::numeric AS total_premium
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
          ${MANUAL_RENEWAL_SQL_EXCLUSION}
          AND ($3::timestamptz IS NULL OR COALESCE(saved_at, created_at) >= $3::timestamptz)
          AND ($4::timestamptz IS NULL OR COALESCE(saved_at, created_at) <= $4::timestamptz)
          AND ($5::text IS NULL OR COALESCE(
            NULLIF(BTRIM(reviewed_data->>'policyCategory'), ''),
            NULLIF(BTRIM(data->>'policyCategory'), ''),
            NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
            NULLIF(BTRIM(data->>'documentCategory'), ''),
            NULLIF(BTRIM(reviewed_data->>'policyType'), ''),
            NULLIF(BTRIM(data->>'policyType'), ''),
            'General Insurance'
          ) ILIKE '%' || $5::text || '%')
        GROUP BY 1, 2, 3, 4, 5
        ORDER BY 1 ASC
      `;
    }

    const categoryBreakdownQuery = `
      SELECT
        COALESCE(
          NULLIF(BTRIM(reviewed_data->>'policyCategory'), ''),
          NULLIF(BTRIM(data->>'policyCategory'), ''),
          NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
          NULLIF(BTRIM(data->>'documentCategory'), ''),
          'General Insurance'
        ) AS category,
        COUNT(*)::integer AS count,
        COALESCE(SUM(${safePremiumSql}), 0)::numeric AS total_premium
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
        ${MANUAL_RENEWAL_SQL_EXCLUSION}
        AND ($3::timestamptz IS NULL OR COALESCE(saved_at, created_at) >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR COALESCE(saved_at, created_at) <= $4::timestamptz)
        AND ($5::text IS NULL OR COALESCE(
          NULLIF(BTRIM(reviewed_data->>'policyCategory'), ''),
          NULLIF(BTRIM(data->>'policyCategory'), ''),
          NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
          NULLIF(BTRIM(data->>'documentCategory'), ''),
          NULLIF(BTRIM(reviewed_data->>'policyType'), ''),
          NULLIF(BTRIM(data->>'policyType'), ''),
          'General Insurance'
        ) ILIKE '%' || $5::text || '%')
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `;

    const topInsurersQuery = `
      SELECT
        COALESCE(
          NULLIF(BTRIM(reviewed_data->>'insuranceCompany'), ''),
          NULLIF(BTRIM(data->>'insuranceCompany'), ''),
          NULLIF(BTRIM(reviewed_data->>'companyName'), ''),
          NULLIF(BTRIM(data->>'companyName'), ''),
          'Unknown Insurer'
        ) AS insurer,
        COUNT(*)::integer AS count,
        COALESCE(SUM(${safePremiumSql}), 0)::numeric AS total_premium
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
        ${MANUAL_RENEWAL_SQL_EXCLUSION}
        AND ($3::timestamptz IS NULL OR COALESCE(saved_at, created_at) >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR COALESCE(saved_at, created_at) <= $4::timestamptz)
        AND ($5::text IS NULL OR COALESCE(
          NULLIF(BTRIM(reviewed_data->>'policyCategory'), ''),
          NULLIF(BTRIM(data->>'policyCategory'), ''),
          NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
          NULLIF(BTRIM(data->>'documentCategory'), ''),
          NULLIF(BTRIM(reviewed_data->>'policyType'), ''),
          NULLIF(BTRIM(data->>'policyType'), ''),
          'General Insurance'
        ) ILIKE '%' || $5::text || '%')
      GROUP BY 1
      ORDER BY total_premium DESC
      LIMIT 8
    `;

    const recentPoliciesQuery = `
      SELECT
        id,
        COALESCE(saved_at, created_at) AS "createdAt",
        COALESCE(
          NULLIF(BTRIM(reviewed_data->>'insuredName'), ''),
          NULLIF(BTRIM(data->>'insuredName'), ''),
          NULLIF(BTRIM(reviewed_data->>'customerName'), ''),
          NULLIF(BTRIM(data->>'customerName'), ''),
          'Unnamed Customer'
        ) AS "customerName",
        COALESCE(
          NULLIF(BTRIM(reviewed_data->>'insuranceCompany'), ''),
          NULLIF(BTRIM(data->>'insuranceCompany'), ''),
          NULLIF(BTRIM(reviewed_data->>'companyName'), ''),
          NULLIF(BTRIM(data->>'companyName'), ''),
          'Unknown Insurer'
        ) AS "companyName",
        COALESCE(
          NULLIF(BTRIM(reviewed_data->>'policyType'), ''),
          NULLIF(BTRIM(data->>'policyType'), ''),
          NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
          NULLIF(BTRIM(data->>'documentCategory'), ''),
          'Policy'
        ) AS "policyType",
        COALESCE(
          NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
          NULLIF(BTRIM(data->>'documentCategory'), ''),
          'General Insurance'
        ) AS "documentCategory",
        COALESCE(
          NULLIF(BTRIM(reviewed_data->>'policyNumber'), ''),
          NULLIF(BTRIM(data->>'policyNumber'), ''),
          'Pending'
        ) AS "policyNumber",
        ${safePremiumSql} AS "totalPremium"
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
        ${MANUAL_RENEWAL_SQL_EXCLUSION}
        AND ($3::timestamptz IS NULL OR COALESCE(saved_at, created_at) >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR COALESCE(saved_at, created_at) <= $4::timestamptz)
        AND ($5::text IS NULL OR COALESCE(
          NULLIF(BTRIM(reviewed_data->>'policyCategory'), ''),
          NULLIF(BTRIM(data->>'policyCategory'), ''),
          NULLIF(BTRIM(reviewed_data->>'documentCategory'), ''),
          NULLIF(BTRIM(data->>'documentCategory'), ''),
          NULLIF(BTRIM(reviewed_data->>'policyType'), ''),
          NULLIF(BTRIM(data->>'policyType'), ''),
          'General Insurance'
        ) ILIKE '%' || $5::text || '%')
      ORDER BY COALESCE(saved_at, created_at) DESC
      LIMIT 6
    `;

    const dateFilterPrisma = (startIso || endIso)
      ? {
          ...(startIso ? { gte: new Date(startIso) } : {}),
          ...(endIso ? { lte: new Date(endIso) } : {}),
        }
      : undefined;

    const [
      policyRows,
      uploadGroups,
      monthlyTrends,
      categoryRows,
      insurerRows,
      recentPolicies,
      claimGroups,
      leadGroups,
      recentLeads,
      leadAgentReport,
    ] = await Promise.all([
      prisma.$queryRawUnsafe(policySummaryQuery, ...sqlParams).catch((err) => {
        console.error("policySummaryQuery error:", err);
        return [];
      }),
      prisma.uploadedFile
        .groupBy({
          by: ["status"],
          where: { ...tenantFilter, deletedAt: null },
          _count: { id: true },
        })
        .catch(() => []),
      prisma.$queryRawUnsafe(trendsQuery, ...sqlParams).catch((err) => {
        console.error("trendsQuery error:", err);
        return [];
      }),
      prisma.$queryRawUnsafe(categoryBreakdownQuery, ...sqlParams).catch((err) => {
        console.error("categoryBreakdownQuery error:", err);
        return [];
      }),
      prisma.$queryRawUnsafe(topInsurersQuery, ...sqlParams).catch((err) => {
        console.error("topInsurersQuery error:", err);
        return [];
      }),
      prisma.$queryRawUnsafe(recentPoliciesQuery, ...sqlParams).catch((err) => {
        console.error("recentPoliciesQuery error:", err);
        return [];
      }),
      prisma.claim
        .groupBy({
          by: ["status"],
          where: {
            ...tenantFilter,
            deletedAt: null,
            ...(dateFilterPrisma ? { createdAt: dateFilterPrisma } : {}),
          },
          _count: { id: true },
        })
        .catch(() => []),
      prisma.leadGeneration
        .groupBy({
          by: ["status"],
          where: {
            ...tenantFilter,
            deletedAt: null,
            ...(dateFilterPrisma ? { createdAt: dateFilterPrisma } : {}),
          },
          _count: { id: true },
        })
        .catch(() => []),
      prisma.leadGeneration
        .findMany({
          where: {
            ...tenantFilter,
            deletedAt: null,
            ...(dateFilterPrisma ? { createdAt: dateFilterPrisma } : {}),
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            selectedLOBs: true,
            status: true,
            customerType: true,
            sourceCompany: true,
            followUpDate: true,
            nextFollowUpDate: true,
            createdAt: true,
            updatedAt: true,
            assignedTo: true,
            createdBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })
        .catch(() => []),
      loadLeadAgentReport({ session, page: 1, limit: 6 }).catch(() => null),
    ]);

    const policy = policyRows[0] || {};
    const uploadCount = (status) =>
      uploadGroups
        .filter((group) => normalizeUploadStatus(group.status) === status)
        .reduce((total, group) => total + Number(group._count?.id || 0), 0);

    const getClaimCount = (status) =>
      claimGroups.find((g) => g.status === status)?._count?.id || 0;
    const totalClaims = claimGroups.reduce((acc, g) => acc + (g._count?.id || 0), 0);

    const getLeadCount = (status) =>
      leadGroups.find((g) => g.status === status)?._count?.id || 0;
    const totalLeads = leadGroups.reduce((acc, g) => acc + (g._count?.id || 0), 0);

    let finalTrends = monthlyTrends || [];
    if (periodParam === "TODAY") {
      const hourlyMap = new Map();
      (monthlyTrends || []).forEach((r) => {
        hourlyMap.set(Number(r.hour_num), {
          count: Number(r.policy_count || 0),
          premium: Number(r.total_premium || 0),
          label: r.month_label,
        });
      });

      const activeHours = Array.from(hourlyMap.keys());
      const startHour = activeHours.length > 0 ? Math.min(9, ...activeHours) : 9;
      const endHour = activeHours.length > 0 ? Math.max(18, ...activeHours) : 18;

      const timeline = [];
      for (let h = startHour; h <= endHour; h++) {
        const d = new Date();
        d.setHours(h, 0, 0, 0);
        const shortLabel = d.toLocaleString("en-US", { hour: "numeric", hour12: true });
        const existing = hourlyMap.get(h) || { count: 0, premium: 0 };
        timeline.push({
          shortMonth: shortLabel,
          monthLabel: existing.count > 0 && existing.label ? `${existing.label} (Today)` : `${shortLabel} (Today)`,
          monthKey: `today-${h}`,
          hour: h,
          policyCount: existing.count,
          totalPremium: existing.premium,
        });
      }
      finalTrends = timeline;
    }

    const responsePayload = {
      success: true,
      viewerRole: session.role,
      periodBounds: {
        startIso,
        endIso,
        label: dateRangeLabel,
      },
      summary: {
        activePolicies: Number(policy.active_policies) || 0,
        totalCustomers: Number(policy.total_customers) || 0,
        totalPremium: Number(policy.total_premium) || 0,
        needsReview: uploadCount(UPLOAD_STATUS.REVIEW_REQUIRED),
        failedExtractions: uploadCount(UPLOAD_STATUS.FAILED),
        totalClaims,
        pendingClaims: getClaimCount("PENDING"),
        claimFollowUps: getClaimCount("UNDER_PROCESS"),
        claimDocumentsPending: getClaimCount("DOCUMENTATION_PENDING"),
        settledClaims: getClaimCount("SETTLED"),
        rejectedClaims: getClaimCount("REJECTED"),
        totalLeads,
        newLeads: getLeadCount("NEW"),
        leadFollowUps: getLeadCount("CONTACTED"),
        interestedLeads: getLeadCount("PROPOSAL_SENT"),
        convertedLeads: getLeadCount("WON"),
        lostLeads: getLeadCount("LOST"),
      },
      monthlyTrends: finalTrends.map((t) => ({
        monthKey: t.monthKey || t.month_key,
        shortMonth: t.shortMonth || t.short_month,
        monthLabel: t.monthLabel || t.month_label,
        year: Number(t.year) || (t.month_key ? Number(String(t.month_key).slice(0, 4)) : null),
        month: Number(t.month) || (t.month_key ? Number(String(t.month_key).slice(5, 7)) : null),
        policyCount: Number(t.policyCount ?? t.policy_count ?? 0),
        totalPremium: Number(t.totalPremium ?? t.total_premium ?? 0),
      })),
      categoryBreakdown: categoryRows.map((c) => ({
        category: c.category,
        count: Number(c.count) || 0,
        totalPremium: Number(c.total_premium) || 0,
      })),
      insurerBreakdown: insurerRows.map((i) => ({
        insurer: i.insurer,
        count: Number(i.count) || 0,
        totalPremium: Number(i.total_premium) || 0,
      })),
      recentPolicies: recentPolicies.map((p) => ({
        ...p,
        totalPremium: Number(p.totalPremium) || 0,
      })),
      recentLeads,
      leadAgentReport,
    };
    dashboardOverviewCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });
    return Response.json(responsePayload);
  } catch (error) {
    console.error("Dashboard overview failed:", error instanceof Error ? error.message : error);
    return Response.json(
      {
        error: "Dashboard overview could not be loaded.",
        success: false,
        summary: {},
        monthlyTrends: [],
        categoryBreakdown: [],
        insurerBreakdown: [],
        recentPolicies: [],
      },
      { status: 200 }
    );
  }
}
