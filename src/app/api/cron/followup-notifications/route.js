import { NextResponse } from "next/server";
import {
  sendDueFollowUpEmails,
  syncDueFollowUpNotifications,
} from "@/lib/operations-center/engine";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";

import {
  triggerDailyBirthdays,
  triggerInternalOperationsDigest,
  triggerUpcomingRenewals,
} from "@/lib/whatsapp/automations";
import { processQueueBatch } from "@/lib/whatsapp/queue-manager";

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

    // Trigger WhatsApp Automations (birthdays and upcoming renewals scans)
    let whatsappScans = null;
    let whatsappBatch = null;
    try {
      console.log("Triggering daily WhatsApp automation scans from follow-up cron...");
      const birthdays = await triggerDailyBirthdays();
      const renewals = await triggerUpcomingRenewals();
      const internalDigest = await triggerInternalOperationsDigest();
      whatsappBatch = await processQueueBatch(5);
      whatsappScans = {
        birthdaysQueued: birthdays.queuedCount,
        renewalsQueued: renewals.queuedCount,
        renewalsAutoLost: renewals.autoLostCount,
        internalDigestQueued: internalDigest.queuedCount,
      };
    } catch (err) {
      console.error("Failed to trigger WhatsApp automations in cron:", err);
    }

    return NextResponse.json({
      success: true,
      synced,
      email,
      whatsappScans,
      whatsappBatch,
    });
  } catch (error) {
    console.error("Follow-up notification cron failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: getUserFacingErrorMessage(error, "Follow-up notification job failed."),
      },
      { status: 500 },
    );
  }
}
