import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    
    // Webhook auth check: we can pass a secret in query param e.g. ?secret=...
    const webhookSecret = searchParams.get("secret");
    if (process.env.OPENWA_WEBHOOK_SECRET && webhookSecret !== process.env.OPENWA_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    console.log("Received OpenWA webhook event:", JSON.stringify(payload, null, 2));

    const event = payload.event; // e.g. "message", "stateChanged", "ack", etc.
    const data = payload.data;

    // Resolve organization
    let organizationId = orgId;
    if (!organizationId) {
      // Find the first organization as default fallback
      const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
      organizationId = firstOrg?.id || null;
    }

    if (!organizationId) {
      console.warn("No organization found to scope webhook event");
      return NextResponse.json({ success: true, warning: "no_org" });
    }

    if (event === "stateChanged" || payload.type === "stateChanged") {
      const state = data || payload.state;
      console.log(`OpenWA Session state changed to: ${state}`);

      if (state === "UNPAIRED" || state === "DISCONNECTED") {
        // Create a warning notification for the system
        const sourceKey = `whatsapp_disconnected:${organizationId}:${Date.now()}`;
        await prisma.notification.create({
          data: {
            organizationId,
            category: "SYSTEM",
            severity: "CRITICAL",
            title: "WhatsApp Session Disconnected",
            message: "Your OpenWA WhatsApp session has disconnected. Please go to the WhatsApp Settings page to scan the QR code and re-authenticate.",
            module: "whatsapp-setup",
            actionUrl: "/operations/whatsapp-setup",
            sourceKey,
            metadata: { state },
          },
        });
      }
    } else if (event === "message" || payload.type === "message") {
      const message = data || payload.message;
      const isGroup = message.isGroupMsg || message.chat?.isGroup;
      
      // We only care about direct incoming replies from customers
      if (!message.fromMe && !isGroup) {
        const fromNumber = message.from ? message.from.split("@")[0] : "";
        const bodyText = message.body || "";
        const senderName = message.sender?.name || message.chat?.contact?.name || "Customer";

        console.log(`Incoming customer WhatsApp message from ${fromNumber} (${senderName}): ${bodyText}`);

        // Try to match customer profile
        const last10 = fromNumber.slice(-10);
        const profile = await prisma.customerProfile.findFirst({
          where: {
            phone: { contains: last10 },
            deletedAt: null,
            organizationId,
          },
        });

        const sourceKey = `whatsapp_reply:${fromNumber}:${Date.now()}`;
        await prisma.notification.create({
          data: {
            organizationId,
            category: "CUSTOMER",
            severity: "INFO",
            title: `WhatsApp Reply from ${senderName}`,
            message: bodyText.length > 100 ? `${bodyText.substring(0, 100)}...` : bodyText,
            module: "customer-profiles",
            recordId: profile?.id || null,
            recordLabel: profile ? profile.name : fromNumber,
            actionUrl: profile ? `/operations/birthday-management` : null, // or customer profile detail if page exists
            sourceKey,
            metadata: {
              from: fromNumber,
              body: bodyText,
              messageId: message.id,
            },
          },
        });
      }
    } else if (event === "ack" || payload.type === "ack") {
      // Message delivery receipt updates (sent, delivered, read)
      const ack = data || payload.ack;
      const messageId = payload.id || (data && data.id);
      console.log(`WhatsApp message ack received. MsgId: ${messageId}, Ack: ${ack}`);
      
      if (messageId) {
        // Find message in queue and update openwaMessageId or status
        const queueItem = await prisma.whatsAppMessageQueue.findFirst({
          where: { openwaMessageId: String(messageId) },
        });
        if (queueItem) {
          // If ack is -1 (error) or similar, we could log it
          if (ack === -1) {
            await prisma.whatsAppMessageQueue.update({
              where: { id: queueItem.id },
              data: {
                status: "FAILED",
                errorMessage: "Failed to deliver (OpenWA delivery ack -1)",
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
