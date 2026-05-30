import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user || user.role === "VIEWER") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { policyId, lostReason, remarks } = await request.json();
    if (!policyId) {
      return Response.json({ error: "Missing policyId parameter" }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");

    const policy = await prisma.policyRecord.findFirst({
      where: {
        id: policyId,
        ...tenantFilter
      }
    });

    if (!policy) {
      return Response.json({ error: "Policy not found or access denied" }, { status: 404 });
    }

    // Merge remarks into data and reviewedData JSON payloads if provided
    const existingReviewedData = policy.reviewedData || {};
    const existingData = policy.data || {};
    if (remarks) {
      existingReviewedData.remark = remarks;
      existingData.remark = remarks;
    }

    const updatedPolicy = await prisma.policyRecord.update({
      where: { id: policyId },
      data: {
        renewalStatus: "LOST",
        isActivePolicy: false,
        lostReason: lostReason || "",
        renewalDate: new Date(),
        reviewedData: existingReviewedData,
        data: existingData
      }
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "POLICY_MARK_LOST",
      entityType: "PolicyRecord",
      entityId: policyId,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: user.userId || user.id,
      organizationId: user.organizationId,
      metadata: { lostReason, remarks }
    });

    return Response.json({ success: true, policy: updatedPolicy });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
