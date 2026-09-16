import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { sendWhatsAppText, sendWhatsAppImage, sendWhatsAppFile } from "@/lib/whatsapp/whatsapp-client";

export const runtime = "nodejs";

function buildDefaultAgentSignature(session) {
  return [
    "*Warm regards,*",
    "",
    `*${session.name || session.email || "CRM Team"}*`,
    "Insurance Advisor",
    "",
    "*Bima Headquarter*",
    "by *InsureDesk IMF Pvt. Ltd.*",
    "",
    "Phone: +91 88188 89660",
    "Email: insuredeskbhopal@gmail.com",
    "Website: www.bimaheadquarter.com",
    "",
    "*Comprehensive Insurance Solutions*",
    "Motor Insurance • Health Insurance • Life Insurance • Commercial Insurance • Marine Insurance • Policy Renewals • Claims Assistance",
  ].join("\n");
}

function hasExistingSignature(message) {
  const text = String(message || "").toLowerCase();
  return [
    "*comprehensive insurance solutions*",
    "team bimaheadquarter",
    "bima headquarter",
    "insuredesk imf",
    "your trusted insurance partner",
  ].some((marker) => text.includes(marker));
}

function withAgentSignature(message, signature) {
  const text = String(message || "").trim();
  const signOff = String(signature || "").trim();
  if (!signOff || hasExistingSignature(text)) return text;
  return `${text}\n\n${signOff}`;
}

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session) {
    return { errorResponse: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }
  return session;
}

async function resolveAttachmentPayload(attachment = {}) {
  const attachmentData = attachment.mediaBase64 || attachment.data || attachment.attachmentData || attachment.base64 || "";
  const attachmentUrl = attachment.attachmentUrl || attachment.url || attachment.mediaUrl || "";
  const rawFilename = String(attachment.filename || attachment.attachmentFileName || attachment.fileName || attachment.name || "").trim();
  const isPdf = String(attachment.mediaType || attachment.type || attachment.attachmentType || "").toLowerCase() === "document" ||
    rawFilename.toLowerCase().endsWith(".pdf") ||
    String(attachmentData).startsWith("data:application/pdf") ||
    String(attachmentUrl).toLowerCase().endsWith(".pdf");

  const attachmentType = isPdf ? "document" : "image";
  const filename = rawFilename || (isPdf ? "quote.pdf" : "quote.jpg");
  const caption = attachment.caption || attachment.messageBody || "";

  if (attachmentData) {
    return {
      mediaBase64: String(attachmentData),
      mediaType: attachmentType,
      filename,
      caption,
    };
  }

  if (!attachmentUrl) return null;

  try {
    const response = await fetch(attachmentUrl);
    if (!response.ok) {
      throw new Error(`Could not download attachment from ${attachmentUrl}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      mediaBase64: buffer.toString("base64"),
      mediaType: attachmentType,
      filename,
      caption,
    };
  } catch (error) {
    console.error("Failed to resolve quoted attachment:", error);
    return null;
  }
}

export async function POST(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const recipient = body.recipient || body.phone;
    const { message } = body;
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    if (!recipient || (!message && attachments.length === 0 && !body.attachBirthdayCard)) {
      return NextResponse.json({ error: "Recipient and a message or attachment are required" }, { status: 400 });
    }

    const signedMessage = body.attachBirthdayCard
      ? String(message || "").trim()
      : withAgentSignature(message, body.signature || buildDefaultAgentSignature(session));
    console.log(`Sending WhatsApp message to ${String(recipient).endsWith("@g.us") ? "a group" : "an individual"}...`);

    // Render personalized birthday card directly in memory on-the-fly and dispatch
    if (body.attachBirthdayCard) {
      const { generateBirthdayCard } = await import("@/lib/birthday/card-renderer");
      const card = await generateBirthdayCard({ recipientName: body.recipientName || "Valued Client" });
      const { sendWhatsAppImage } = await import("@/lib/whatsapp/whatsapp-client");
      const imgRes = await sendWhatsAppImage(
        recipient,
        card.base64,
        "birthday_greeting.jpg",
        signedMessage
      );
      return NextResponse.json({
        success: true,
        messageId: imgRes.id || null,
      });
    }

    const resolvedAttachments = [];
    for (const attachment of attachments) {
      const resolved = await resolveAttachmentPayload(attachment);
      if (resolved) resolvedAttachments.push(resolved);
    }

    const responses = [];

    if (resolvedAttachments.length > 0) {
      // Send the image with the full renewal message as its caption (unified WhatsApp media message)
      const primaryAttachment = resolvedAttachments[0];
      const captionText = signedMessage || primaryAttachment.caption || "";

      if (primaryAttachment.mediaType === "document") {
        const docRes = await sendWhatsAppFile(recipient, primaryAttachment.mediaBase64, primaryAttachment.filename, captionText);
        responses.push(docRes);
      } else {
        const imgRes = await sendWhatsAppImage(recipient, primaryAttachment.mediaBase64, primaryAttachment.filename, captionText);
        responses.push(imgRes);
      }

      // Send any additional attachments
      for (let i = 1; i < resolvedAttachments.length; i++) {
        const att = resolvedAttachments[i];
        const attRes = att.mediaType === "document"
          ? await sendWhatsAppFile(recipient, att.mediaBase64, att.filename, att.caption)
          : await sendWhatsAppImage(recipient, att.mediaBase64, att.filename, att.caption);
        responses.push(attRes);
      }
    } else if (signedMessage) {
      // No attachments: send plain text message
      const textRes = await sendWhatsAppText(recipient, signedMessage);
      responses.push(textRes);
    }

    const firstResponse = responses[0];
    const msgId = typeof firstResponse === 'object' ? firstResponse.id || firstResponse.response : firstResponse;

    return NextResponse.json({
      success: true,
      messageId: msgId ? String(msgId) : null,
      response: firstResponse,
      attachmentCount: resolvedAttachments.length,
    });
  } catch (error) {
    console.error("Failed to send WhatsApp test message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send test message" },
      { status: 500 }
    );
  }
}
