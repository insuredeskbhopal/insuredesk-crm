import { prisma } from "@/lib/db/prisma";

/**
 * Shared Activity / Interaction Logging Service
 * Provides a unified interaction timeline across Renewals, Claims, WhatsApp, Calls, and Profiling.
 * Uses the existing additive ActivityLog model in Prisma.
 */

export const ACTIVITY_TYPES = {
  CALL: "CALL",
  REMARK: "REMARK",
  WHATSAPP: "WHATSAPP",
  FOLLOW_UP: "FOLLOW_UP",
  RENEWAL: "RENEWAL",
  CLAIM: "CLAIM",
  ASSIGNMENT: "ASSIGNMENT",
  STATUS_CHANGE: "STATUS_CHANGE",
};

export async function logActivity({
  tx = null,
  organizationId = null,
  userId = null,
  userRole = null,
  module = "RENEWAL", // "RENEWAL" | "CUSTOMER" | "CLAIM" | "POLICY"
  customerId = null,
  customerName = null,
  policyIds = [],
  claimId = null,
  activityType = ACTIVITY_TYPES.REMARK,
  outcome = "",
  remark = "",
  followUpAt = null,
  assignedTo = null,
  metadata = {},
  ipAddress = null,
}) {
  try {
    const activityPayload = {
      customerId,
      customerName,
      policyIds: Array.isArray(policyIds) ? policyIds : policyIds ? [policyIds] : [],
      claimId,
      activityType,
      outcome,
      followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null,
      assignedTo,
      ...metadata,
    };

    const db = tx || prisma;
    const record = await db.activityLog.create({
      data: {
        organizationId,
        userId,
        userRole,
        module,
        recordId: customerId || policyIds[0] || claimId || "GLOBAL",
        recordLabel: customerName || (policyIds.length ? `${policyIds.length} policies` : "Interaction"),
        action: activityType,
        description: remark || outcome || activityType,
        newValue: activityPayload,
        ipAddress,
      },
    });

    return record;
  } catch (error) {
    console.error("Failed to log activity:", error);
    return null;
  }
}

export async function getActivitiesForEntity({
  customerId = null,
  policyId = null,
  claimId = null,
  limit = 40,
}) {
  try {
    const whereConditions = [];

    if (customerId) {
      whereConditions.push({ recordId: customerId });
      whereConditions.push({ newValue: { path: ["customerId"], equals: customerId } });
    }

    if (policyId) {
      whereConditions.push({ recordId: policyId });
      whereConditions.push({ newValue: { path: ["policyIds"], array_contains: policyId } });
    }

    if (claimId) {
      whereConditions.push({ recordId: claimId });
      whereConditions.push({ newValue: { path: ["claimId"], equals: claimId } });
    }

    if (!whereConditions.length) return [];

    const activities = await prisma.activityLog.findMany({
      where: {
        OR: whereConditions,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return activities.map((act) => {
      const data = typeof act.newValue === "object" && act.newValue !== null ? act.newValue : {};
      return {
        id: act.id,
        activityType: act.action,
        remark: act.description,
        outcome: data.outcome || "",
        customerId: data.customerId || null,
        customerName: data.customerName || act.recordLabel,
        policyIds: data.policyIds || [],
        claimId: data.claimId || null,
        followUpAt: data.followUpAt || null,
        assignedTo: data.assignedTo || null,
        createdAt: act.createdAt,
        createdBy: act.userRole ? `${act.userRole} (${act.userId || "System"})` : "Staff",
        metadata: data,
      };
    });
  } catch (error) {
    console.error("Failed to retrieve activities:", error);
    return [];
  }
}
