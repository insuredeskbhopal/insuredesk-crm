import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Test database connection and calculate latency
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    // Retrieve stats
    const [policyRecordsCount, uploadedFilesCount, companyCount, bankCount, categoryCount, schemaCount] = await Promise.all([
      prisma.policyRecord.count(),
      prisma.uploadedFile.count(),
      prisma.insuranceCompany.count(),
      prisma.bankSource.count(),
      prisma.serviceCategory.count(),
      prisma.policySchema.count()
    ]);

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
        schemas: schemaCount
      },
      env: {
        nodeVersion: process.version,
        platform: process.platform,
        nextEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error("Diagnostics check failed:", error);
    return Response.json({
      success: false,
      status: "Unhealthy",
      error: error?.message || "Failed to connect to the database",
      database: "Neon PostgreSQL",
      orm: "Prisma Client"
    }, { status: 500 });
  }
}
