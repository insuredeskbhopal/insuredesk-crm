import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { logActivity } from "@/lib/activities/activity-service";
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

    const {
      policyId,
      policyIds,
      lostReason,
      remarks,
      renewalStatus,
      expectedUpdatedAt,
      expectedUpdatedAts,
    } = await request.json();

    const targetPolicyIds = Array.isArray(policyIds) && policyIds.length > 0 ? policyIds : policyId ? [policyId] : [];
    if (!targetPolicyIds.length) {
      return Response.json({ error: "Missing policyId or policyIds parameter" }, { status: 400 });
    }
    if (!lostReason && !renewalStatus) {
      return Response.json({ error: "Lost reason is required." }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");
    const actorId = user.userId || user.id || null;

    // 1. Strict Tenant Authorization: verify ALL target policies exist and belong to tenant scope
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

    // 2. Safe Concurrency Check
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
      const primaryPolicy = policies.find((p) => p.id === policyId) || policies[0];
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

    const status = normalizeLostRenewalStatus(renewalStatus || lostReason);
    const remarkText = String(remarks || lostReason || "").trim();
    const primaryPolicy = policies.find((p) => p.id === policyId) || policies[0];

    // 3. Atomic Database Mutation with OCC conditional updates
    const updatedPolicies = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const policy of policies) {
        const existingReviewedData = { ...(policy.reviewedData || {}) };
        const existingData = { ...(policy.data || {}) };
        const previousStatus = policy.renewalStatus || "ACTIVE";

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
            renewalStatus: status,
            isActivePolicy: false,
            lostReason: lostReason || "",
            renewalDate: new Date(),
            reviewedData: existingReviewedData,
            data: existingData,
            updatedById: actorId,
          },
        });

        if (updateResult.count === 0) {
          const conflictErr = new Error("OCC_CONFLICT");
          conflictErr.code = "OCC_CONFLICT";
          conflictErr.policyId = policy.id;
          throw conflictErr;
        }

        results.push({ id: policy.id, status });
      }

      await logActivity({
        tx,
        organizationId: user.organizationId,
        userId: actorId,
        userRole: user.role,
        module: "RENEWAL",
        customerId: primaryPolicy.customerPortfolioId || null,
        customerName: primaryPolicy.insuredName || primaryPolicy.data?.insuredName,
        policyIds: targetPolicyIds,
        activityType: "STATUS_CHANGE",
        outcome: status,
        remark: remarkText || `Marked as ${status}`,
        metadata: { lostReason, remarks, targetPolicyCount: targetPolicyIds.length },
      });

      return results;
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "POLICY_MARK_LOST",
      entityType: "PolicyRecord",
      entityId: primaryPolicy.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { lostReason, remarks, renewalStatus: status, targetPolicyCount: targetPolicyIds.length },
    });

    return Response.json({ success: true, updatedCount: updatedPolicies.length, policy: primaryPolicy });
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
    console.error("Mark policy lost failed:", error);
    return Response.json({ error: "Failed to mark policy as lost." }, { status: 500 });
  }
}

function normalizeLostRenewalStatus(value = "") {
  const text = String(value || "").toLowerCase();
  if (/wrong[\s_]*number/.test(text)) return "WRONG_NUMBER";
  if (/renewed[\s_]*elsewhere|direct/.test(text)) return "RENEWED_ELSEWHERE";
  if (/not[\s_]*interested/.test(text)) return "NOT_INTERESTED";
  return "LOST";
}
