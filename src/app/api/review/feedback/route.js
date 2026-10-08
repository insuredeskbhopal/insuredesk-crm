import { NextResponse } from "next/server";
import { savePrivateFeedback, hashIp } from "@/lib/review/storage";
import { checkSharedRateLimit } from "@/lib/review/rate-limit";
import { sendContactQueryEmail } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const ipHash = hashIp(clientIp);

    // Production-safe shared rate limit: max 5 submissions per hour per IP
    const rateCheck = await checkSharedRateLimit(ipHash, "feedback", 5, 3600);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You have submitted feedback recently. Please wait before submitting another message.",
        },
        { status: 429, headers: { "Retry-After": String(rateCheck.resetInSeconds) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, contact, message, rating, consent, campaign, honeypot } = body;

    // Honeypot anti-spam check: bots fill hidden fields
    if (honeypot && String(honeypot).trim().length > 0) {
      // Silently return success to frustrate bots without saving spam
      return NextResponse.json({ success: true, message: "Thank you for your feedback." });
    }

    // Input validation
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage || cleanMessage.length < 5) {
      return NextResponse.json(
        { success: false, error: "Please enter your feedback message (at least 5 characters)." },
        { status: 400 }
      );
    }
    if (cleanMessage.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Feedback message exceeds the maximum allowed length (2000 characters)." },
        { status: 400 }
      );
    }

    const cleanRating = rating ? Math.min(5, Math.max(1, parseInt(rating, 10))) : null;
    const cleanName = name ? String(name).trim().slice(0, 100) : null;
    const cleanContact = contact ? String(contact).trim().slice(0, 100) : null;
    const cleanCampaign = campaign ? String(campaign).replace(/[^\w-]/g, "").slice(0, 50) : null;
    const hasConsent = Boolean(consent);

    // Persist to isolated storage
    const result = await savePrivateFeedback({
      rating: cleanRating,
      name: cleanName,
      contact: cleanContact,
      message: cleanMessage,
      consent: hasConsent,
      campaign: cleanCampaign,
      ipHash,
      userAgent: request.headers.get("user-agent") || "",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Unable to save feedback at this time. Please try again." },
        { status: 500 }
      );
    }

    // Attempt optional email notification to management desk asynchronously
    try {
      sendContactQueryEmail({
        name: cleanName || "Anonymous Customer",
        phone: cleanContact || "Not provided",
        email: cleanContact?.includes("@") ? cleanContact : "feedback-desk@bimaheadquarter.com",
        service: cleanRating ? `Private Review Feedback (${cleanRating} Stars)` : "Private Review Feedback",
        message: cleanMessage,
      }).catch((emailErr) => {
        console.warn("[Review Feedback API] Email dispatch non-fatal warning:", emailErr?.message);
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      message: "Your private feedback has been received and securely delivered to our advisory desk.",
      feedbackId: result.id,
    });
  } catch (err) {
    console.error("[Review Feedback API] Error:", err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}
