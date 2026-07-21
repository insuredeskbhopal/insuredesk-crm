import { prisma } from "@/lib/db/prisma";
import { normalizeRecord } from "@/lib/records";
import { enqueueMessage } from "./queue-manager";
import { moveOverdueRenewalsToLost } from "@/lib/renewals/auto-lost";

const INTERNAL_AUTOMATION_PHONE = process.env.INTERNAL_WHATSAPP_ALERT_PHONE || "8818889660";
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

// Helper to format dates nicely for messages (DD-MM-YYYY)
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

// Calculate days left until a date
function calculateDaysLeft(dateStr) {
  if (!dateStr) return null;
  try {
    const expiry = new Date(dateStr);
    if (isNaN(expiry.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// Triggers daily birthday wishes queueing
export async function triggerDailyBirthdays({ organizationId = null } = {}) {
  console.log('Running daily birthday automation scan...');

  // Get current date in IST (UTC + 5:30)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const currentMonth = ist.getMonth(); // 0-11
  const currentDate = ist.getDate();   // 1-31
  const currentYear = ist.getFullYear();

  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;

  // Find all customers with a non-null DOB
  const customers = await prisma.customerProfile.findMany({
    where: {
      deletedAt: null,
      dob: { not: null },
      ...(organizationId ? { organizationId } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      dob: true,
      organizationId: true,
      contactPersonName: true,
    },
  });

  let queuedCount = 0;

  for (const customer of customers) {
    const dob = new Date(customer.dob);
    if (dob.getMonth() === currentMonth && dob.getDate() === currentDate) {
      // It's this customer's birthday!
      const orgId = customer.organizationId;
      if (!orgId) continue; // Must belong to an organization to resolve settings/branding
      if (!customer.phone) continue; // Birthday wishes are client-facing, so a client phone is required

      // Get organization name
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      const companyName = org?.name || 'Bima Headquarter';

      // Load template
      const template = await prisma.whatsAppTemplate.findFirst({
        where: {
          name: 'birthday_wish',
          OR: [
            { organizationId: orgId },
            { organizationId: null },
          ],
        },
        orderBy: { organizationId: 'desc' }, // Specific organization template first
      });

      const customerDisplayName = customer.contactPersonName || customer.name || 'Valued Customer';

      // Compile template variables
      const templateBody = template?.body || 'Dear {{customerName}},\n\nWishing you a very Happy Birthday! 🎂 May this year bring you joy, health, and prosperity.\n\nBest regards,\n{{companyName}}';
      
      const variables = {
        customerName: customerDisplayName,
        companyName: companyName,
      };

      // Compile body
      let bodyText = templateBody;
      for (const [key, val] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        bodyText = bodyText.replace(regex, val);
      }

      const uniqueKey = `birthday:${customer.id}:${todayStr}`;

      const enqueueResult = await enqueueMessage({
        organizationId: orgId,
        recipientPhone: customer.phone,
        recipientName: customerDisplayName,
        messageType: template?.mediaUrl ? 'IMAGE' : 'TEXT',
        messageBody: bodyText,
        mediaUrl: template?.mediaUrl || null,
        fileName: 'birthday_greeting.png',
        caption: bodyText,
        uniqueKey,
      });

      if (enqueueResult.success) {
        queuedCount++;
      }
    }
  }

  console.log(`Birthday scan complete. Queued ${queuedCount} messages.`);
  return { queuedCount };
}

// Triggers upcoming renewals scan. These automated renewal alerts are internal only;
// agents can still manually send WhatsApp reminders to clients from the UI.
export async function triggerUpcomingRenewals({ organizationId = null } = {}) {
  console.log('Running internal upcoming renewals scan...');

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const currentMonth = ist.getMonth();
  const currentDate = ist.getDate();
  const currentYear = ist.getFullYear();

  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
  const autoLostCount = await moveOverdueRenewalsToLost({ organizationId, referenceDate: now });

  // Find all active policy records
  const policies = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      isActivePolicy: true,
      ...(organizationId ? { organizationId } : {}),
      renewalStatus: {
        notIn: ['RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE'],
      },
    },
    select: {
      id: true,
      data: true,
      reviewedData: true,
      renewalStatus: true,
      selectedCompany: true,
      selectedPolicyType: true,
      organizationId: true,
    },
  });

  const thresholds = [30, 15, 7, 0]; // Remind 30 days, 15 days, 7 days, and on the day of expiry
  let queuedCount = 0;

  for (const rawPolicy of policies) {
    const orgId = rawPolicy.organizationId;
    if (!orgId) continue;

    const policy = normalizeRecord(rawPolicy);
    const expiryDate = policy.expiryDate;
    if (!expiryDate) continue;

    const daysLeft = calculateDaysLeft(expiryDate);
    if (daysLeft === null || !thresholds.includes(daysLeft)) continue;

    const customerDisplayName = policy.contactPerson || policy.insuredName || 'Valued Customer';
    const daysLeftText = daysLeft === 0 ? 'today' : `${daysLeft} days`;
    const bodyText = [
      "Internal confidential CRM alert.",
      "",
      `Renewal follow-up pending for ${customerDisplayName}.`,
      `Policy: ${policy.policyNumber || 'N/A'}`,
      `Type: ${policy.policyType || rawPolicy.selectedPolicyType || 'insurance'}`,
      `Expiry: ${formatDate(expiryDate)} (${daysLeftText})`,
      policy.assignedTo ? `Assigned to: ${policy.assignedTo}` : null,
      "",
      "Do not forward this automated internal update to the client.",
    ].filter(Boolean).join("\n");

    const uniqueKey = `internal-renewal:${rawPolicy.id}:${daysLeft}days:${todayStr}`;

    const enqueueResult = await enqueueMessage({
      organizationId: orgId,
      recipientPhone: INTERNAL_AUTOMATION_PHONE,
      recipientName: 'Internal Operations',
      messageType: 'TEXT',
      messageBody: bodyText,
      mediaUrl: null,
      fileName: null,
      caption: null,
      uniqueKey,
    });

    if (enqueueResult.success) {
      queuedCount++;
    }
  }

  console.log(`Internal renewal notice scan complete. Queued ${queuedCount} messages.`);
  return { queuedCount, autoLostCount };
}

export async function triggerInternalOperationsDigest({ organizationId = null } = {}) {
  console.log('Running internal operations WhatsApp digest scan...');

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const todayStr = now.toISOString().slice(0, 10);

  const tasks = await prisma.task.findMany({
    where: {
      archivedAt: null,
      status: { in: OPEN_TASK_STATUSES },
      type: { in: ['FOLLOW_UP', 'CALL', 'RENEWAL', 'CLAIM'] },
      dueAt: { lte: todayEnd },
      ...(organizationId ? { organizationId } : { organizationId: { not: null } }),
    },
    orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      organizationId: true,
      title: true,
      type: true,
      priority: true,
      module: true,
      customerName: true,
      policyNumber: true,
      dueAt: true,
    },
  });

  const tasksByOrg = new Map();
  for (const task of tasks) {
    if (!tasksByOrg.has(task.organizationId)) tasksByOrg.set(task.organizationId, []);
    tasksByOrg.get(task.organizationId).push(task);
  }

  let queuedCount = 0;

  for (const [organizationId, orgTasks] of tasksByOrg.entries()) {
    const counts = orgTasks.reduce(
      (acc, task) => {
        acc[task.type] = (acc[task.type] || 0) + 1;
        return acc;
      },
      { FOLLOW_UP: 0, CALL: 0, RENEWAL: 0, CLAIM: 0 }
    );

    const taskLines = orgTasks.slice(0, 12).map((task, index) => {
      const due = task.dueAt ? formatDate(task.dueAt) : 'N/A';
      const customer = task.customerName ? ` - ${task.customerName}` : '';
      const policy = task.policyNumber ? ` (${task.policyNumber})` : '';
      return `${index + 1}. [${task.type}] ${task.title}${customer}${policy} | Due: ${due} | ${task.priority}`;
    });

    const bodyText = [
      "Internal confidential CRM digest.",
      "",
      `Pending work due up to ${formatDate(now)}:`,
      `Follow-ups: ${counts.FOLLOW_UP + counts.CALL}`,
      `Renewals: ${counts.RENEWAL}`,
      `Claims: ${counts.CLAIM}`,
      "",
      ...taskLines,
      orgTasks.length > taskLines.length ? `...and ${orgTasks.length - taskLines.length} more.` : null,
      "",
      "Do not forward this automated internal update to clients.",
    ].filter(Boolean).join("\n");

    const enqueueResult = await enqueueMessage({
      organizationId,
      recipientPhone: INTERNAL_AUTOMATION_PHONE,
      recipientName: 'Internal Operations',
      messageType: 'TEXT',
      messageBody: bodyText,
      uniqueKey: `internal-operations-digest:${organizationId}:${todayStr}`,
    });

    if (enqueueResult.success) {
      queuedCount++;
    }
  }

  console.log(`Internal operations digest scan complete. Queued ${queuedCount} messages.`);
  return { queuedCount };
}
