import { resolveWhatsAppSender, authorizedAccount } from "./account-access";
import { prisma } from "@/lib/db/prisma";
import {
  getWhatsAppMessageStatus,
  isUncertainGatewayError,
  sendWhatsAppFile,
  sendWhatsAppImage,
  sendWhatsAppText,
  withWhatsAppIdempotencyKey,
} from "./whatsapp-client";

const DEFAULT_STALE_SENDING_MS = 5 * 60 * 1000;

function optExport(getter) {
  try {
    return getter();
  } catch {
    return undefined;
  }
}

// Replaces template placeholders with variable values
export function compileTemplate(body, variables = {}) {
  if (!body) return "";
  let compiled = body;
  const keys = [
    "customerName",
    "companyName",
    "policyNumber",
    "policyType",
    "expiryDate",
    "agentName",
  ];
  for (const key of keys) {
    const value = variables[key] || "";
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    compiled = compiled.replace(regex, value);
  }
  return compiled;
}

// Safely enqueues a WhatsApp message, locking fixed accountId at enqueue time
export async function enqueueMessage({
  organizationId,
  recipientPhone,
  recipientName,
  messageType = "TEXT",
  messageBody,
  mediaUrl = null,
  fileName = null,
  caption = null,
  uniqueKey = null,
  scheduledAt = new Date(),
  accountId = null,
  initiatedByUserId = null,
}) {
  if (!recipientPhone) {
    throw new Error("recipientPhone is required to enqueue a message");
  }

  const lockedAccountId = await resolveWhatsAppSender({ userId: initiatedByUserId, organizationId });
  if (accountId && accountId !== lockedAccountId) {
    throw new Error("Sender differs from the authorized primary WhatsApp account");
  }

  try {
    const message = await prisma.whatsAppMessageQueue.create({
      data: {
        organizationId,
        recipientPhone,
        recipientName: recipientName || "Customer",
        messageType,
        messageBody,
        mediaUrl,
        fileName,
        caption,
        uniqueKey,
        scheduledAt,
        accountId: lockedAccountId,
        initiatedByUserId,
        status: "PENDING",
      },
    });
    return { success: true, message };
  } catch (error) {
    if (error.code === "P2002") {
      console.log(`Duplicate prevention triggered: message with unique key ${uniqueKey} already exists. Skipping.`);
      return { success: false, duplicate: true };
    }
    console.error("Error enqueuing WhatsApp message:", error);
    throw error;
  }
}

/**
 * Reconciles abandoned SENDING claims older than staleThresholdMs without blindly resending.
 */
export async function recoverStaleSendingMessages({ staleThresholdMs } = {}) {
  const threshold = Number.isFinite(staleThresholdMs)
    ? staleThresholdMs
    : parseInt(process.env.WHATSAPP_STALE_SENDING_MS || String(DEFAULT_STALE_SENDING_MS), 10);
  const cutoff = new Date(Date.now() - Math.max(30000, threshold));

  const candidates = await prisma.whatsAppMessageQueue.findMany({
    where: { status: "SENDING", updatedAt: { lt: cutoff } },
    orderBy: { updatedAt: "asc" },
    take: 20,
  });

  // Guard for partial unit test mocks that return all mocked rows regardless of `where`
  const staleRows = (candidates || []).filter((row) => row?.status === "SENDING");
  let recoveredSent = 0;
  let markedUncertain = 0;

  for (const row of staleRows) {
    const statusFn = optExport(() => getWhatsAppMessageStatus);
    const check = typeof statusFn === "function"
      ? await statusFn(row.id).catch(() => null)
      : null;

    if (check?.found && check.entry?.status === "SENT") {
      const updated = await prisma.whatsAppMessageQueue.updateMany({
        where: { id: row.id, status: "SENDING" },
        data: {
          status: "SENT",
          sentAt: check.entry.recordedAt ? new Date(check.entry.recordedAt) : new Date(),
          openwaMessageId: check.entry.id ? String(check.entry.id) : null,
          errorMessage: null,
        },
      });
      if (updated?.count) recoveredSent++;
      continue;
    }

    const updated = await prisma.whatsAppMessageQueue.updateMany({
      where: { id: row.id, status: "SENDING" },
      data: {
        status: "UNCERTAIN",
        errorMessage: "Interrupted while SENDING; delivery unverified. Verify before retrying.",
      },
    });
    if (updated?.count) markedUncertain++;
  }

  return { recoveredSent, markedUncertain };
}

