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
    renewalRemarks: [remark, ...existing],
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

    const body = await request.json();
    const { policyId, phone, assignedToUserId, note } = body;

    if (!policyId && !phone) {
      return Response.json({ error: "Missing policyId or phone parameter" }, { status: 400 });
    }
    if (!assignedToUserId) {
      return Response.json({ error: "Please select a user to assign." }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");
    const actorId = user.userId || user.id || null;
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    // 1. Fetch matching policies (either single policy or customer policies by phone)
    let targetPolicies = [];
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
      if (!phone.startsWith("NO-MOBILE-") && cleanPhone.length !== 10) {
        return Response.json({ error: "A valid 10-digit phone number is required." }, { status: 400 });
      }
      const matchedPolicyIds = phone.startsWith("NO-MOBILE-")
        ? [phone.replace("NO-MOBILE-", "")]
        : (
            await prisma.$queryRawUnsafe(
              `
                SELECT id
                FROM pdf_records
                WHERE deleted_at IS NULL
                  AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
                  AND RIGHT(regexp_replace(COALESCE(
                    reviewed_data->>'contactNumber',
                    reviewed_data->>'customerMobile',
                    reviewed_data->>'mobileNumber',
                    reviewed_data->>'phone',
                    data->>'contactNumber',
                    data->>'customerMobile',
                    data->>'mobileNumber',
                    data->>'phone',
                    ''
                  ), '[^0-9]', '', 'g'), 10) = $3
              `,
              isSuperAdmin,
              orgId,
              cleanPhone,
            )
          ).map((row) => row.id);
      targetPolicies = await prisma.policyRecord.findMany({
        where: {
          deletedAt: null,
          ...(isSuperAdmin ? {} : { organizationId: orgId }),
          id: { in: matchedPolicyIds },
        },
      });
    } else {
      const singlePolicy = await prisma.policyRecord.findFirst({
        where: {
          id: policyId,
          ...tenantFilter,
        },
      });
      if (singlePolicy) {
        targetPolicies = [singlePolicy];
      }
    }

    if (targetPolicies.length === 0) {
      return Response.json({ error: "No policies found or access denied" }, { status: 404 });
    }

    // 2. Fetch the target assignee user
    const assignee = await prisma.user.findFirst({
      where: isSuperAdmin
        ? { id: assignedToUserId, role: { not: "VIEWER" } }
        : { id: assignedToUserId, organizationId: user.organizationId, role: { not: "VIEWER" } },
      select: { id: true, name: true, email: true },
    });

    if (!assignee) {
      return Response.json({ error: "Selected user not found in your organization." }, { status: 404 });
    }

    const assigneeLabel = assignee.name || assignee.email || "User";
    const assignedDate = new Date().toISOString();
    const actorName = user.name || user.email || "User";
    const noteText = String(note || "").trim();

    // 3. Process reassignments
    const updates = targetPolicies.map(async (policy) => {
      const previousPayload = policy.reviewedData || policy.data || {};
      const previousAssignee = previousPayload.assignedTo || "";

      let remarkText = previousAssignee
        ? `Reassigned from ${previousAssignee} to ${assigneeLabel}.`
        : `Assigned to ${assigneeLabel}.`;
      if (noteText) {
        remarkText = `${remarkText} ${noteText}`;
      }

      const assignmentRemark = {
        id: randomUUID(),
        text: remarkText,
        createdAt: assignedDate,
        createdBy: actorName,
        createdById: actorId,
        type: "REASSIGNED",
        oldStatus: policy.renewalStatus || "ACTIVE",
        newStatus: policy.renewalStatus || "ACTIVE",
        assignedTo: assigneeLabel,
        assignedToId: assignee.id,
      };

      const reviewedData = appendAssignmentRemark(policy.reviewedData || {}, {
        ...assignmentRemark,
        assignedDate,
      });
      const data = appendAssignmentRemark(policy.data || {}, {
        ...assignmentRemark,
        assignedDate,
      });

      await prisma.policyRecord.update({
        where: { id: policy.id },
        data: {
          reviewedData,
          data,
          updatedById: actorId,
        },
      });

      const { ipAddress, userAgent } = getAuditMetadata(request);
      await logAudit({
        action: "RENEWAL_REASSIGNED",
        entityType: "PolicyRecord",
        entityId: policy.id,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: actorId,
        organizationId: user.organizationId,
        metadata: { assignedToUserId: assignee.id, assignedTo: assigneeLabel },
      });
    });

    await Promise.all(updates);

    return Response.json({
      success: true,
      assignedTo: assigneeLabel,
      assignedToId: assignee.id,
      assignedDate,
    });
  } catch (error) {
    console.error("Renewal assign failed:", error);
    return Response.json({ error: "Failed to reassign." }, { status: 500 });
  }
}
