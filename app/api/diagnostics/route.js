import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { getTenantFilter } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    // Diagnostics are strictly system-wide, so only global SUPER_ADMIN is authorized
    if (!session || session.role !== "SUPER_ADMIN") {
      return Response.json(
        { error: "Access denied: Diagnostics is restricted to system administrators" },
        { status: 403 },
      );
    }
    const tenantFilter = getTenantFilter(session, "read");

    const startTime = Date.now();

    // Test database connection and calculate latency
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    // Retrieve stats
    const [policyRecordsCount, uploadedFilesCount, companyCount, bankCount, categoryCount, schemaCount] =
      await Promise.all([
        prisma.policyRecord.count({ where: tenantFilter }),
        prisma.uploadedFile.count({ where: tenantFilter }),
        prisma.insuranceCompany.count(),
        prisma.bankSource.count(),
        prisma.serviceCategory.count(),
        prisma.policySchema.count(),
      ]);

    // Record audit event
    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "VIEW_SYSTEM_DIAGNOSTICS",
      entityType: "System",
      severity: "CRITICAL",
      source: "API",
      ipAddress,
      userAgent,
      userId: session.userId,
      organizationId: session.organizationId,
    });

    return Response.json({
      success: true,
      status: "Healthy",
      latency: `${latency}ms`,
      database: "Neon PostgreSQL",
      orm: "Prisma Client",
      counts: {
        policyRecords: policyRecordsCount,
        uploadedFiles: uploadedFilesCount,
        companies: companyCount,
        banks: bankCount,
        categories: categoryCount,
        schemas: schemaCount,
      },
      env: {
        nodeVersion: process.version,
        platform: process.platform,
        nextEnv: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    console.error("Diagnostics check failed:", error);
    return Response.json(
      {
        success: false,
        status: "Unhealthy",
        error: error?.message || "Failed to connect to the database",
        database: "Neon PostgreSQL",
        orm: "Prisma Client",
      },
      { status: 500 },
    );
  }
}
