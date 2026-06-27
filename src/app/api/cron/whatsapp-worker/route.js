import { NextResponse } from "next/server";
import {
  triggerDailyBirthdays,
  triggerInternalOperationsDigest,
  triggerUpcomingRenewals,
} from "@/lib/whatsapp/automations";
import { processQueueBatch } from "@/lib/whatsapp/queue-manager";

export const runtime = "nodejs";

export async function GET(request) {
  return handleWorker(request);
}

export async function POST(request) {
  return handleWorker(request);
}

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = request.headers.get("authorization") || "";
  const secretParam = new URL(request.url).searchParams.get("secret") || "";

  return authHeader === `Bearer ${secret}` || secretParam === secret;
}

async function handleWorker(request) {
  try {
    // Secure the cron endpoint.
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const runScans = searchParams.get("runScans") === "true";
    let scansResult = null;

    // 1. Run daily scans if requested
    if (runScans) {
      console.log("Triggering daily WhatsApp automation scans...");
      const birthdays = await triggerDailyBirthdays();
      const renewals = await triggerUpcomingRenewals();
      const internalDigest = await triggerInternalOperationsDigest();
      scansResult = {
        birthdaysQueued: birthdays.queuedCount,
        renewalsQueued: renewals.queuedCount,
        internalDigestQueued: internalDigest.queuedCount,
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
