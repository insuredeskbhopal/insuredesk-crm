import { prisma } from "@/lib/db/prisma";
import { getCustomerProfileScopedFilter, getTenantFilter } from "@/lib/auth/rbac";
import { sendFollowUpReminderEmail } from "@/lib/email/mailer";
import { withoutManualRenewalSources } from "@/lib/records/manual-renewal-source";

const OPEN_TASK_STATUSES = [
  "DRAFT",
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_INSURANCE_COMPANY",
  "WAITING_DOCUMENTS",
  "ESCALATED",
];

const RENEWAL_INTERVALS = [60, 45, 30, 15, 7, 3, 0];
const REMINDER_OFFSETS = [7, 3, 1, 0];
const SYNC_TTL_MS = 60_000;
const DB_FRESHNESS_MS = 5 * 60_000;
const MAX_SYNC_ROWS = 30;
const CLOSED_RENEWAL_STATUSES = ["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"];

function getSyncCache() {
  if (!globalThis.__bimaOperationsSyncCache) {
    globalThis.__bimaOperationsSyncCache = new Map();
  }
  return globalThis.__bimaOperationsSyncCache;
}

export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function parseBusinessDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (iso) {
    const timePart = iso[4] && iso[5] ? `${iso[4]}:${iso[5]}:00` : "09:00:00";
    const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T${timePart}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const indian = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (indian) {
    const year = indian[3].length === 2 ? `20${indian[3]}` : indian[3];
    const date = new Date(Number(year), Number(indian[2]) - 1, Number(indian[1]), 9, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function formatBusinessDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.max(Math.floor(diffMs / 1000), 0);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export async function syncOperationsCenter(session) {
  const cache = getSyncCache();
  const cacheKey = `${session.organizationId || "global"}:${session.userId || session.id || "system"}`;
  const lastSync = cache.get(cacheKey);
  if (lastSync && Date.now() - lastSync < SYNC_TTL_MS) return;

  const tenantFilter = getTenantFilter(session, "read");
  const operationsTenantWhere = buildOperationsTenantWhere(session);
  const latestTask = await prisma.task.findFirst({
    where: operationsTenantWhere,
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  if (latestTask && Date.now() - latestTask.updatedAt.getTime() < DB_FRESHNESS_MS) {
    cache.set(cacheKey, Date.now());
    return;
  }

  const orgId = session.role === "SUPER_ADMIN" ? session.organizationId || null : session.organizationId;
  const actorId = session.userId || session.id || null;

  const [policies, claims, endorsements, customerProfiles, uploads] = await Promise.all([
    prisma.policyRecord.findMany({
      where: withoutManualRenewalSources({ ...tenantFilter, deletedAt: null, isActivePolicy: true }),
      orderBy: { updatedAt: "desc" },
      take: MAX_SYNC_ROWS,
      select: {
        id: true,
        data: true,
        reviewedData: true,
        selectedCompany: true,
        selectedPolicyType: true,
        renewalStatus: true,
        organizationId: true,
        createdById: true,
        updatedById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.claim.findMany({
      where: { ...tenantFilter, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: MAX_SYNC_ROWS,
      select: {
        id: true,
        claimNo: true,
        insuredName: true,
        mobileNo: true,
        policyNo: true,
        claimStatus: true,
        followUpDate: true,
        currentRemark: true,
        organizationId: true,
        createdById: true,
        updatedById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.endorsement.findMany({
      where: { ...tenantFilter, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: MAX_SYNC_ROWS,
      select: {
        id: true,
        endorsementNo: true,
        endorsementType: true,
        insuredName: true,
        customerName: true,
        policyNo: true,
        status: true,
        organizationId: true,
        createdById: true,
        updatedById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.customerProfile.findMany({
      where: getCustomerProfileScopedFilter(session),
      orderBy: { updatedAt: "desc" },
      take: MAX_SYNC_ROWS,
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        nextFollowUpDate: true,
        followUpDate: true,
        followUpRemark: true,
        organizationId: true,
        createdById: true,
        updatedById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.uploadedFile.findMany({
      where: tenantFilter,
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        sourceFile: true,
        status: true,
        errorMessage: true,
        organizationId: true,
        createdById: true,
        createdAt: true,
      },
    }),
  ]);

  for (const policy of policies) {
    await syncPolicyRenewal(policy, actorId);
    await syncPolicyFollowUp(policy, actorId);
  }
  for (const claim of claims) {
    await syncClaimWork(claim, actorId);
  }
  for (const endorsement of endorsements) {
    await syncEndorsementWork(endorsement, actorId);
  }
  for (const profile of customerProfiles) {
    await syncCustomerProfileWork(profile, actorId);
  }
  for (const upload of uploads) {
    await upsertNotification({
      organizationId: upload.organizationId || orgId,
      userId: null,
      createdById: upload.createdById || actorId,
      category: "SYSTEM",
      severity: upload.status === "FAILED" ? "WARNING" : upload.status === "APPROVED" ? "SUCCESS" : "INFO",
      title: upload.status === "FAILED" ? "Upload failed" : "Upload processed",
      message:
        upload.status === "FAILED"
          ? `${upload.sourceFile} failed: ${upload.errorMessage || "Unknown error"}`
          : `${upload.sourceFile} is ${String(upload.status || "").toLowerCase()}.`,
      module: "Bulk Upload",
      recordId: upload.id,
      recordLabel: upload.sourceFile,
      actionUrl: "/upload-history",
      sourceKey: `upload:${upload.id}:${upload.status}`,
      createdAt: upload.createdAt,
    });
  }

  cache.set(cacheKey, Date.now());
}

function getPolicyPayload(policy) {
  return policy.reviewedData || policy.data || {};
}

function getPolicyFollowUp(policy) {
  const payload = getPolicyPayload(policy);
  const followUp = payload.renewalFollowUp || {};
  const dueAt = parseBusinessDate(followUp.nextFollowUpDate || payload.nextFollowUpDate);
  if (!dueAt) return null;

  const policyNumber = payload.policyNumber || payload["Policy Number"] || "";
  const customerName =
    payload.insuredName || payload.customerName || payload["Insured Name"] || "Unnamed customer";
  const assignedToId = followUp.assignedToId || payload.assignedToId || policy.updatedById || policy.createdById;

  return {
    dueAt,
    policyNumber,
    customerName,
    assignedToId,
    status: followUp.followUpStatus || policy.renewalStatus || "Follow-up",
    mode: followUp.followUpMode || "Follow-up",
    nextAction: followUp.nextAction || "",
  };
}

async function syncPolicyFollowUp(policy, actorId) {
  if (CLOSED_RENEWAL_STATUSES.includes(policy.renewalStatus)) return;

  const followUp = getPolicyFollowUp(policy);
  if (!followUp) return;

  const dueDay = startOfDay(followUp.dueAt);
  const today = startOfDay();
  const overdue = dueDay < today;
  const dueToday = isSameDay(dueDay, today);
  const userId = followUp.assignedToId || policy.createdById || actorId;
  const actionUrl = `/customer-management/${encodeURIComponent(followUp.customerName)}/policy/${policy.id}`;
  const title = `${overdue ? "Overdue" : "Follow-up"}: ${followUp.customerName}`;
  const message = `${followUp.customerName}${followUp.policyNumber ? ` (${followUp.policyNumber})` : ""} has a follow-up ${overdue ? "pending since" : "scheduled for"} ${formatBusinessDate(dueDay)}.`;

  await upsertTaskWithCalendar({
    organizationId: policy.organizationId,
    userId,
    createdById: policy.updatedById || policy.createdById || actorId,
    title,
    description: followUp.nextAction || message,
    type: "FOLLOW_UP",
    priority: overdue ? "HIGH" : "MEDIUM",
    module: "Renewals",
    recordId: policy.id,
    recordLabel: followUp.policyNumber || followUp.customerName,
    customerName: followUp.customerName,
    policyNumber: followUp.policyNumber,
    dueAt: followUp.dueAt,
    sourceKey: `policy:${policy.id}:scheduled-follow-up`,
    actionUrl,
    metadata: {
      followUpDate: dueDay.toISOString(),
      followUpStatus: followUp.status,
      followUpMode: followUp.mode,
    },
  });

  if (!dueToday && !overdue) return;

  await upsertNotification({
    organizationId: policy.organizationId,
    userId,
    createdById: policy.updatedById || policy.createdById || actorId,
    category: "RENEWAL",
    severity: overdue ? "WARNING" : "INFO",
    title: overdue ? "Follow-up overdue" : "Follow-up pending",
    message,
    module: "Renewals",
    recordId: policy.id,
    recordLabel: followUp.policyNumber || followUp.customerName,
    actionUrl,
    sourceKey: `policy:${policy.id}:follow-up-due:${dateKey(dueDay)}`,
    metadata: {
      followUpDate: dueDay.toISOString(),
      followUpStatus: followUp.status,
      followUpMode: followUp.mode,
    },
  });
}

async function syncPolicyRenewal(policy, actorId) {
  const payload = policy.reviewedData || policy.data || {};
  const expiryDate = parseBusinessDate(
    payload.expiryDate || payload.policyEndDate || payload["Policy End Date"],
  );
  if (!expiryDate || policy.renewalStatus === "RENEWED" || policy.renewalStatus === "LOST") return;

  const policyNumber = payload.policyNumber || payload["Policy Number"] || "";
  const customerName =
    payload.insuredName || payload.customerName || payload["Insured Name"] || "Unnamed customer";
  const company =
    payload.insuranceCompany || payload.companyName || policy.selectedCompany || "Insurance company";
  const today = startOfDay();
  const expiryDay = startOfDay(expiryDate);
  const daysRemaining = Math.ceil((expiryDay.getTime() - today.getTime()) / 86400000);
  if (daysRemaining > 60 || daysRemaining < -30) return;

  const interval = [...RENEWAL_INTERVALS].reverse().find((days) => days >= daysRemaining) ?? 0;
  const dueAt = addDays(expiryDay, -interval);
  await upsertTaskWithCalendar({
    organizationId: policy.organizationId,
    userId: policy.createdById || actorId,
    createdById: policy.createdById || actorId,
    title:
      interval === 0
        ? `Renewal due today: ${customerName}`
        : `${interval}-day renewal follow-up: ${customerName}`,
    description: `Policy ${policyNumber || policy.id} with ${company} expires on ${expiryDay.toLocaleDateString("en-IN")}.`,
    type: "RENEWAL",
    priority: daysRemaining <= 0 ? "CRITICAL" : daysRemaining <= 7 ? "HIGH" : "MEDIUM",
    module: "Renewals",
    recordId: policy.id,
    recordLabel: policyNumber || customerName,
    customerName,
    policyNumber,
    dueAt,
    sourceKey: `policy:${policy.id}:renewal:${interval}`,
    actionUrl: `/customer-management/${encodeURIComponent(customerName)}/policy/${policy.id}`,
    metadata: { daysRemaining, interval, expiryDate: expiryDay.toISOString(), company },
  });

  await upsertNotification({
    organizationId: policy.organizationId,
    userId: null,
    createdById: policy.createdById || actorId,
    category: "RENEWAL",
    severity: daysRemaining < 0 ? "CRITICAL" : daysRemaining <= 7 ? "WARNING" : "INFO",
    title: daysRemaining < 0 ? "Renewal overdue" : daysRemaining === 0 ? "Renewal due today" : "Renewal due",
    message: `${customerName}${policyNumber ? ` (${policyNumber})` : ""} ${daysRemaining < 0 ? "expired" : "expires"} ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ${daysRemaining < 0 ? "ago" : "from now"}.`,
    module: "Renewals",
    recordId: policy.id,
    recordLabel: policyNumber || customerName,
    actionUrl: `/customer-management/${encodeURIComponent(customerName)}/policy/${policy.id}`,
    sourceKey: `policy:${policy.id}:renewal-notice:${daysRemaining}`,
    createdAt: policy.updatedAt,
    metadata: { daysRemaining, expiryDate: expiryDay.toISOString() },
  });
}

async function syncClaimWork(claim, actorId) {
  const closed = /closed|settled/i.test(claim.claimStatus || "");
  await upsertNotification({
    organizationId: claim.organizationId,
    userId: null,
    createdById: claim.createdById || actorId,
    category: "CLAIM",
    severity: closed ? "SUCCESS" : "WARNING",
    title: closed ? "Claim closed" : "Claim pending",
    message: `Claim ${claim.claimNo} for ${claim.insuredName} is ${claim.claimStatus || "Open"}.`,
    module: "Claims Management",
    recordId: claim.id,
    recordLabel: claim.claimNo,
    actionUrl: "/operations/claims-management",
    sourceKey: `claim:${claim.id}:status:${claim.claimStatus || "Open"}`,
    createdAt: claim.updatedAt,
  });
  await upsertActivity({
    organizationId: claim.organizationId,
    userId: claim.updatedById || claim.createdById || actorId,
    module: "Claims Management",
    recordId: claim.id,
    recordLabel: claim.claimNo,
    action: closed ? "Claim Closed" : "Claim Updated",
    description: `Claim ${claim.claimNo} is ${claim.claimStatus || "Open"}.`,
    sourceKey: `claim:${claim.id}:activity:${claim.updatedAt.toISOString()}`,
  });
  if (!closed) {
    await upsertTaskWithCalendar({
      organizationId: claim.organizationId,
      userId: claim.createdById || actorId,
      createdById: claim.createdById || actorId,
      title: `Claim follow-up: ${claim.claimNo}`,
      description: claim.currentRemark || "Pending claim action requires follow-up.",
      type: "CLAIM",
      priority: claim.followUpDate && startOfDay(claim.followUpDate) < startOfDay() ? "HIGH" : "MEDIUM",
      module: "Claims Management",
      recordId: claim.id,
      recordLabel: claim.claimNo,
      customerName: claim.insuredName,
      customerMobile: claim.mobileNo,
      policyNumber: claim.policyNo,
      dueAt: claim.followUpDate || addDays(new Date(), 1),
      sourceKey: `claim:${claim.id}:follow-up`,
      actionUrl: "/operations/claims-management",
      metadata: { claimStatus: claim.claimStatus },
    });
  }
}

async function syncEndorsementWork(endorsement, actorId) {
  const complete = /approved|closed|delivered/i.test(endorsement.status || "");
  await upsertNotification({
    organizationId: endorsement.organizationId,
    userId: null,
    createdById: endorsement.createdById || actorId,
    category: "ENDORSEMENT",
    severity: complete ? "SUCCESS" : "WARNING",
    title: complete ? "Endorsement completed" : "Endorsement pending",
    message: `${endorsement.endorsementNo} for ${endorsement.insuredName} is ${endorsement.status || "Draft"}.`,
    module: "Endorsements",
    recordId: endorsement.id,
    recordLabel: endorsement.endorsementNo,
    actionUrl: `/dashboard/endorsements/${endorsement.id}`,
    sourceKey: `endorsement:${endorsement.id}:status:${endorsement.status || "Draft"}`,
    createdAt: endorsement.updatedAt,
  });
  await upsertActivity({
    organizationId: endorsement.organizationId,
    userId: endorsement.updatedById || endorsement.createdById || actorId,
    module: "Endorsements",
    recordId: endorsement.id,
    recordLabel: endorsement.endorsementNo,
    action: complete ? "Endorsement Approved" : "Endorsement Updated",
    description: `${endorsement.endorsementType} endorsement is ${endorsement.status || "Draft"}.`,
    sourceKey: `endorsement:${endorsement.id}:activity:${endorsement.updatedAt.toISOString()}`,
  });
  if (!complete) {
    await upsertTaskWithCalendar({
      organizationId: endorsement.organizationId,
      userId: endorsement.createdById || actorId,
      createdById: endorsement.createdById || actorId,
      title: `Endorsement action: ${endorsement.endorsementNo}`,
      description: `${endorsement.endorsementType} endorsement is pending at ${endorsement.status || "Draft"}.`,
      type: "ENDORSEMENT",
      priority: /approval|review|pending/i.test(endorsement.status || "") ? "HIGH" : "MEDIUM",
      module: "Endorsements",
      recordId: endorsement.id,
      recordLabel: endorsement.endorsementNo,
      customerName: endorsement.customerName || endorsement.insuredName,
      policyNumber: endorsement.policyNo,
      dueAt: addDays(endorsement.updatedAt || new Date(), 2),
      sourceKey: `endorsement:${endorsement.id}:pending-action`,
      actionUrl: `/dashboard/endorsements/${endorsement.id}`,
      metadata: { status: endorsement.status, endorsementType: endorsement.endorsementType },
    });
    if (/approval/i.test(endorsement.status || "")) {
      await upsertApproval({
        organizationId: endorsement.organizationId,
        requestedById: endorsement.createdById || actorId,
        approvalType: "Endorsement Approval",
        module: "Endorsements",
        recordId: endorsement.id,
        title: `Approve ${endorsement.endorsementNo}`,
        sourceKey: `endorsement:${endorsement.id}:approval`,
        metadata: { status: endorsement.status, endorsementType: endorsement.endorsementType },
      });
    }
  }
}

async function syncCustomerProfileWork(profile, actorId) {
  const dueAt = profile.nextFollowUpDate || profile.followUpDate;
  if (!dueAt || profile.createdById !== actorId) return;

  await upsertTaskWithCalendar({
    organizationId: profile.organizationId,
    userId: profile.createdById,
    createdById: profile.createdById,
    title: `Lead follow-up: ${profile.name}`,
    description: profile.followUpRemark || "Customer profiling lead follow-up is due.",
    type: "FOLLOW_UP",
    priority: startOfDay(dueAt) < startOfDay() ? "HIGH" : "MEDIUM",
    module: "Lead Generation",
    recordId: profile.id,
    recordLabel: profile.name,
    customerName: profile.name,
    customerMobile: profile.phone,
    dueAt,
    sourceKey: `customer-profile:${profile.id}:follow-up`,
    actionUrl: `/dashboard/manual-entry/lead-generation/${profile.id}`,
    metadata: { status: profile.status },
  });

  if (startOfDay(dueAt) <= startOfDay()) {
    await upsertNotification({
      organizationId: profile.organizationId,
      userId: profile.createdById,
      createdById: profile.updatedById || profile.createdById || actorId,
      category: "CUSTOMER",
      severity: startOfDay(dueAt) < startOfDay() ? "WARNING" : "INFO",
      title: startOfDay(dueAt) < startOfDay() ? "Customer follow-up overdue" : "Customer follow-up pending",
      message: `${profile.name} has a follow-up ${startOfDay(dueAt) < startOfDay() ? "pending since" : "scheduled for"} ${formatBusinessDate(dueAt)}.`,
      module: "Lead Generation",
      recordId: profile.id,
      recordLabel: profile.name,
      actionUrl: `/dashboard/manual-entry/lead-generation/${profile.id}`,
      sourceKey: `customer-profile:${profile.id}:follow-up-due:${dateKey(dueAt)}`,
      metadata: { followUpDate: startOfDay(dueAt).toISOString(), status: profile.status },
    });
  }
}

export async function syncDueFollowUpNotifications({ now = new Date(), limit = 1000 } = {}) {
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [policies, customerProfiles, claims] = await Promise.all([
    prisma.policyRecord.findMany({
      where: {
        deletedAt: null,
        isActivePolicy: true,
        renewalStatus: { notIn: CLOSED_RENEWAL_STATUSES },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        data: true,
        reviewedData: true,
        selectedCompany: true,
        selectedPolicyType: true,
        renewalStatus: true,
        organizationId: true,
        createdById: true,
        updatedById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.customerProfile.findMany({
      where: {
        deletedAt: null,
        OR: [
          { nextFollowUpDate: { lte: todayEnd } },
          { followUpDate: { lte: todayEnd } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        nextFollowUpDate: true,
        followUpDate: true,
        followUpRemark: true,
        organizationId: true,
        createdById: true,
        updatedById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.claim.findMany({
      where: {
        deletedAt: null,
        followUpDate: { lte: todayEnd },
        NOT: [{ claimStatus: { contains: "closed", mode: "insensitive" } }],
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        claimNo: true,
        insuredName: true,
        mobileNo: true,
        policyNo: true,
        claimStatus: true,
        followUpDate: true,
        currentRemark: true,
        organizationId: true,
        createdById: true,
        updatedById: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  let policiesSynced = 0;
  for (const policy of policies) {
    const followUp = getPolicyFollowUp(policy);
    if (followUp && startOfDay(followUp.dueAt) <= today) {
      await syncPolicyFollowUp(policy, policy.updatedById || policy.createdById || null);
      policiesSynced++;
    }
  }

  for (const profile of customerProfiles) {
    await syncCustomerProfileWork(profile, profile.createdById);
  }

  for (const claim of claims) {
    await syncClaimWork(claim, claim.updatedById || claim.createdById || null);
    if (claim.followUpDate) {
      await upsertNotification({
        organizationId: claim.organizationId,
        userId: claim.updatedById || claim.createdById || null,
        createdById: claim.updatedById || claim.createdById || null,
        category: "CLAIM",
        severity: startOfDay(claim.followUpDate) < today ? "WARNING" : "INFO",
        title: startOfDay(claim.followUpDate) < today ? "Claim follow-up overdue" : "Claim follow-up pending",
        message: `Claim ${claim.claimNo} for ${claim.insuredName} needs follow-up on ${formatBusinessDate(claim.followUpDate)}.`,
        module: "Claims Management",
        recordId: claim.id,
        recordLabel: claim.claimNo,
        actionUrl: "/operations/claims-management",
        sourceKey: `claim:${claim.id}:follow-up-due:${dateKey(claim.followUpDate)}`,
        metadata: { followUpDate: startOfDay(claim.followUpDate).toISOString(), claimStatus: claim.claimStatus },
      });
    }
  }

  return {
    policies: policiesSynced,
    customerProfiles: customerProfiles.length,
    claims: claims.length,
  };
}

async function upsertTaskWithCalendar(input) {
  const task = await prisma.task.upsert({
    where: { sourceKey: input.sourceKey },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      createdById: input.createdById,
      updatedById: input.createdById,
      title: input.title,
      description: input.description,
      type: input.type,
      status: input.userId ? "ASSIGNED" : "OPEN",
      priority: input.priority,
      module: input.module,
      recordId: input.recordId,
      recordLabel: input.recordLabel,
      customerName: input.customerName,
      customerMobile: input.customerMobile,
      policyNumber: input.policyNumber,
      dueAt: input.dueAt,
      sourceKey: input.sourceKey,
      metadata: { ...(input.metadata || {}), actionUrl: input.actionUrl },
    },
    update: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueAt: input.dueAt,
      metadata: { ...(input.metadata || {}), actionUrl: input.actionUrl },
      updatedById: input.createdById,
    },
  });

  if (input.userId) {
    await prisma.taskAssignment.upsert({
      where: { taskId_userId: { taskId: task.id, userId: input.userId } },
      create: { taskId: task.id, userId: input.userId, assignedBy: input.createdById },
      update: { assignedBy: input.createdById },
    });
  }

  if (input.dueAt) {
    await prisma.calendarEvent.upsert({
      where: { sourceKey: `task:${task.id}:calendar` },
      create: {
        organizationId: input.organizationId,
        userId: input.userId,
        createdById: input.createdById,
        updatedById: input.createdById,
        title: input.title,
        description: input.description,
        eventType: input.type,
        module: input.module,
        recordId: input.recordId,
        startsAt: input.dueAt,
        endsAt: addHours(input.dueAt, 1),
        sourceKey: `task:${task.id}:calendar`,
        metadata: { taskId: task.id, actionUrl: input.actionUrl },
      },
      update: {
        title: input.title,
        description: input.description,
        startsAt: input.dueAt,
        endsAt: addHours(input.dueAt, 1),
        metadata: { taskId: task.id, actionUrl: input.actionUrl },
      },
    });

    for (const offset of REMINDER_OFFSETS) {
      const remindAt = addDays(input.dueAt, -offset);
      if (remindAt < addDays(new Date(), -1)) continue;
      await prisma.reminder.upsert({
        where: { sourceKey: `task:${task.id}:reminder:${offset}` },
        create: {
          organizationId: input.organizationId,
          userId: input.userId,
          taskId: task.id,
          module: input.module,
          recordId: input.recordId,
          title: offset === 0 ? input.title : `${offset}-day reminder: ${input.title}`,
          remindAt,
          sourceKey: `task:${task.id}:reminder:${offset}`,
          metadata: { taskId: task.id, offsetDays: offset, actionUrl: input.actionUrl },
        },
        update: {
          title: offset === 0 ? input.title : `${offset}-day reminder: ${input.title}`,
          remindAt,
          metadata: { taskId: task.id, offsetDays: offset, actionUrl: input.actionUrl },
        },
      });
    }
  }

  await upsertNotification({
    organizationId: input.organizationId,
    userId: input.userId,
    createdById: input.createdById,
    category: "TASK",
    severity:
      input.priority === "CRITICAL" || input.priority === "EMERGENCY"
        ? "CRITICAL"
        : input.priority === "HIGH"
          ? "WARNING"
          : "INFO",
    title: "Task assigned",
    message: input.title,
    module: input.module,
    recordId: input.recordId,
    recordLabel: input.recordLabel,
    actionUrl: input.actionUrl || "/work-center",
    sourceKey: `task:${task.id}:notification`,
    metadata: { taskId: task.id, priority: input.priority },
  });

  if (input.dueAt && startOfDay(input.dueAt) < startOfDay()) {
    await prisma.escalation.upsert({
      where: { sourceKey: `task:${task.id}:overdue` },
      create: {
        organizationId: input.organizationId,
        taskId: task.id,
        assignedUserId: input.userId,
        module: input.module,
        recordId: input.recordId,
        reason: `Task is overdue: ${input.title}`,
        status: "OPEN",
        sourceKey: `task:${task.id}:overdue`,
        metadata: { taskId: task.id, dueAt: input.dueAt.toISOString() },
      },
      update: {
        status: "OPEN",
        reason: `Task is overdue: ${input.title}`,
        metadata: { taskId: task.id, dueAt: input.dueAt.toISOString() },
      },
    });
  }

  return task;
}

function addHours(date, hours) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

async function upsertNotification(input) {
  return prisma.notification.upsert({
    where: { sourceKey: input.sourceKey },
    create: {
      organizationId: input.organizationId,
      userId: input.userId || null,
      createdById: input.createdById || null,
      updatedById: input.createdById || null,
      category: input.category,
      severity: input.severity || "INFO",
      title: input.title,
      message: input.message,
      module: input.module,
      recordId: input.recordId,
      recordLabel: input.recordLabel,
      actionUrl: input.actionUrl,
      sourceKey: input.sourceKey,
      metadata: input.metadata || {},
      createdAt: input.createdAt || new Date(),
    },
    update: {
      severity: input.severity || "INFO",
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      metadata: input.metadata || {},
      updatedById: input.createdById || null,
    },
  });
}

async function upsertActivity(input) {
  return prisma.activityLog.upsert({
    where: { sourceKey: input.sourceKey },
    create: {
      organizationId: input.organizationId,
      userId: input.userId || null,
      module: input.module,
      recordId: input.recordId,
      recordLabel: input.recordLabel,
      action: input.action,
      description: input.description,
      sourceKey: input.sourceKey,
    },
    update: {
      description: input.description,
    },
  });
}

async function upsertApproval(input) {
  return prisma.approval.upsert({
    where: { sourceKey: input.sourceKey },
    create: {
      organizationId: input.organizationId,
      requestedById: input.requestedById,
      approvalType: input.approvalType,
      module: input.module,
      recordId: input.recordId,
      title: input.title,
      sourceKey: input.sourceKey,
      metadata: input.metadata || {},
    },
    update: {
      title: input.title,
      metadata: input.metadata || {},
    },
  });
}

export async function getOperationsSummary(session) {
  await syncOperationsCenter(session);

  const tenantWhere = buildOperationsTenantWhere(session);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const upcomingEnd = endOfDay(addDays(now, 7));
  const openWhere = { ...tenantWhere, archivedAt: null, status: { in: OPEN_TASK_STATUSES } };

  const [
    todayTasks,
    upcomingTasks,
    overdueTasks,
    highPriorityTasks,
    renewalsDueToday,
    claimsPending,
    endorsementsPending,
    serviceRequestsPending,
    meetingsToday,
    collectionsPending,
    followUpsPending,
    tasks,
    events,
    approvals,
    escalations,
    activities,
  ] = await Promise.all([
    prisma.task.count({ where: { ...openWhere, dueAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.task.count({ where: { ...openWhere, dueAt: { gt: todayEnd, lte: upcomingEnd } } }),
    prisma.task.count({ where: { ...openWhere, dueAt: { lt: todayStart } } }),
    prisma.task.count({ where: { ...openWhere, priority: { in: ["HIGH", "CRITICAL", "EMERGENCY"] } } }),
    prisma.task.count({
      where: { ...openWhere, type: "RENEWAL", dueAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.task.count({ where: { ...openWhere, type: "CLAIM" } }),
    prisma.task.count({ where: { ...openWhere, type: "ENDORSEMENT" } }),
    prisma.task.count({ where: { ...openWhere, type: "SERVICE_REQUEST" } }),
    prisma.calendarEvent.count({
      where: { ...tenantWhere, eventType: "MEETING", startsAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.task.count({ where: { ...openWhere, type: "COLLECTION" } }),
    prisma.task.count({ where: { ...openWhere, type: { in: ["FOLLOW_UP", "CALL"] } } }),
    prisma.task.findMany({
      where: openWhere,
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: 100,
      include: { assignments: true },
    }),
    prisma.calendarEvent.findMany({
      where: { ...tenantWhere, startsAt: { gte: todayStart, lte: upcomingEnd } },
      orderBy: { startsAt: "asc" },
      take: 100,
    }),
    prisma.approval.findMany({
      where: { ...tenantWhere, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.escalation.findMany({
      where: { ...tenantWhere, status: { in: ["OPEN", "NOTIFIED"] } },
      orderBy: { escalatedAt: "desc" },
      take: 25,
    }),
    prisma.activityLog.findMany({
      where: tenantWhere,
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  const teamWorkload = await getTeamWorkload(session);

  return {
    summaryCards: [
      { key: "today", label: "Today's Tasks", value: todayTasks },
      { key: "upcoming", label: "Upcoming Tasks", value: upcomingTasks },
      { key: "overdue", label: "Overdue Tasks", value: overdueTasks },
      { key: "high-priority", label: "High Priority Tasks", value: highPriorityTasks },
      { key: "renewals-today", label: "Renewals Due Today", value: renewalsDueToday },
      { key: "claims-pending", label: "Claims Pending", value: claimsPending },
      { key: "endorsements-pending", label: "Endorsements Pending", value: endorsementsPending },
      { key: "service-requests-pending", label: "Service Requests Pending", value: serviceRequestsPending },
      { key: "meetings-today", label: "Meetings Today", value: meetingsToday },
      { key: "collections-pending", label: "Collections Pending", value: collectionsPending },
      { key: "followups-pending", label: "Follow-Ups Pending", value: followUpsPending },
    ],
    tasks: tasks.map(serializeTask),
    events: events.map(serializeEvent),
    approvals,
    escalations,
    activities,
    teamWorkload,
  };
}

export async function getNotificationFeed(session, limit = 10) {
  await syncOperationsCenter(session);
  const actorId = session.userId || session.id;
  const tenantWhere = buildOperationsTenantWhere(session);
  const visibilityWhere = {
    ...tenantWhere,
    OR: [{ userId: null }, { userId: actorId }],
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: visibilityWhere,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        reads: {
          where: { userId: actorId },
          select: { id: true },
        },
      },
    }),
    prisma.notification.count({
      where: {
        ...visibilityWhere,
        reads: { none: { userId: actorId } },
      },
    }),
  ]);

  return {
    unreadCount,
    notifications: notifications.map((item) => ({
      id: item.id,
      userId: item.userId,
      category: item.category,
      severity: item.severity,
      title: item.title,
      message: item.message,
      module: item.module,
      recordId: item.recordId,
      recordLabel: item.recordLabel,
      actionUrl: item.actionUrl,
      read: item.reads.length > 0,
      time: formatRelativeTime(item.createdAt),
      createdAt: item.createdAt,
    })),
  };
}

export async function getUnreadNotificationCount(session) {
  const actorId = session.userId || session.id;
  const tenantWhere = buildOperationsTenantWhere(session);
  return prisma.notification.count({
    where: {
      ...tenantWhere,
      OR: [{ userId: null }, { userId: actorId }],
      reads: { none: { userId: actorId } },
    },
  });
}

export async function markNotificationsRead(session, ids = []) {
  const actorId = session.userId || session.id;
  const tenantWhere = buildOperationsTenantWhere(session);
  const where = ids.length
    ? { ...tenantWhere, id: { in: ids } }
    : { ...tenantWhere, OR: [{ userId: null }, { userId: actorId }] };

  const notifications = await prisma.notification.findMany({
    where,
    select: { id: true },
  });

  for (const notification of notifications) {
    await prisma.notificationRead.upsert({
      where: { notificationId_userId: { notificationId: notification.id, userId: actorId } },
      create: { notificationId: notification.id, userId: actorId },
      update: { readAt: new Date() },
    });
  }

  return { marked: notifications.length };
}

export async function sendDueFollowUpEmails({ now = new Date(), limit = 100 } = {}) {
  const todayEnd = endOfDay(now);
  const todayKey = dateKey(now);
  const openWhere = { archivedAt: null, status: { in: OPEN_TASK_STATUSES } };

  const tasks = await prisma.task.findMany({
    where: {
      ...openWhere,
      userId: { not: null },
      type: { in: ["FOLLOW_UP", "CALL", "RENEWAL", "CLAIM"] },
      dueAt: { lte: todayEnd },
    },
    orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
    take: limit,
    include: {
      assignments: true,
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const task of tasks) {
    const sourceKey = `email:follow-up:${task.id}:${todayKey}`;
    const existing = await prisma.activityLog.findFirst({
      where: { sourceKey },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const user = await prisma.user.findFirst({
      where: { id: task.userId, deletedAt: null },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      skipped++;
      continue;
    }

    let emailTo = user.email;
    if (!emailTo || emailTo.endsWith("@example.com") || emailTo.endsWith(".local") || emailTo.endsWith(".test") || emailTo.endsWith("@localhost")) {
      emailTo = "insuredeskbhopal@gmail.com";
    }

    const dueLabel = task.dueAt ? formatBusinessDate(task.dueAt) : "today";
    const actionUrl = task.metadata?.actionUrl || "/work-center";
    const title = task.dueAt && startOfDay(task.dueAt) < startOfDay(now) ? "Follow-up overdue" : "Follow-up pending";
    const message = `${task.title} is due ${dueLabel}. Please open Bima Headquarter and complete the follow-up.`;

    try {
      const result = await sendFollowUpReminderEmail({
        to: emailTo,
        name: user.name || emailTo,
        title,
        message,
        actionUrl,
        type: task.type,
        priority: task.priority,
        module: task.module,
        customerName: task.customerName,
        customerMobile: task.customerMobile,
        policyNumber: task.policyNumber,
        amount: task.amount ? Number(task.amount) : null,
      });

      await upsertActivity({
        organizationId: task.organizationId,
        userId: user.id,
        module: task.module,
        recordId: task.recordId,
        recordLabel: task.recordLabel,
        action: result.sent ? "Follow-up Email Sent" : "Follow-up Email Skipped",
        description: result.sent ? `[Sent to: ${emailTo}] ${message}` : result.reason || "Email was not sent.",
        sourceKey,
      });

      if (result.sent) sent++;
      else skipped++;
    } catch (error) {
      failed++;
      await upsertActivity({
        organizationId: task.organizationId,
        userId: user.id,
        module: task.module,
        recordId: task.recordId,
        recordLabel: task.recordLabel,
        action: "Follow-up Email Failed",
        description: error instanceof Error ? `[Attempted: ${emailTo}] ${error.message}` : `[Attempted: ${emailTo}] Email failed.`,
        sourceKey,
      });
    }
  }

  return { checked: tasks.length, sent, skipped, failed };
}

export async function updateTaskStatus(session, taskId, status) {
  const tenantWhere = buildOperationsTenantWhere(session);
  const actorId = session.userId || session.id || null;
  const terminal = status === "COMPLETED" || status === "CLOSED";

  const task = await prisma.task.update({
    where: { id: taskId, ...tenantWhere },
    data: {
      status,
      completedAt: terminal ? new Date() : null,
      updatedById: actorId,
    },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: task.organizationId,
      userId: actorId,
      userRole: session.role,
      module: task.module,
      recordId: task.recordId,
      recordLabel: task.recordLabel,
      action: `Task ${status.replaceAll("_", " ")}`,
      description: task.title,
    },
  });

  return serializeTask(task);
}

export function buildOperationsTenantWhere(session) {
  if (session.role === "SUPER_ADMIN") {
    return session.organizationId ? { organizationId: session.organizationId } : {};
  }
  return { organizationId: session.organizationId };
}

async function getTeamWorkload(session) {
  const tenantWhere = buildOperationsTenantWhere(session);
  const users = await prisma.user.findMany({
    where:
      session.role === "SUPER_ADMIN" && !session.organizationId
        ? { deletedAt: null }
        : { organizationId: session.organizationId, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  });
  const tasks = await prisma.task.findMany({
    where: { ...tenantWhere, archivedAt: null },
    select: { userId: true, status: true, dueAt: true },
  });
  const now = startOfDay();

  return users.map((user) => {
    const userTasks = tasks.filter((task) => task.userId === user.id);
    const pending = userTasks.filter((task) => OPEN_TASK_STATUSES.includes(task.status)).length;
    const completed = userTasks.filter(
      (task) => task.status === "COMPLETED" || task.status === "CLOSED",
    ).length;
    const overdue = userTasks.filter(
      (task) => OPEN_TASK_STATUSES.includes(task.status) && task.dueAt && startOfDay(task.dueAt) < now,
    ).length;
    return {
      userId: user.id,
      user: user.name || user.email,
      role: user.role,
      pendingTasks: pending,
      completedTasks: completed,
      overdueTasks: overdue,
      currentWorkload: pending + overdue,
    };
  });
}

function serializeTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type,
    status: task.status,
    priority: task.priority,
    module: task.module,
    recordId: task.recordId,
    recordLabel: task.recordLabel,
    customerName: task.customerName,
    customerMobile: task.customerMobile,
    policyNumber: task.policyNumber,
    amount: task.amount?.toString() || null,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
    updatedAt: task.updatedAt,
    metadata: task.metadata,
  };
}

function serializeEvent(event) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    module: event.module,
    recordId: event.recordId,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location,
    metadata: event.metadata,
  };
}
