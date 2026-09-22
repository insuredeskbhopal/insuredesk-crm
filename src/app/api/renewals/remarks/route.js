import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { logActivity } from "@/lib/activities/activity-service";

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
      lastRemarkBy: remark.createdBy,
    },
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

    const {
      policyId,
      policyIds,
      remark,
      nextFollowUpDate,
      followUpStatus,
      followUpMode,
      priority,
      nextAction,
      expectedUpdatedAt,
      expectedUpdatedAts,
    } = await request.json();
    const text = String(remark || "").trim();
    const targetPolicyIds = Array.isArray(policyIds) && policyIds.length > 0 ? policyIds : policyId ? [policyId] : [];
    if (!targetPolicyIds.length) {
      return Response.json({ error: "Missing policyId or policyIds parameter" }, { status: 400 });
    }
    if (!text) {
      return Response.json({ error: "Remark is required." }, { status: 400 });
    }
    if (nextFollowUpDate && Number.isNaN(new Date(nextFollowUpDate).getTime())) {
      return Response.json({ error: "Next follow-up date is invalid." }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");
    const actorId = user.userId || user.id || null;

    // Verify all target policy IDs belong to user's authorized scope
    const policies = await prisma.policyRecord.findMany({
      where: {
        id: { in: targetPolicyIds },
        ...tenantFilter,
      },
    });

    if (policies.length !== targetPolicyIds.length) {
      return Response.json(
        { error: "One or more policies not found or access denied." },
        { status: 403 }
      );
    }

    // Safe Concurrency Check: Verify independent version per policy
    if (expectedUpdatedAts && typeof expectedUpdatedAts === "object") {
      const hasConflict = policies.some((p) => {
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
      const primaryPolicyToCheck = policies.find((p) => p.id === policyId) || policies[0];
      const expectedTime = new Date(expectedUpdatedAt).getTime();
      if (primaryPolicyToCheck?.updatedAt && new Date(primaryPolicyToCheck.updatedAt).getTime() > expectedTime) {
        return Response.json(
          {
            error: "Conflict: This record has been updated by another user or session. Please refresh to view latest changes.",
            conflict: true,
          },
          { status: 409 }
        );
      }
    }

    const actorName = user.name || user.email || "User";
    const primaryPolicy = policies.find((p) => p.id === policyId) || policies[0];

    // Atomic transaction: Update all policies conditionally & log activity together
    const { primaryReviewedData, primaryRemark } = await prisma.$transaction(async (tx) => {
      let firstReviewedData = null;
      let firstRemark = null;

      for (const pol of policies) {
        const currentStatus = pol.renewalStatus || "ACTIVE";
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
          nextAction: String(nextAction || "").trim(),
        };

        const reviewedData = appendRenewalRemark(pol.reviewedData || {}, renewalRemark);
        const data = appendRenewalRemark(pol.data || {}, renewalRemark);

        const expTimeStr =
          (expectedUpdatedAts && expectedUpdatedAts[pol.id]) ||
          (pol.id === policyId ? expectedUpdatedAt : null);
        const expTime = expTimeStr ? new Date(expTimeStr).getTime() : null;

        const updateResult = await tx.policyRecord.updateMany({
          where: {
            id: pol.id,
            ...tenantFilter,
            ...(expTimeStr ? { updatedAt: new Date(expTimeStr) } : {}),
          },
          data: {
            reviewedData,
            data,
            renewalStatus: followUpStatus || undefined,
            updatedById: actorId,
          },
        });

        if (updateResult.count === 0) {
          const conflictErr = new Error("OCC_CONFLICT");
          conflictErr.code = "OCC_CONFLICT";
          conflictErr.policyId = pol.id;
          throw conflictErr;
        }

        if (pol.id === primaryPolicy.id) {
          firstReviewedData = reviewedData;
          firstRemark = renewalRemark;
        }
      }

      // Log unified activity across all target policies inside the transaction
      await logActivity({
        tx,
        organizationId: user.organizationId,
        userId: actorId,
        userRole: user.role,
        module: "RENEWAL",
        customerId: primaryPolicy.customerPortfolioId || null,
        customerName: primaryPolicy.insuredName || primaryPolicy.data?.insuredName,
        policyIds: targetPolicyIds,
        activityType: followUpMode === "WhatsApp" ? "WHATSAPP" : "CALL",
        outcome: followUpStatus || "Follow-up Scheduled",
        remark: text,
        followUpAt: nextFollowUpDate,
        assignedTo: primaryPolicy.assignedTo,
        metadata: { priority, nextAction, followUpMode },
        ipAddress: getAuditMetadata(request).ipAddress,
      });

      return {
        primaryReviewedData: firstReviewedData || appendRenewalRemark(primaryPolicy.reviewedData || {}, {}),
        primaryRemark: firstRemark,
      };
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "RENEWAL_REMARK_ADDED",
      entityType: "PolicyRecord",
      entityId: primaryPolicy.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: {
        remarkId: primaryRemark?.id,
        targetPolicyCount: targetPolicyIds.length,
        nextFollowUpDate,
        followUpStatus,
        followUpMode,
        priority,
        nextAction,
      },
    });

    return Response.json({
      success: true,
      remark: primaryRemark,
      followUp: primaryReviewedData?.renewalFollowUp,
    });
  } catch (error) {
    if (error.code === "OCC_CONFLICT") {
      return Response.json(
        {
          error: "Conflict: This record has been updated by another user or session. Please refresh to view latest changes.",
          conflict: true,
          policyId: error.policyId,
        },
        { status: 409 }
      );
    }
    console.error("Add renewal remark failed:", error);
    return Response.json({ error: "Failed to save renewal remark." }, { status: 500 });
  }
}
