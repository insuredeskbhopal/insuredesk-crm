import { NextResponse } from "next/server";
import { requireWhatsAppStaff, resolveWhatsAppSender } from "@/lib/whatsapp/account-access";
import { syncDueFollowUpNotifications } from "@/lib/operations-center/engine";
import {
  triggerDailyBirthdays,
  triggerInternalOperationsDigest,
  triggerUpcomingRenewals,
} from "@/lib/whatsapp/automations";
import { processQueueBatch } from "@/lib/whatsapp/queue-manager";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const session = await requireWhatsAppStaff(request, true);
    if (session.errorResponse) return session.errorResponse;
    await resolveWhatsAppSender(session);

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
    const birthdays = await triggerDailyBirthdays({ organizationId, initiatedByUserId: session.userId });
    const renewals = await triggerUpcomingRenewals({ organizationId, initiatedByUserId: session.userId });
    const internalDigest = await triggerInternalOperationsDigest({ organizationId, initiatedByUserId: session.userId });
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
      { status: error.status || 500 }
    );
  }
}
