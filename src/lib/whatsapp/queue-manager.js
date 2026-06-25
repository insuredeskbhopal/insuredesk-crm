import { prisma } from "@/lib/db/prisma";
import { sendWhatsAppText, sendWhatsAppImage, sendWhatsAppFile } from "./whatsapp-client";

// Replaces template placeholders with variable values
export function compileTemplate(body, variables = {}) {
  if (!body) return '';
  let compiled = body;
  const keys = [
    'customerName',
    'companyName',
    'policyNumber',
    'policyType',
    'expiryDate',
    'agentName',
  ];
  for (const key of keys) {
    const value = variables[key] || '';
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    compiled = compiled.replace(regex, value);
  }
  return compiled;
}

// Safely enqueues a WhatsApp message, skipping if uniqueKey is already present
export async function enqueueMessage({
  organizationId,
  recipientPhone,
  recipientName,
  messageType = 'TEXT',
  messageBody,
  mediaUrl = null,
  fileName = null,
  caption = null,
  uniqueKey = null,
  scheduledAt = new Date(),
}) {
  if (!organizationId) {
    throw new Error('organizationId is required to enqueue a message');
  }
  if (!recipientPhone) {
    throw new Error('recipientPhone is required to enqueue a message');
  }

  try {
    const message = await prisma.whatsAppMessageQueue.create({
      data: {
        organizationId,
        recipientPhone,
        recipientName: recipientName || 'Customer',
        messageType,
        messageBody,
        mediaUrl,
        fileName,
        caption,
        uniqueKey,
        scheduledAt,
        status: 'PENDING',
      },
    });
    return { success: true, message };
  } catch (error) {
    // Catch Prisma unique constraint violation code (P2002)
    if (error.code === 'P2002') {
      console.log(`Duplicate prevention triggered: message with unique key ${uniqueKey} already exists. Skipping.`);
      return { success: false, duplicate: true };
    }
    console.error('Error enqueuing WhatsApp message:', error);
    throw error;
  }
}

// Process a batch of pending/retrying messages
export async function processQueueBatch(limit = 5) {
  // Check hourly rate limit
  const hourlyLimit = parseInt(process.env.OPENWA_BATCH_LIMIT_PER_HOUR || '60', 10);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const sentInLastHour = await prisma.whatsAppMessageQueue.count({
    where: {
      status: 'SENT',
      sentAt: { gte: oneHourAgo },
    },
  });

  if (sentInLastHour >= hourlyLimit) {
    console.warn(`Hourly batch limit of ${hourlyLimit} messages reached (sent in last hour: ${sentInLastHour}). Aborting queue processing.`);
    return { success: false, reason: 'HOURLY_LIMIT_REACHED' };
  }

  // Get messages that are scheduled for now or earlier and are PENDING or RETRYING
  const messages = await prisma.whatsAppMessageQueue.findMany({
    where: {
      status: { in: ['PENDING', 'RETRYING'] },
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  });

  if (messages.length === 0) {
    return { success: true, processedCount: 0 };
  }

  let processedCount = 0;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3;

  for (const message of messages) {
    if (consecutiveFailures >= maxConsecutiveFailures) {
      console.error(`Stopping queue execution after ${consecutiveFailures} consecutive sending failures to prevent spam bans.`);
      break;
    }

    // Update status to SENDING
    await prisma.whatsAppMessageQueue.update({
      where: { id: message.id },
      data: {
        status: 'SENDING',
        attempts: { increment: 1 },
      },
    });

    try {
      let openwaResponse;
      if (message.messageType === 'IMAGE') {
        openwaResponse = await sendWhatsAppImage(
          message.recipientPhone,
          message.mediaUrl,
          message.fileName,
          message.caption || message.messageBody
        );
      } else if (message.messageType === 'PDF') {
        openwaResponse = await sendWhatsAppFile(
          message.recipientPhone,
          message.mediaUrl,
          message.fileName,
          message.caption || message.messageBody
        );
      } else {
        openwaResponse = await sendWhatsAppText(
          message.recipientPhone,
          message.messageBody
        );
      }

      // OpenWA success
      const msgId = typeof openwaResponse === 'object' ? openwaResponse.id || openwaResponse.response : openwaResponse;

      await prisma.whatsAppMessageQueue.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          openwaMessageId: msgId ? String(msgId) : null,
          errorMessage: null,
        },
      });

      processedCount++;
      consecutiveFailures = 0; // reset consecutive failure counter on success
    } catch (err) {
      console.error(`Failed to send WhatsApp message ${message.id}:`, err);
      consecutiveFailures++;
      
      const currentAttempts = message.attempts + 1;
      const nextStatus = currentAttempts >= 3 ? 'FAILED' : 'RETRYING';

      await prisma.whatsAppMessageQueue.update({
        where: { id: message.id },
        data: {
          status: nextStatus,
          errorMessage: err.message,
        },
      });
    }

    // Apply safe rate-limiting delay between sending messages (8-12 seconds)
    if (processedCount < messages.length && consecutiveFailures < maxConsecutiveFailures) {
      const delayMs = Math.floor(Math.random() * 4000) + 8000; // 8,000ms - 12,000ms
      console.log(`Rate-limiting: sleeping for ${delayMs}ms before the next message...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    success: true,
    processedCount,
    failures: consecutiveFailures,
  };
}
