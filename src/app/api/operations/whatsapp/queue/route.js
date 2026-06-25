import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";

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

export async function GET(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    const orgId = session.organizationId || null;
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    if (!orgId && !isSuperAdmin) {
      return NextResponse.json({ error: "Organization scope is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const status = searchParams.get("status");

    const where = {};
    if (orgId) {
      where.organizationId = orgId;
    }
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
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const orgId = session.organizationId || null;
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    if (!orgId && !isSuperAdmin) {
      return NextResponse.json({ error: "Organization scope is required" }, { status: 400 });
    }

    const body = await request.json();
    const { messageId, action } = body;

    if (action === "retry_all") {
      const result = await prisma.whatsAppMessageQueue.updateMany({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          status: { in: ["FAILED", "RETRYING"] },
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
      where: { id: messageId, ...(orgId ? { organizationId: orgId } : {}) },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Reset status to PENDING
    const updated = await prisma.whatsAppMessageQueue.update({
      where: { id: messageId },
      data: {
        status: "PENDING",
        attempts: 0,
        errorMessage: null,
        scheduledAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to modify queue" },
      { status: 500 }
    );
  }
}
