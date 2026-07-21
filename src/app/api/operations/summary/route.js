import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getCustomerProfileScopedFilter, getTenantFilter } from "@/lib/auth/rbac";
import { normalizeRecord } from "@/lib/records";
import { withoutManualRenewalSources } from "@/lib/records/manual-renewal-source";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const session = await verifyJWT(token);
    if (!session) return Response.json({ error: "Invalid or expired session" }, { status: 401 });

    const profileWhere = { ...getCustomerProfileScopedFilter(session), deletedAt: null };
    const policyWhere = withoutManualRenewalSources({ ...getTenantFilter(session, "read"), deletedAt: null });

    const [profileTotal, profileCounts, latestProfile, policyTotal, latestPolicyRaw] = await Promise.all([
      prisma.customerProfile.count({ where: profileWhere }),
      prisma.customerProfile.groupBy({
        by: ["status"],
        where: profileWhere,
        _count: { id: true },
      }),
      prisma.customerProfile.findFirst({
        where: profileWhere,
        orderBy: { updatedAt: "desc" },
        select: { name: true, phone: true, createdAt: true, updatedAt: true },
      }),
      prisma.policyRecord.count({ where: policyWhere }),
      prisma.policyRecord.findFirst({
        where: policyWhere,
        orderBy: { savedAt: "desc" },
        select: {
          id: true,
          savedAt: true,
          createdAt: true,
          data: true,
          reviewedData: true,
          selectedCompany: true,
          selectedPolicyType: true,
        },
      }),
    ]);

    const counter = (status) =>
      profileCounts.find((item) => item.status === status)?._count?.id || 0;
    const latestPolicy = latestPolicyRaw ? normalizeRecord(latestPolicyRaw) : null;

    return Response.json({
      success: true,
      summary: {
        customerProfiles: profileTotal,
        policyRecords: policyTotal,
        openActivities: counter("Follow-up Required") + counter("New Lead"),
        latestProfile: latestProfile
          ? {
              name: latestProfile.name || "",
              phone: latestProfile.phone || "",
              updatedAt: latestProfile.updatedAt || latestProfile.createdAt,
            }
          : null,
        latestPolicy: latestPolicy
          ? {
              insuredName: latestPolicy.insuredName || "",
              policyNumber: latestPolicy.policyNumber || "",
              savedAt: latestPolicy.savedAt || latestPolicy.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Operations summary failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Operations summary could not be loaded." }, { status: 500 });
  }
}
