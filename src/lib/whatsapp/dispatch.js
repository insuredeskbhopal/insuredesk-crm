import { prisma } from "@/lib/db/prisma";
import { sendWhatsAppText, sendWhatsAppImage, sendWhatsAppFile } from "./whatsapp-client";

// The caller resolves the authenticated sender once for the entire operation.
export async function dispatchWhatsApp(context, type, recipient, ...args) {
  if (!context.accountId || !context.organizationId) throw new Error("A validated WhatsApp sender is required");
  const message = await prisma.whatsAppMessageQueue.create({ data: {
    organizationId: context.organizationId, initiatedByUserId: context.userId || null,
    accountId: context.accountId, recipientPhone: recipient, recipientName: context.recipientName || "Customer",
    messageType: type, messageBody: String(type === "TEXT" ? args[0] || "" : args[2] || ""),
    fileName: type === "TEXT" ? null : args[1], status: "SENDING", attempts: 1,
  } });
  try {
    const send = type === "TEXT" ? sendWhatsAppText : type === "IMAGE" ? sendWhatsAppImage : sendWhatsAppFile;
    const result = await send(recipient, ...args, context.accountId);
    await prisma.whatsAppMessageQueue.update({ where: { id: message.id }, data: { status: "SENT", sentAt: new Date(), openwaMessageId: result.id ? String(result.id) : null } });
    return { ...result, accountId: context.accountId, messageReference: message.id };
  } catch (error) {
    await prisma.whatsAppMessageQueue.update({ where: { id: message.id }, data: { status: "FAILED", errorMessage: error.message } });
    throw error;
  }
}
