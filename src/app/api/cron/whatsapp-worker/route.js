import { NextResponse } from "next/server";
import { triggerDailyBirthdays, triggerUpcomingRenewals } from "@/lib/whatsapp/automations";
import { processQueueBatch } from "@/lib/whatsapp/queue-manager";

export const runtime = "nodejs";

export async function GET(request) {
  return handleWorker(request);
}

export async function POST(request) {
  return handleWorker(request);
}

async function handleWorker(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    // Secure the cron endpoint
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const runScans = searchParams.get("runScans") === "true";
    let scansResult = null;

    // 1. Run daily scans if requested
    if (runScans) {
      console.log("Triggering daily WhatsApp automation scans...");
      const birthdays = await triggerDailyBirthdays();
      const renewals = await triggerUpcomingRenewals();
      scansResult = {
        birthdaysQueued: birthdays.queuedCount,
        renewalsQueued: renewals.queuedCount,
      };
    }

    // 2. Process a batch of messages from the queue
    console.log("Processing WhatsApp message queue batch...");
    const batchResult = await processQueueBatch(5);

    return NextResponse.json({
      success: true,
      scansExecuted: runScans,
      scansResult,
      batchResult,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("WhatsApp worker execution failed:", error);
    return NextResponse.json(
      { error: error.message || "Worker execution failed" },
      { status: 500 }
    );
  }
}
