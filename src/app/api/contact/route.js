import crypto from "crypto";
import { sendContactQueryEmail } from "@/lib/email/mailer";

const PUBLIC_SUBMIT_ERROR =
  "Unable to submit your inquiry right now. Please call us directly or try again shortly.";

async function persistContactNotification({ name, phone, email, service, message }) {
  try {
    const { prisma } = await import("@/lib/db/prisma");
    if (!prisma?.notification?.create) {
      return { saved: false, id: null };
    }

    const organization = prisma.organization?.findFirst
      ? await prisma.organization
          .findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } })
          .catch(() => null)
      : null;

    const inquiryId = crypto.randomUUID();
    const contactSummary = email ? `${phone}, ${email}` : phone;
    await prisma.notification.create({
      data: {
        organizationId: organization?.id ?? null,
        category: "SERVICE_REQUEST",
        severity: "INFO",
        title: `Website Callback Request: ${name}${service ? ` (${service})` : ""}`.slice(0, 180),
        message: `${name} (${contactSummary}): ${message}`.slice(0, 1500),
        module: "website-contact",
        recordLabel: phone.slice(0, 40),
        actionUrl: "/operations",
        sourceKey: `contact-${inquiryId}`,
        metadata: {
          inquiryId,
          name,
          phone,
          email: email || null,
          service: service || null,
          message,
        },
      },
    });
    return { saved: true, id: inquiryId };
  } catch (dbErr) {
    console.warn("[Contact API] CRM inquiry persistence skipped:", dbErr?.message || dbErr);
    return { saved: false, id: null };
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }

  try {
    const name = String(body?.name || "").trim().slice(0, 120);
    const phone = String(body?.phone || "").trim().slice(0, 40);
    const email = String(body?.email || "").trim().slice(0, 160);
    const service = String(body?.service || "").trim().slice(0, 120);
    const message = String(body?.message || "").trim().slice(0, 2000);

    if (!name || !phone || !message) {
      return Response.json(
        { success: false, error: "Missing required fields: name, phone, and message are required." },
        { status: 400 },
      );
    }

    const cleanInput = { name, phone, email, service, message };
    const persisted = await persistContactNotification(cleanInput);

    let emailSent = false;
    try {
      const result = await sendContactQueryEmail(cleanInput);
      emailSent = Boolean(result?.sent);
      if (!emailSent) {
        console.warn("[Contact API] Email notification skipped:", result?.reason || "not sent");
      }
    } catch (mailError) {
      console.error("[Contact API] Email delivery error:", mailError?.message || mailError);
    }

    if (!emailSent && !persisted.saved) {
      return Response.json(
        { success: false, error: PUBLIC_SUBMIT_ERROR },
        { status: 503 },
      );
    }

    return Response.json({
      success: true,
      emailDelivered: emailSent,
      ...(persisted.id ? { referenceId: persisted.id } : {}),
      message: "Consultation query received and notified successfully.",
    });
  } catch (error) {
    console.error("[Contact API] Unexpected failure:", error?.message || error);
    return Response.json(
      { success: false, error: PUBLIC_SUBMIT_ERROR },
      { status: 500 },
    );
  }
}
