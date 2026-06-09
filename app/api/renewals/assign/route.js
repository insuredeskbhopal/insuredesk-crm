import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";

export const runtime = "nodejs";

function appendAssignmentRemark(payload = {}, remark) {
  const existing = Array.isArray(payload.renewalRemarks) ? payload.renewalRemarks : [];
  return {
    ...payload,
    assignedTo: remark.assignedTo,
    assignedToId: remark.assignedToId || "",
    assignedDate: remark.assignedDate,
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

    const { policyId, assignedToUserId } = await request.json();
    if (!policyId) {
      return Response.json({ error: "Missing policyId parameter" }, { status: 400 });
    }
    if (!assignedToUserId) {
      return Response.json({ error: "Please select a user to assign." }, { status: 400 });
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

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const assignee = await prisma.user.findFirst({
      where: isSuperAdmin
        ? { id: assignedToUserId, role: { not: "VIEWER" } }
        : { id: assignedToUserId, organizationId: user.organizationId, role: { not: "VIEWER" } },
      select: { id: true, name: true, email: true }
    });

    if (!assignee) {
      return Response.json({ error: "Selected user not found in your organization." }, { status: 404 });
    }

    const assigneeLabel = assignee.name || assignee.email || "User";
    const previousPayload = policy.reviewedData || policy.data || {};
    const previousAssignee = previousPayload.assignedTo || "";
    const assignedDate = new Date().toISOString();
    const actorName = user.name || user.email || "User";

    const assignmentRemark = {
      id: randomUUID(),
      text: previousAssignee
        ? `Reassigned from ${previousAssignee} to ${assigneeLabel}.`
        : `Assigned to ${assigneeLabel}.`,
      createdAt: assignedDate,
      createdBy: actorName,
      createdById: actorId,
      type: "REASSIGNED",
      oldStatus: policy.renewalStatus || "ACTIVE",
      newStatus: policy.renewalStatus || "ACTIVE",
      assignedTo: assigneeLabel,
      assignedToId: assignee.id
    };

    const reviewedData = appendAssignmentRemark(policy.reviewedData || {}, {
      ...assignmentRemark,
      assignedDate
    });
    const data = appendAssignmentRemark(policy.data || {}, {
      ...assignmentRemark,
      assignedDate
    });

    await prisma.policyRecord.update({
      where: { id: policyId },
      data: {
        reviewedData,
        data,
        updatedById: actorId
      }
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "RENEWAL_REASSIGNED",
      entityType: "PolicyRecord",
      entityId: policyId,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { assignedToUserId: assignee.id, assignedTo: assigneeLabel }
    });

    return Response.json({
      success: true,
      assignedTo: assigneeLabel,
      assignedToId: assignee.id,
      assignedDate,
      remark: assignmentRemark
    });
  } catch (error) {
    console.error("Renewal assign failed:", error);
    return Response.json({ error: "Failed to reassign policy." }, { status: 500 });
  }
}
