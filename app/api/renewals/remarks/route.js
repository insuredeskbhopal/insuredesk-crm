import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";

export const runtime = "nodejs";

function appendRenewalRemark(payload = {}, remark) {
  const existing = Array.isArray(payload.renewalRemarks) ? payload.renewalRemarks : [];
  return {
    ...payload,
    remark: remark.text,
    renewalFollowUp: {
      nextFollowUpDate: remark.nextFollowUpDate || "",
      followUpStatus: remark.followUpStatus || "",
      followUpMode: remark.followUpMode || "",
      priority: remark.priority || "",
      nextAction: remark.nextAction || "",
      lastRemarkAt: remark.createdAt,
      lastRemarkBy: remark.createdBy
    },
    renewalRemarks: [remark, ...existing]
  };
}

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

    const { policyId, remark, nextFollowUpDate, followUpStatus, followUpMode, priority, nextAction } = await request.json();
    const text = String(remark || "").trim();
    if (!policyId) {
      return Response.json({ error: "Missing policyId parameter" }, { status: 400 });
    }
    if (!text) {
      return Response.json({ error: "Remark is required." }, { status: 400 });
    }
    if (nextFollowUpDate && Number.isNaN(new Date(nextFollowUpDate).getTime())) {
      return Response.json({ error: "Next follow-up date is invalid." }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");
    const actorId = user.userId || user.id || null;
    const policy = await prisma.policyRecord.findFirst({
      where: {
        id: policyId,
        ...tenantFilter
      }
    });

    if (!policy) {
      return Response.json({ error: "Policy not found or access denied" }, { status: 404 });
    }

    const actorName = user.name || user.email || "User";
    const currentStatus = policy.renewalStatus || "ACTIVE";
    const renewalRemark = {
      id: randomUUID(),
      text,
      createdAt: new Date().toISOString(),
      createdBy: actorName,
      createdById: actorId,
      type: "FOLLOW_UP",
      oldStatus: currentStatus,
      newStatus: currentStatus,
      nextFollowUpDate: String(nextFollowUpDate || "").trim(),
      followUpStatus: String(followUpStatus || "Follow-up Scheduled").trim(),
      followUpMode: String(followUpMode || "Phone Call").trim(),
      priority: String(priority || "Normal").trim(),
      nextAction: String(nextAction || "").trim()
    };

    const reviewedData = appendRenewalRemark(policy.reviewedData || {}, renewalRemark);
    const data = appendRenewalRemark(policy.data || {}, renewalRemark);

    await prisma.policyRecord.update({
      where: { id: policyId },
      data: {
        reviewedData,
        data,
        renewalStatus: followUpStatus || undefined,
        updatedById: actorId
      }
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "RENEWAL_REMARK_ADDED",
      entityType: "PolicyRecord",
      entityId: policyId,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { remarkId: renewalRemark.id, nextFollowUpDate, followUpStatus, followUpMode, priority, nextAction }
    });

    return Response.json({ success: true, remark: renewalRemark, followUp: reviewedData.renewalFollowUp });
  } catch (error) {
    console.error("Add renewal remark failed:", error);
    return Response.json({ error: "Failed to save renewal remark." }, { status: 500 });
  }
}
