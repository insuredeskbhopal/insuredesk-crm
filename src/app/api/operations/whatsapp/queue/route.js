import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireWhatsAppStaff, isWhatsAppAdmin } from "@/lib/whatsapp/account-access";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const session = await requireWhatsAppStaff(request);
    if (session.errorResponse) return session.errorResponse;

    const orgId = session.organizationId || null;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
    const status = searchParams.get("status");

    const where = { organizationId: orgId };
    if (status) {
      where.status = status;
    }

    const [messages, totalCount] = await Promise.all([
      prisma.whatsAppMessageQueue.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.whatsAppMessageQueue.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      messages,
      totalCount,
      limit,
      offset,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load queue messages" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await requireWhatsAppStaff(request, true);
    if (session.errorResponse) return session.errorResponse;

    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const orgId = session.organizationId || null;

    const body = await request.json();
    const { messageId, action } = body;

    if (action === "retry_all") {
      const result = await prisma.whatsAppMessageQueue.updateMany({
        where: {
          organizationId: orgId,
          ...(!isWhatsAppAdmin(session) ? { initiatedByUserId: session.userId } : {}),
          status: { in: ["FAILED", "RETRYING"] },
          OR: [{ messageType: "TEXT" }, { mediaUrl: { not: null } }, { fileName: { contains: "birthday" } }],
        },
        data: {
          status: "PENDING",
          attempts: 0,
          errorMessage: null,
          scheduledAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    if (!messageId) {
      return NextResponse.json({ error: "messageId or action is required" }, { status: 400 });
    }

    // Verify ownership
    const message = await prisma.whatsAppMessageQueue.findFirst({
      where: { id: messageId, organizationId: orgId },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (!isWhatsAppAdmin(session) && message.initiatedByUserId !== session.userId) return NextResponse.json({ error: "Only the initiating employee or an administrator can retry this message" }, { status: 403 });

    if (["PDF", "IMAGE"].includes(message.messageType) && !message.mediaUrl && !message.fileName?.includes("birthday")) {
      return NextResponse.json({ error: "Resend this attachment from its original CRM form; the audit record does not contain its file." }, { status: 409 });
    }

    // Recheck scope and eligibility atomically so retries cannot reset an active send.
    let updated;
    try {
      updated = await prisma.whatsAppMessageQueue.update({
        where: {
          id: messageId,
          organizationId: orgId,
          ...(!isWhatsAppAdmin(session) ? { initiatedByUserId: session.userId } : {}),
          status: { in: ["FAILED", "RETRYING"] },
        },
        data: {
          status: "PENDING",
          attempts: 0,
          errorMessage: null,
          scheduledAt: new Date(),
        },
      });
    } catch (error) {
      if (error.code !== "P2025") throw error;
      return NextResponse.json(
        { error: "Message is no longer eligible for retry. Refresh and try again." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to modify queue" },
      { status: 500 }
    );
  }
}
