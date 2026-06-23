import { NextResponse } from "next/server";
import {
  sendDueFollowUpEmails,
  syncDueFollowUpNotifications,
} from "@/lib/operations-center/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;

  const auth = request.headers.get("authorization") || "";
  const headerSecret = request.headers.get("x-cron-secret") || "";
  return auth === `Bearer ${secret}` || headerSecret === secret;
}

export async function GET(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const synced = await syncDueFollowUpNotifications();
    const email = await sendDueFollowUpEmails();

    return NextResponse.json({
      success: true,
      synced,
      email,
    });
  } catch (error) {
    console.error("Follow-up notification cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Follow-up notification job failed.",
      },
      { status: 500 },
    );
  }
}
