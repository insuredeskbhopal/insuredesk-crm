import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { MANUAL_RENEWAL_SQL_EXCLUSION } from "@/lib/records/manual-renewal-source";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";
import { loadLeadAgentReport } from "@/lib/reports/lead-generation";

export const dynamic = "force-dynamic";

function tenantSql(session) {
  return [session.role === "SUPER_ADMIN", session.organizationId ?? null];
}

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const session = await verifyJWT(token);
    if (!session) return Response.json({ error: "Invalid or expired session" }, { status: 401 });

    const [isSuperAdmin, organizationId] = tenantSql(session);
    const sqlParams = [isSuperAdmin, organizationId];
    const tenantFilter = getTenantFilter(session, "read");

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
          is_active_policy
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
          ${MANUAL_RENEWAL_SQL_EXCLUSION}
          AND COALESCE(source_file, '') != 'generic_renewal_template.xlsx'
          AND COALESCE(pdf_file_name, '') != 'generic_renewal_template.xlsx'
      )
      SELECT
        COUNT(*) FILTER (WHERE is_active_policy = true)::integer AS active_policies,
        COUNT(DISTINCT customer_name) FILTER (WHERE is_active_policy = true)::integer AS total_customers
      FROM active_records
    `;

    const [policyRows, uploadGroups, leadAgentReport] = await Promise.all([
      prisma.$queryRawUnsafe(policySummaryQuery, ...sqlParams),
      prisma.uploadedFile.groupBy({
        by: ["status"],
        where: { ...tenantFilter, deletedAt: null },
        _count: { id: true },
      }),
      session.role === "SUPER_ADMIN"
        ? loadLeadAgentReport({ session, page: 1, limit: 6 })
        : Promise.resolve(null),
    ]);

    const policy = policyRows[0] || {};
    const uploadCount = (status) =>
      uploadGroups
        .filter((group) => normalizeUploadStatus(group.status) === status)
        .reduce((total, group) => total + Number(group._count?.id || 0), 0);

    return Response.json({
      success: true,
      viewerRole: session.role,
      summary: {
        activePolicies: Number(policy.active_policies) || 0,
        totalCustomers: Number(policy.total_customers) || 0,
        pendingPdfReviews: uploadCount(UPLOAD_STATUS.REVIEW_REQUIRED),
        failedExtractions: uploadCount(UPLOAD_STATUS.FAILED),
      },
      leadAgentReport,
    });
  } catch (error) {
    console.error("Dashboard overview failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Dashboard overview could not be loaded.", success: false }, { status: 500 });
  }
}
