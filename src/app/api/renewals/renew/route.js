import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { normalizeRecord } from "@/lib/records";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { withRenewalCompanyDisplay } from "@/lib/renewals/companies";

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
    const actorId = user.userId || user.id;

    const { previousPolicyId, renewedData } = await request.json();
    if (!previousPolicyId) {
      return Response.json({ error: "Missing previousPolicyId" }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");

    // Retrieve previous policy to verify ownership
    const oldPolicy = await prisma.policyRecord.findFirst({
      where: {
        id: previousPolicyId,
        ...tenantFilter,
      },
    });

    if (!oldPolicy) {
      return Response.json({ error: "Previous policy not found or access denied" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const oldPolicyData = oldPolicy.data || {};
      const oldPolicyReviewedData = oldPolicy.reviewedData || {};
      if (renewedData?.remark) {
        const renewedRemark = {
          id: randomUUID(),
          text: String(renewedData.remark).trim(),
          createdAt: new Date().toISOString(),
          createdBy: user.name || user.email || "User",
          createdById: actorId || null,
          type: "RENEWED",
          oldStatus: oldPolicy.renewalStatus || "ACTIVE",
          newStatus: "RENEWED",
        };
        oldPolicyData.remark = renewedRemark.text;
        oldPolicyReviewedData.remark = renewedRemark.text;
        oldPolicyData.renewalRemarks = [
          renewedRemark,
          ...(Array.isArray(oldPolicyData.renewalRemarks) ? oldPolicyData.renewalRemarks : []),
        ];
        oldPolicyReviewedData.renewalRemarks = [
          renewedRemark,
          ...(Array.isArray(oldPolicyReviewedData.renewalRemarks)
            ? oldPolicyReviewedData.renewalRemarks
            : []),
        ];
      }

      return tx.policyRecord.update({
        where: { id: previousPolicyId },
        data: {
          renewalStatus: "RENEWED",
          isActivePolicy: false,
          renewalDate: new Date(),
          data: oldPolicyData,
          reviewedData: oldPolicyReviewedData,
          updatedById: actorId,
        },
      });
    });

    // Audit logs
    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "POLICY_RENEWED",
      entityType: "PolicyRecord",
      entityId: previousPolicyId,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { uploadRequired: true },
    });

    return Response.json(withRenewalCompanyDisplay(normalizeRecord(result)), { status: 201 });
  } catch (error) {
    console.error("Policy renewal failed:", error);
    return Response.json({ error: "Policy renewal failed. Please try again." }, { status: 500 });
  }
}
