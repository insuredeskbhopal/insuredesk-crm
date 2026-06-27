import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { triggerDailyBirthdays } from "@/lib/whatsapp/automations";
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

    const organizationId = session.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "Organization scope is required" }, { status: 400 });
    }

    // 1. Scan and queue all of today's birthdays for this organization
    const scanResult = await triggerDailyBirthdays({ organizationId });

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
      { status: 500 }
    );
  }
}
