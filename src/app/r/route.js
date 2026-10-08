import { NextResponse } from "next/server";
import { DEFAULT_GOOGLE_REVIEW_URL, ALLOWED_CHANNELS } from "@/lib/review/config";
import { recordReviewEvent, hashIp } from "@/lib/review/storage";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Extract attribution parameters safely
  const rawCampaign = searchParams.get("c") || searchParams.get("campaign") || "direct";
  const rawSource = searchParams.get("src") || searchParams.get("source") || searchParams.get("utm_source") || "shortcut";
  const rawChannel = searchParams.get("ch") || searchParams.get("channel") || "redirect";

  // Sanitize
  const campaign = String(rawCampaign).replace(/[^\w-]/g, "").slice(0, 50) || "direct";
  const source = String(rawSource).replace(/[^\w-]/g, "").slice(0, 50) || "shortcut";
  const channel = ALLOWED_CHANNELS.includes(rawChannel) ? rawChannel : "redirect";

  // Get client details for privacy-conscious analytics
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const ipHash = hashIp(clientIp);
  const userAgent = request.headers.get("user-agent") || "";

  // Asynchronously record event without blocking user redirect
  recordReviewEvent({
    eventType: "review_shortlink_redirect",
    campaign,
    source,
    channel,
    ipHash,
    userAgent,
    metadata: {
      url: request.url,
      referrer: request.headers.get("referer") || "",
    },
  }).catch((err) => {
    console.warn("[Redirect /r] Non-fatal tracking error:", err?.message);
  });

  // Perform temporary 307 redirect directly to official Google review destination
  // Destination strictly comes from trusted server config, never from query parameters!
  const response = NextResponse.redirect(DEFAULT_GOOGLE_REVIEW_URL, { status: 307 });
  response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}
