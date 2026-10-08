import { NextResponse } from "next/server";
import { ALLOWED_EVENT_TYPES, ALLOWED_CHANNELS } from "@/lib/review/config";
import { recordReviewEvent, hashIp } from "@/lib/review/storage";
import { checkSharedRateLimit } from "@/lib/review/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const ipHash = hashIp(clientIp);

    // Shared rate limit: max 60 events per minute per IP
    const rateCheck = await checkSharedRateLimit(ipHash, "track", 60, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rateCheck.resetInSeconds) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { eventType, campaign, source, channel, lang, metadata } = body;

    // Validate event type
    if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json({ success: false, error: "Invalid event type" }, { status: 400 });
    }

    // Sanitize parameters
    const safeCampaign = campaign ? String(campaign).replace(/[^\w-]/g, "").slice(0, 50) : null;
    const safeSource = source ? String(source).replace(/[^\w-]/g, "").slice(0, 50) : null;
    const safeChannel = ALLOWED_CHANNELS.includes(channel) ? channel : null;
    const safeLang = lang === "hi" ? "hi" : "en";

    await recordReviewEvent({
      eventType,
      campaign: safeCampaign,
      source: safeSource,
      channel: safeChannel,
      lang: safeLang,
      ipHash,
      userAgent: request.headers.get("user-agent") || "",
      metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Review Tracking API] Error:", err);
    return NextResponse.json({ success: false, error: "Internal tracking error" }, { status: 500 });
  }
}
