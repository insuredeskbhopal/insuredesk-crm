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

    const actorName = user.name || user.email || "User";
    const primaryPolicy = policies.find((p) => p.id === policyId) || policies[0];

    // Atomic transaction: Update all policies & log activity together
    const { primaryReviewedData, primaryRemark } = await prisma.$transaction(async (tx) => {
      let firstReviewedData = null;
      let firstRemark = null;

      for (const pol of policies) {
        // Fetch fresh policy inside tx to ensure atomic append to true latest renewalRemarks
        const freshPol =
          (typeof tx.policyRecord.findUnique === "function"
            ? await tx.policyRecord.findUnique({
                where: { id: pol.id },
                select: { reviewedData: true, data: true, renewalStatus: true },
              })
            : null) || pol;

        const currentStatus = freshPol.renewalStatus || pol.renewalStatus || "ACTIVE";
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

        const reviewedData = appendRenewalRemark(freshPol.reviewedData || pol.reviewedData || {}, renewalRemark);
        const data = appendRenewalRemark(freshPol.data || pol.data || {}, renewalRemark);

        await tx.policyRecord.updateMany({
          where: {
            id: pol.id,
            ...tenantFilter,
          },
          data: {
            reviewedData,
            data,
            renewalStatus: followUpStatus || undefined,
            updatedById: actorId,
          },
        });

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
      remark: {
        ...primaryRemark,
        author: primaryRemark?.createdBy || actorName,
        remark: primaryRemark?.text || text,
      },
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

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get("policyId");
    const policyIdsParam = searchParams.get("policyIds");
    const targetPolicyIds = policyIdsParam
      ? policyIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : policyId
        ? [policyId]
        : [];

    if (!targetPolicyIds.length) {
      return Response.json({ remarks: [] });
    }

    const tenantFilter = getTenantFilter(user, "read");

    const policies = await prisma.policyRecord.findMany({
      where: {
        id: { in: targetPolicyIds },
        ...tenantFilter,
      },
      select: {
        id: true,
        data: true,
        reviewedData: true,
        renewalStatus: true,
        customerPortfolioId: true,
      },
    });

    if (!policies.length) {
      return Response.json({ remarks: [] });
    }

    const allRemarks = [];
    const seenRemarkIds = new Set();

    for (const pol of policies) {
      const pRem = [
        ...(Array.isArray(pol.reviewedData?.renewalRemarks) ? pol.reviewedData.renewalRemarks : []),
        ...(Array.isArray(pol.data?.renewalRemarks) ? pol.data.renewalRemarks : []),
      ];

      for (const r of pRem) {
        if (!r) continue;
        const key = r.id || `${r.createdAt}-${r.text || r.remark}`;
        if (seenRemarkIds.has(key)) continue;
        seenRemarkIds.add(key);

        const remarkText = String(r.text || r.remark || "").trim();
        if (!remarkText) continue;

        allRemarks.push({
          id: r.id || key,
          text: remarkText,
          remark: remarkText,
          author: r.createdBy || r.author || r.userName || "Agent",
          userName: r.createdBy || r.author || r.userName || "Agent",
          createdBy: r.createdBy || r.author || r.userName || "Agent",
          createdAt: r.createdAt || new Date().toISOString(),
          type: r.type || "FOLLOW_UP",
          oldStatus: r.oldStatus || "",
          newStatus: r.newStatus || "",
          nextFollowUpDate: r.nextFollowUpDate || "",
          followUpStatus: r.followUpStatus || "",
          followUpMode: r.followUpMode || "",
          priority: r.priority || "Normal",
          nextAction: r.nextAction || "",
          policyId: pol.id,
        });
      }
    }

    // Also include any ActivityLog records recorded for these policies
    try {
      const activities = await prisma.activityLog.findMany({
        where: {
          recordId: { in: targetPolicyIds },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      for (const act of activities) {
        const data = typeof act.newValue === "object" && act.newValue !== null ? act.newValue : {};
        const remarkText = String(act.description || data.remark || "").trim();
        if (!remarkText) continue;

        const isDuplicate = allRemarks.some(
          (existing) =>
            existing.text === remarkText &&
            Math.abs(new Date(existing.createdAt).getTime() - new Date(act.createdAt).getTime()) < 60000
        );

        if (!isDuplicate) {
          allRemarks.push({
            id: act.id,
            text: remarkText,
            remark: remarkText,
            author: data.assignedTo || (act.userRole ? `${act.userRole}` : "Agent"),
            userName: data.assignedTo || (act.userRole ? `${act.userRole}` : "Agent"),
            createdBy: data.assignedTo || (act.userRole ? `${act.userRole}` : "Agent"),
            createdAt: act.createdAt ? new Date(act.createdAt).toISOString() : new Date().toISOString(),
            type: act.action || "FOLLOW_UP",
            followUpStatus: data.outcome || "",
            followUpMode: data.followUpMode || (act.action === "WHATSAPP" ? "WhatsApp" : "Call"),
            nextFollowUpDate: data.followUpAt || "",
            priority: data.priority || "Normal",
            nextAction: data.nextAction || "",
            policyId: act.recordId || targetPolicyIds[0],
          });
        }
      }
    } catch (actErr) {
      console.warn("Could not query activity logs for remarks:", actErr.message);
    }

    // Sort newest first
    allRemarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return Response.json({ remarks: allRemarks });
  } catch (error) {
    console.error("GET renewal remarks failed:", error);
    return Response.json({ remarks: [] }, { status: 500 });
  }
}
