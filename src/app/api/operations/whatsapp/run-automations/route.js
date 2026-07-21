import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { syncDueFollowUpNotifications } from "@/lib/operations-center/engine";
import {
  triggerDailyBirthdays,
  triggerInternalOperationsDigest,
  triggerUpcomingRenewals,
} from "@/lib/whatsapp/automations";
import { processQueueBatch } from "@/lib/whatsapp/queue-manager";

export const runtime = "nodejs";

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session) {
    return { errorResponse: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }
  return session;
}

export async function POST(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const organizationId = session.role === "SUPER_ADMIN" ? session.organizationId || undefined : session.organizationId;
    if (!organizationId && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Organization scope is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const batchLimit = Math.max(1, Math.min(parseInt(body.batchLimit || "5", 10) || 5, 10));

    const synced = await syncDueFollowUpNotifications();
    const birthdays = await triggerDailyBirthdays({ organizationId });
    const renewals = await triggerUpcomingRenewals({ organizationId });
    const internalDigest = await triggerInternalOperationsDigest({ organizationId });
    const batch = await processQueueBatch(batchLimit);

    return NextResponse.json({
      success: true,
      synced,
      scans: {
        birthdaysQueued: birthdays.queuedCount,
        renewalsQueued: renewals.queuedCount,
        internalDigestQueued: internalDigest.queuedCount,
      },
      batch,
    });
  } catch (error) {
    console.error("Manual WhatsApp automation run failed:", error);
    return NextResponse.json(
      { error: error.message || "Manual WhatsApp automation run failed" },
      { status: 500 }
    );
  }
}
