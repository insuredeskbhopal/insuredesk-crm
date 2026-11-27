import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import {
  getWhatsAppMessageStatus,
  isUncertainGatewayError,
  sendWhatsAppFile,
  sendWhatsAppImage,
  sendWhatsAppText,
  withWhatsAppIdempotencyKey,
} from "./whatsapp-client";

const MANUAL_DEDUP_WINDOW_MS = 15000;

function optExport(getter) {
  try {
    return getter();
  } catch {
    return undefined;
  }
}

function buildManualUniqueKey(context, type, recipient, args) {
  if (context.idempotencyKey) {
    return `manual:${context.organizationId || "global"}:${context.accountId}:${context.idempotencyKey}`;
  }
  const bodyText = String(type === "TEXT" ? args[0] || "" : args[2] || "");
  const fileName = type === "TEXT" ? "" : String(args[1] || "");
  const digest = createHash("sha256")
    .update(`${type}|${recipient}|${bodyText}|${fileName}`)
    .digest("hex")
    .slice(0, 16);
  const bucket = Math.floor(Date.now() / MANUAL_DEDUP_WINDOW_MS);
  return `manual:${context.organizationId || "global"}:${context.accountId}:${digest}:${bucket}`;
}

// The caller resolves the authenticated sender once for the entire operation.
export async function dispatchWhatsApp(context, type, recipient, ...args) {
  if (!context.accountId) throw new Error("A validated WhatsApp sender is required");

  const uniqueKey = buildManualUniqueKey(context, type, recipient, args);
  let message;
  try {
    message = await prisma.whatsAppMessageQueue.create({
      data: {
        organizationId: context.organizationId,
        initiatedByUserId: context.userId || null,
        accountId: context.accountId,
        recipientPhone: recipient,
        recipientName: context.recipientName || "Customer",
        messageType: type,
        messageBody: String(type === "TEXT" ? args[0] || "" : args[2] || ""),
        fileName: type === "TEXT" ? null : args[1],
        uniqueKey,
        status: "SENDING",
        attempts: 1,
      },
    });
  } catch (createError) {
    if (createError?.code !== "P2002") throw createError;
    const existing = typeof prisma.whatsAppMessageQueue.findFirst === "function"
      ? await prisma.whatsAppMessageQueue.findFirst({ where: { uniqueKey } })
      : null;
    if (existing?.status === "SENT") {
      return {
        id: existing.openwaMessageId || null,
        success: true,
        deduplicated: true,
        accountId: context.accountId,
        messageReference: existing.id,
      };
    }
    throw Object.assign(
      new Error("Duplicate WhatsApp send suppressed: matching request is already in flight or awaiting confirmation."),
      { status: 409, duplicate: true },
    );
  }

  const idempotencyFn = optExport(() => withWhatsAppIdempotencyKey);
  const runWithIdempotency =
    typeof idempotencyFn === "function"
      ? (fn) => idempotencyFn(message.id, fn)
      : (fn) => fn();

  try {
    const send = type === "TEXT" ? sendWhatsAppText : type === "IMAGE" ? sendWhatsAppImage : sendWhatsAppFile;
    const result = await runWithIdempotency(() => send(recipient, ...args, context.accountId));
    await prisma.whatsAppMessageQueue.update({
      where: { id: message.id },
      data: { status: "SENT", sentAt: new Date(), openwaMessageId: result.id ? String(result.id) : null, errorMessage: null },
    });
    return { ...result, accountId: context.accountId, messageReference: message.id };
  } catch (error) {
    const uncertainFn = optExport(() => isUncertainGatewayError);
    const isUncertain = typeof uncertainFn === "function" && uncertainFn(error);
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
        return {
          id: check.entry.id || null,
          success: true,
          recovered: true,
          accountId: context.accountId,
          messageReference: message.id,
        };
      }

      await prisma.whatsAppMessageQueue.update({
        where: { id: message.id },
        data: {
          status: "UNCERTAIN",
          errorMessage: `Uncertain delivery (${error.message}); verify recipient before retrying.`,
        },
      });
      throw Object.assign(error, { uncertainDelivery: true, messageReference: message.id });
    }

    await prisma.whatsAppMessageQueue.update({
      where: { id: message.id },
      data: { status: "FAILED", errorMessage: error.message },
    });
    throw error;
  }
}
