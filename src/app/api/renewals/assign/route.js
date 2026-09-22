import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { logActivity } from "@/lib/activities/activity-service";

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
    const {
      policyId,
      policyIds,
      portfolioId,
      phone,
      assignedToUserId,
      note,
      expectedUpdatedAt,
      expectedUpdatedAts,
    } = body;

    const targetPolicyIds = Array.isArray(policyIds) && policyIds.length > 0 ? policyIds : policyId ? [policyId] : [];

    if (!targetPolicyIds.length && !portfolioId && !phone) {
      return Response.json({ error: "Missing policy, portfolio, or phone parameter" }, { status: 400 });
    }
    if (!assignedToUserId) {
      return Response.json({ error: "Please select a user to assign." }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");
    const actorId = user.userId || user.id || null;
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const orgId = user.organizationId || null;

    // 1. Fetch matching policies with strict tenant isolation
    let targetPolicies = [];
    if (targetPolicyIds.length > 0) {
      targetPolicies = await prisma.policyRecord.findMany({
        where: {
          id: { in: targetPolicyIds },
          ...tenantFilter,
        },
      });

      if (targetPolicies.length !== targetPolicyIds.length) {
        return Response.json(
          { error: "One or more requested policies not found or access denied." },
          { status: 403 }
        );
      }
    } else if (portfolioId) {
      targetPolicies = await prisma.policyRecord.findMany({
        where: {
          customerPortfolioId: portfolioId,
          deletedAt: null,
          ...tenantFilter,
        },
      });
    } else if (phone) {
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
          ...tenantFilter,
          id: { in: matchedPolicyIds },
        },
      });
    }

    if (targetPolicies.length === 0) {
      return Response.json({ error: "No policies found or access denied" }, { status: 404 });
    }

    // 2. Safe Concurrency Check
    if (expectedUpdatedAts && typeof expectedUpdatedAts === "object") {
      const hasConflict = targetPolicies.some((p) => {
        const expStr = expectedUpdatedAts[p.id];
        if (!expStr || !p.updatedAt) return false;
        return new Date(p.updatedAt).getTime() > new Date(expStr).getTime();
      });
      if (hasConflict) {
        return Response.json(
          {
            error: "Conflict: One or more policies have been modified by another session. Please refresh to view latest changes.",
            conflict: true,
          },
          { status: 409 }
        );
      }
    } else if (expectedUpdatedAt) {
      const primaryPolicy = targetPolicies.find((p) => p.id === policyId) || targetPolicies[0];
      const expectedTime = new Date(expectedUpdatedAt).getTime();
      if (primaryPolicy?.updatedAt && new Date(primaryPolicy.updatedAt).getTime() > expectedTime) {
        return Response.json(
          {
            error: "Conflict: This record was modified by another session. Please refresh to view latest changes.",
            conflict: true,
          },
          { status: 409 }
        );
      }
    }

    // 3. Fetch the target assignee user within permitted tenant scope
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

    // 4. Process reassignments atomically with conditional OCC version checking
    await prisma.$transaction(async (tx) => {
      for (const policy of targetPolicies) {
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

        const expTimeStr =
          (expectedUpdatedAts && expectedUpdatedAts[policy.id]) ||
          (policy.id === policyId ? expectedUpdatedAt : null);
        const expTime = expTimeStr ? new Date(expTimeStr).getTime() : null;

        const updateResult = await tx.policyRecord.updateMany({
          where: {
            id: policy.id,
            ...tenantFilter,
            ...(expTimeStr ? { updatedAt: new Date(expTimeStr) } : {}),
          },
          data: {
            reviewedData,
            data,
            updatedById: actorId,
          },
        });

        if (updateResult.count === 0) {
          const conflictErr = new Error("OCC_CONFLICT");
          conflictErr.code = "OCC_CONFLICT";
          conflictErr.policyId = policy.id;
          throw conflictErr;
        }
      }

      // Log unified activity across all assigned policies inside transaction
      await logActivity({
        tx,
        organizationId: user.organizationId,
        userId: actorId,
        userRole: user.role,
        module: "RENEWAL",
        customerId: targetPolicies[0].customerPortfolioId || null,
        customerName: targetPolicies[0].insuredName || targetPolicies[0].data?.insuredName,
        policyIds: targetPolicies.map((p) => p.id),
        activityType: "ASSIGNMENT",
        outcome: `Assigned to ${assigneeLabel}`,
        remark: noteText || `Assigned to ${assigneeLabel}`,
        assignedTo: assigneeLabel,
        metadata: { assignedToUserId: assignee.id, assignedTo: assigneeLabel, note: noteText },
        ipAddress: getAuditMetadata(request).ipAddress,
      });
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "RENEWAL_REASSIGNED",
      entityType: "PolicyRecord",
      entityId: targetPolicies[0]?.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: {
        assignedToUserId: assignee.id,
        assignedTo: assigneeLabel,
        targetPolicyCount: targetPolicies.length,
      },
    });

    return Response.json({
      success: true,
      assignedTo: assigneeLabel,
      assignedToId: assignee.id,
      assignedDate,
    });
  } catch (error) {
    if (error.code === "OCC_CONFLICT") {
      return Response.json(
        {
          error: "Conflict: This record was modified by another session. Please refresh to view latest changes.",
          conflict: true,
          policyId: error.policyId,
        },
        { status: 409 }
      );
    }
    console.error("Renewal assign failed:", error);
    return Response.json({ error: "Failed to reassign." }, { status: 500 });
  }
}
