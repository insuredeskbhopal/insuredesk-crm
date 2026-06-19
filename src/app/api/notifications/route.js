import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getNotificationFeed, markNotificationsRead } from "@/lib/operations-center/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100);
    const feed = await getNotificationFeed(auth.session, limit);

    return NextResponse.json({ success: true, ...feed });
  } catch (error) {
    console.error("Failed to load notifications:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Notifications could not be loaded.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const result = await markNotificationsRead(auth.session, ids);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Failed to update notifications:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Notifications could not be updated.",
      },
      { status: 500 },
    );
  }
}