// Process a batch of pending/retrying messages
export async function processQueueBatch(limit = 5) {
  await recoverStaleSendingMessages().catch((err) => {
    console.warn("Stale SENDING recovery notice:", err?.message || err);
  });

  const hourlyLimit = parseInt(process.env.OPENWA_BATCH_LIMIT_PER_HOUR || "60", 10);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const sentInLastHour = await prisma.whatsAppMessageQueue.count({
    where: {
      status: "SENT",
      sentAt: { gte: oneHourAgo },
    },
  });

  if (sentInLastHour >= hourlyLimit) {
    console.warn(`Hourly batch limit of ${hourlyLimit} messages reached (sent in last hour: ${sentInLastHour}). Aborting queue processing.`);
    return { success: false, reason: "HOURLY_LIMIT_REACHED" };
  }

  const messages = await prisma.whatsAppMessageQueue.findMany({
    where: {
      status: { in: ["PENDING", "RETRYING"] },
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
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

    const claimed = await prisma.whatsAppMessageQueue.updateMany({
      where: { id: message.id, status: { in: ["PENDING", "RETRYING"] } },
      data: {
        status: "SENDING",
        attempts: { increment: 1 },
      },
    });
    if (!claimed.count) continue;

    const targetAccountId = message.accountId || null;

    const idempotencyFn = optExport(() => withWhatsAppIdempotencyKey);
    const runWithIdempotency =
      typeof idempotencyFn === "function"
        ? (fn) => idempotencyFn(message.id, fn)
        : (fn) => fn();

    try {
      if (!targetAccountId) {
        throw new Error("Queued message has no authorized sender; administrator review required");
      }
      // Keep the original sender when a user changes their primary, but recheck revoked access.
      if (message.initiatedByUserId) {
        const user = await prisma.user.findFirst({
          where: { id: message.initiatedByUserId, organizationId: message.organizationId, deletedAt: null, role: { not: "VIEWER" } },
        });
        if (!user) throw new Error("Initiating staff member is no longer authorized");
        await authorizedAccount(message.initiatedByUserId, message.organizationId, targetAccountId);
      } else {
        const org = message.organizationId
          ? await prisma.organization.findUnique({ where: { id: message.organizationId } })
          : null;
        const legacy = message.organizationId
          ? null
          : await prisma.whatsAppAccount.findFirst({ where: { id: targetAccountId, organizationId: null, isSystemSender: true } });
        if (message.organizationId ? org?.systemWhatsAppAccountId !== targetAccountId : !legacy) {
          throw new Error("Queued system sender is no longer authorized");
        }
      }

      let openwaResponse;
      if (message.messageType === "IMAGE") {
        let mediaPayload = message.mediaUrl;
        if (!mediaPayload || message.fileName?.includes("birthday")) {
          const { generateBirthdayCard } = await import("@/lib/birthday/card-renderer");
          const card = await generateBirthdayCard({ recipientName: message.recipientName });
          mediaPayload = card.base64;
        }

        openwaResponse = await runWithIdempotency(() =>
          sendWhatsAppImage(
            message.recipientPhone,
            mediaPayload,
            "birthday_greeting.jpg",
            message.caption || message.messageBody,
            targetAccountId,
          ),
        );
      } else if (message.messageType === "PDF") {
        openwaResponse = await runWithIdempotency(() =>
          sendWhatsAppFile(
            message.recipientPhone,
            message.mediaUrl,
            message.fileName,
            message.caption || message.messageBody,
            targetAccountId,
          ),
        );
      } else {
        openwaResponse = await runWithIdempotency(() =>
          sendWhatsAppText(
            message.recipientPhone,
            message.messageBody,
            targetAccountId,
          ),
        );
      }

      const msgId = typeof openwaResponse === "object" ? openwaResponse.id || openwaResponse.response : openwaResponse;

      await prisma.whatsAppMessageQueue.update({
        where: { id: message.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          openwaMessageId: msgId ? String(msgId) : null,
          errorMessage: null,
        },
      });

      processedCount++;
      consecutiveFailures = 0;
    } catch (err) {
      console.error(`Failed to send WhatsApp message ${message.id} via account '${targetAccountId || "default"}':`, err);

      const uncertainFn = optExport(() => isUncertainGatewayError);
      const isUncertain = typeof uncertainFn === "function" && uncertainFn(err);
      if (isUncertain) {
        const statusFn = optExport(() => getWhatsAppMessageStatus);
        const check = typeof statusFn === "function"
          ? await statusFn(message.id).catch(() => null)
          : null;
        if (check?.found && check.entry?.status === "SENT") {
          await prisma.whatsAppMessageQueue.update({
            where: { id: message.id },
            data: {
              status: "SENT",
              sentAt: new Date(),
              openwaMessageId: check.entry.id ? String(check.entry.id) : null,
              errorMessage: null,
            },
          });
          processedCount++;
          consecutiveFailures = 0;
          continue;
        }

        consecutiveFailures++;
        await prisma.whatsAppMessageQueue.update({
          where: { id: message.id },
          data: {
            status: "UNCERTAIN",
            errorMessage: `Uncertain delivery (${err.message}); automatic retry halted to avoid duplicates.`,
          },
        });
      } else {
        consecutiveFailures++;
        const currentAttempts = (message.attempts || 0) + 1;
        const nextStatus = currentAttempts >= 3 ? "FAILED" : "RETRYING";

        // Strictly record failure on the stamped account. NEVER automatically re-route to another account!
        await prisma.whatsAppMessageQueue.update({
          where: { id: message.id },
          data: {
            status: nextStatus,
            errorMessage: err.message,
          },
        });
      }
    }

    // Apply safe rate-limiting delay between sending messages (8-12 seconds in production)
    if (processedCount < messages.length && consecutiveFailures < maxConsecutiveFailures && process.env.NODE_ENV !== "test") {
      const delayMs = Math.floor(Math.random() * 4000) + 8000;
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
