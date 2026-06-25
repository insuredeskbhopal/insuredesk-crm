import { prisma } from "@/lib/db/prisma";
import { normalizeRecord } from "@/lib/records";
import { enqueueMessage } from "./queue-manager";

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
export async function triggerDailyBirthdays() {
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

      // Get organization name
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      const companyName = org?.name || 'BimaHeadquarter';

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

// Triggers upcoming renewals scan
export async function triggerUpcomingRenewals() {
  console.log('Running upcoming renewals scan...');

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const currentMonth = ist.getMonth();
  const currentDate = ist.getDate();
  const currentYear = ist.getFullYear();

  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;

  // Find all active policy records
  const policies = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      isActivePolicy: true,
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

    const contactPhone = policy.contactNumber || policy.customerMobile || '';
    if (!contactPhone) continue;

    // Get organization name
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const companyName = org?.name || 'BimaHeadquarter';

    // Load template
    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        name: 'renewal_reminder',
        OR: [
          { organizationId: orgId },
          { organizationId: null },
        ],
      },
      orderBy: { organizationId: 'desc' },
    });

    const customerDisplayName = policy.contactPerson || policy.insuredName || 'Valued Customer';

    // Compile variables
    const templateBody = template?.body || 'Dear {{customerName}},\n\nYour {{policyType}} (Policy No: {{policyNumber}}) with {{companyName}} is due for renewal on {{expiryDate}} ({{daysLeft}} days left).\n\nPlease connect with us to ensure continuous coverage.\n\nRegards,\n{{companyName}}';

    const daysLeftText = daysLeft === 0 ? 'today' : `${daysLeft} days`;

    const variables = {
      customerName: customerDisplayName,
      companyName: companyName,
      policyNumber: policy.policyNumber || 'N/A',
      policyType: policy.policyType || rawPolicy.selectedPolicyType || 'insurance',
      expiryDate: formatDate(expiryDate),
      agentName: policy.assignedTo || '',
      daysLeft: daysLeftText,
    };

    let bodyText = templateBody;
    for (const [key, val] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      bodyText = bodyText.replace(regex, val);
    }

    const uniqueKey = `renewal:${rawPolicy.id}:${daysLeft}days:${todayStr}`;

    const enqueueResult = await enqueueMessage({
      organizationId: orgId,
      recipientPhone: contactPhone,
      recipientName: customerDisplayName,
      messageType: template?.mediaUrl ? 'IMAGE' : 'TEXT',
      messageBody: bodyText,
      mediaUrl: template?.mediaUrl || null,
      fileName: 'renewal_notice.png',
      caption: bodyText,
      uniqueKey,
    });

    if (enqueueResult.success) {
      queuedCount++;
    }
  }

  console.log(`Renewal notice scan complete. Queued ${queuedCount} messages.`);
  return { queuedCount };
}
