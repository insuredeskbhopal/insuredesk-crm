import { NextResponse } from "next/server";
import { requireWhatsAppStaff, resolveWhatsAppSender } from "@/lib/whatsapp/account-access";
import { triggerDailyBirthdays } from "@/lib/whatsapp/automations";
import { processQueueBatch } from "@/lib/whatsapp/queue-manager";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const session = await requireWhatsAppStaff(request, true);
    if (session.errorResponse) return session.errorResponse;
    await resolveWhatsAppSender(session);



    if (session.role === "VIEWER") {
      return NextResponse.json(
        { error: "Unauthorized: Viewer role has read-only access and cannot send birthday wishes" },
        { status: 403 }
      );
    }

    const organizationId = session.organizationId || null;

    // 1. Scan and queue all of today's birthdays for this organization
    const scanResult = await triggerDailyBirthdays({ organizationId, initiatedByUserId: session.userId });

    // 2. Process/send messages in background if any were enqueued
    if (scanResult.queuedCount > 0) {
      // Process a batch (up to 100) asynchronously to not block the response
      processQueueBatch(100).catch((err) => {
        console.error("Failed to run queued birthday wishes in background:", err);
      });
    }

    return NextResponse.json({
      success: true,
      queuedCount: scanResult.queuedCount,
    });
  } catch (error) {
    console.error("Birthday wishes send-all failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger sending wishes" },
      { status: error.status || 500 }
    );
  }
}
