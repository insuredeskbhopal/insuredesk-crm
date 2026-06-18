import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { randomUUID } from "crypto";

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

    const { policyId, lostReason, remarks, renewalStatus } = await request.json();
    if (!policyId) {
      return Response.json({ error: "Missing policyId parameter" }, { status: 400 });
    }
    if (!lostReason && !renewalStatus) {
      return Response.json({ error: "Lost reason is required." }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");
    const actorId = user.userId || user.id || null;

    const policy = await prisma.policyRecord.findFirst({
      where: {
        id: policyId,
        ...tenantFilter,
      },
    });

    if (!policy) {
      return Response.json({ error: "Policy not found or access denied" }, { status: 404 });
    }

    const existingReviewedData = policy.reviewedData || {};
    const existingData = policy.data || {};
    const previousStatus = policy.renewalStatus || "ACTIVE";
    const status = normalizeLostRenewalStatus(renewalStatus || lostReason);
    const remarkText = String(remarks || lostReason || "").trim();
    if (remarkText) {
      const renewalRemark = {
        id: randomUUID(),
        text: remarkText,
        createdAt: new Date().toISOString(),
        createdBy: user.name || user.email || "User",
        createdById: actorId,
        type: status,
        oldStatus: previousStatus,
        newStatus: status,
        lostReason: lostReason || "",
      };
      existingReviewedData.remark = remarkText;
      existingData.remark = remarkText;
      existingReviewedData.renewalRemarks = [
        renewalRemark,
        ...(Array.isArray(existingReviewedData.renewalRemarks) ? existingReviewedData.renewalRemarks : []),
      ];
      existingData.renewalRemarks = [
        renewalRemark,
        ...(Array.isArray(existingData.renewalRemarks) ? existingData.renewalRemarks : []),
      ];
    }

    const updatedPolicy = await prisma.policyRecord.update({
      where: { id: policyId },
      data: {
        renewalStatus: status,
        isActivePolicy: false,
        lostReason: lostReason || "",
        renewalDate: new Date(),
        reviewedData: existingReviewedData,
        data: existingData,
        updatedById: actorId,
      },
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
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { lostReason, remarks, renewalStatus: status },
    });

    return Response.json({ success: true, policy: updatedPolicy });
  } catch (error) {
    console.error("Mark policy lost failed:", error);
    return Response.json({ error: "Failed to mark policy as lost." }, { status: 500 });
  }
}

function normalizeLostRenewalStatus(value = "") {
  const text = String(value || "").toLowerCase();
  if (/wrong\s*number/.test(text)) return "WRONG_NUMBER";
  if (/renewed\s*elsewhere|direct/.test(text)) return "RENEWED_ELSEWHERE";
  if (/not\s*interested/.test(text)) return "NOT_INTERESTED";
  return "LOST";
}
