import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { normalizeRecord } from "@/lib/records";
import { withRenewalPolicyDisplay } from "@/lib/policies/type-display";
import { startOfDay } from "@/app/lib/reporting/filters";
import {
  RENEWAL_WORK_ACTIONS,
  getRenewalActionLabel,
  buildTodayWorkSummary
} from "@/lib/renewals/today-work";

export const dynamic = "force-dynamic";

function getActivityDetail(action, metadata = {}, remark = "") {
  if (action === "POLICY_MARK_LOST") {
    return metadata.lostReason || metadata.remarks || remark || "";
  }
  if (action === "RENEWAL_REASSIGNED") {
    return metadata.assignedTo ? `Assigned to ${metadata.assignedTo}` : remark;
  }
  if (action === "RENEWAL_REMARK_ADDED") {
    return metadata.nextFollowUpDate
      ? `${remark}${remark ? " · " : ""}Next follow-up: ${metadata.nextFollowUpDate}`
      : remark;
  }
  if (action === "POLICY_RENEWED") {
    return remark || "Policy renewed successfully.";
  }
  if (action === "WHATSAPP_REMINDER_SENT") {
    return "WhatsApp reminder link generated.";
  }
  return remark || "";
}

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const actorId = user.userId || user.id || null;
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId") || actorId;
    const canViewOthers = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role || "");

    if (!requestedUserId) {
      return Response.json({ error: "User session is invalid." }, { status: 400 });
    }

    if (requestedUserId !== actorId && !canViewOthers) {
      return Response.json({ error: "You can only view your own today's work." }, { status: 403 });
    }

    const start = startOfDay(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const orgFilter = user.role === "SUPER_ADMIN" && !user.organizationId
      ? {}
      : { organizationId: user.organizationId };

    if (requestedUserId !== actorId && canViewOthers) {
      const targetUser = await prisma.user.findFirst({
        where: {
          id: requestedUserId,
          deletedAt: null,
          ...(user.role === "SUPER_ADMIN" ? {} : { organizationId: user.organizationId })
        },
        select: { id: true, name: true, email: true }
      });
      if (!targetUser) {
        return Response.json({ error: "Selected user not found." }, { status: 404 });
      }
    }

    const auditWhere = {
      userId: requestedUserId,
      entityType: "PolicyRecord",
      action: { in: RENEWAL_WORK_ACTIONS },
      createdAt: { gte: start, lt: end },
      ...orgFilter
    };

    const [auditRows, targetUser] = await Promise.all([
      prisma.auditLog.findMany({
        where: auditWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          entityId: true,
          createdAt: true,
          metadata: true,
          userId: true,
          user: { select: { name: true, email: true } }
        }
      }),
      prisma.user.findFirst({
        where: { id: requestedUserId },
        select: { id: true, name: true, email: true }
      })
    ]);

    const tenantFilter = getTenantFilter(user, "read");
    const updatedPolicies = await prisma.policyRecord.findMany({
      where: {
        ...tenantFilter,
        updatedById: requestedUserId,
        updatedAt: { gte: start, lt: end },
        deletedAt: null
      },
      select: {
        id: true,
        data: true,
        reviewedData: true,
        renewalStatus: true,
        updatedAt: true,
        updatedBy: { select: { name: true, email: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    const policyIds = new Set();
    auditRows.forEach((row) => {
      if (row.entityId) policyIds.add(row.entityId);
    });
    updatedPolicies.forEach((row) => policyIds.add(row.id));

    const policyMap = {};
    if (policyIds.size > 0) {
      const records = await prisma.policyRecord.findMany({
        where: {
          id: { in: Array.from(policyIds) },
          ...tenantFilter
        },
        select: {
          id: true,
          data: true,
          reviewedData: true,
          renewalStatus: true,
          updatedAt: true,
          updatedBy: { select: { name: true, email: true } }
        }
      });
      records.forEach((record) => {
        policyMap[record.id] = withRenewalPolicyDisplay(normalizeRecord(record));
      });
    }

    const seenKeys = new Set();
    const activities = [];

    for (const row of auditRows) {
      if (!row.entityId) continue;
      const key = `${row.entityId}:${row.action}:${row.createdAt?.toISOString?.() || row.createdAt}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const policy = policyMap[row.entityId] || {};
      const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
      activities.push({
        id: row.id,
        time: row.createdAt,
        action: row.action,
        actionLabel: getRenewalActionLabel(row.action),
        policyId: row.entityId,
        customerName: policy.insuredName || "-",
        policyNumber: policy.policyNumber || "-",
        mobile: policy.contactNumber || "-",
        company: policy.insuranceCompany || "-",
        policyType: policy.displayPolicyType || policy.policyType || "-",
        expiryDate: policy.expiryDate || "-",
        renewalStatus: policy.renewalStatus || "ACTIVE",
        detail: getActivityDetail(row.action, metadata, policy.latestRemark || ""),
        userName: row.user?.name || row.user?.email || targetUser?.name || targetUser?.email || "User"
      });
    }

    for (const record of updatedPolicies) {
      const policy = policyMap[record.id];
      if (!policy) continue;
      const hasAudit = auditRows.some((row) => row.entityId === record.id);
      if (hasAudit) continue;

      const key = `${record.id}:RENEWAL_UPDATED:${record.updatedAt?.toISOString?.() || record.updatedAt}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      activities.push({
        id: key,
        time: record.updatedAt,
        action: "RENEWAL_UPDATED",
        actionLabel: getRenewalActionLabel("RENEWAL_UPDATED"),
        policyId: record.id,
        customerName: policy.insuredName || "-",
        policyNumber: policy.policyNumber || "-",
        mobile: policy.contactNumber || "-",
        company: policy.insuranceCompany || "-",
        policyType: policy.displayPolicyType || policy.policyType || "-",
        expiryDate: policy.expiryDate || "-",
        renewalStatus: policy.renewalStatus || "ACTIVE",
        detail: policy.latestRemark || "",
        userName: record.updatedBy?.name || record.updatedBy?.email || targetUser?.name || targetUser?.email || "User"
      });
    }

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const reportDate = start.toISOString().slice(0, 10);
    return Response.json({
      reportDate,
      user: {
        id: requestedUserId,
        name: targetUser?.name || targetUser?.email || "User",
        email: targetUser?.email || ""
      },
      summary: buildTodayWorkSummary(activities),
      activities
    });
  } catch (error) {
    console.error("Renewal today work fetch failed:", error);
    return Response.json({ error: "Failed to load today's renewal work." }, { status: 500 });
  }
}
