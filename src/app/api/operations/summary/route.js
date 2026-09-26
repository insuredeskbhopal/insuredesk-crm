import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getCustomerProfileScopedFilter, getTenantFilter } from "@/lib/auth/rbac";
import { normalizeRecord } from "@/lib/records";
import { withoutManualRenewalSources } from "@/lib/records/manual-renewal-source";

export const runtime = "nodejs";

const OPERATIONS_SUMMARY_TTL_MS = 30 * 1000; // 30 seconds
const operationsSummaryCache = globalThis.__operationsSummaryCache || new Map();
globalThis.__operationsSummaryCache = operationsSummaryCache;

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const session = await verifyJWT(token);
    if (!session) return Response.json({ error: "Invalid or expired session" }, { status: 401 });

    const cacheKey = `${session.role}-${session.organizationId || "all"}`;
    const cached = operationsSummaryCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < OPERATIONS_SUMMARY_TTL_MS) {
      return Response.json(cached.data);
    }

    const profileWhere = { ...getCustomerProfileScopedFilter(session), deletedAt: null };
    const policyWhere = withoutManualRenewalSources({ ...getTenantFilter(session, "read"), deletedAt: null });

    const isViewer = session.role === "VIEWER";
    const birthdayWhere = isViewer
      ? null
      : { ...getTenantFilter(session, "read"), dob: { not: null }, deletedAt: null };

    const [profileTotal, profileCounts, latestProfile, birthdayProfiles, latestBirthday, policyTotal, latestPolicyRaw] = await Promise.all([
      prisma.leadGeneration.count({ where: profileWhere }),
      prisma.leadGeneration.groupBy({
        by: ["status"],
        where: profileWhere,
        _count: { id: true },
      }),
      prisma.leadGeneration.findFirst({
        where: profileWhere,
        orderBy: { updatedAt: "desc" },
        select: { name: true, phone: true, createdAt: true, updatedAt: true },
      }),
      birthdayWhere ? prisma.customerProfile.count({ where: birthdayWhere }) : Promise.resolve(0),
      birthdayWhere
        ? prisma.customerProfile.findFirst({
            where: birthdayWhere,
            orderBy: { updatedAt: "desc" },
            select: { name: true, phone: true, createdAt: true, updatedAt: true },
          })
        : Promise.resolve(null),
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

    const responsePayload = {
      success: true,
      summary: {
        customerProfiles: profileTotal,
        birthdayProfiles,
        latestBirthday: latestBirthday
          ? {
              name: latestBirthday.name || "",
              phone: latestBirthday.phone || "",
              updatedAt: latestBirthday.updatedAt || latestBirthday.createdAt,
            }
          : null,
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
    };
    operationsSummaryCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });
    return Response.json(responsePayload);
  } catch (error) {
    console.error("Operations summary failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Operations summary could not be loaded." }, { status: 500 });
  }
}
