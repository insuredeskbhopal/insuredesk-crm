import { verifyJWT } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getISTDateInfo } from "@/lib/presence/presence-monitor";

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || !session.id) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, type, reason, durationMinutes, until } = body;

    const targetUserId = userId || session.id;

    // If setting exception for another user, must be MANAGER, ADMIN, or SUPER_ADMIN
    if (targetUserId !== session.id && !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.role)) {
      return Response.json({ error: "Forbidden: Cannot set exception for another user" }, { status: 403 });
    }

    const ist = getISTDateInfo();
    const now = new Date();

    // Find or create daily presence
    let daily = await prisma.dailyPresence.findUnique({
      where: {
        userId_workDate: {
          userId: targetUserId,
          workDate: ist.workDate,
        },
      },
    });

    if (!daily) {
      daily = await prisma.dailyPresence.create({
        data: {
          userId: targetUserId,
          workDate: ist.workDate,
          currentStatus: "OFFLINE",
        },
      });
    }

    if (type === "CLEAR") {
      await prisma.dailyPresence.update({
        where: { id: daily.id },
        data: {
          approvedExceptionType: null,
          exceptionReason: null,
          exceptionUntil: null,
        },
      });

      await prisma.presenceEvent.create({
        data: {
          userId: targetUserId,
          dailyPresenceId: daily.id,
          eventType: "EXCEPTION_CLEARED",
          description: `Exception cleared by ${session.name || session.email}.`,
        },
      });

      return Response.json({ success: true, message: "Exception cleared" });
    }

    let calculatedUntil = null;
    if (until) {
      calculatedUntil = new Date(until);
    } else if (durationMinutes) {
      calculatedUntil = new Date(now.getTime() + parseInt(durationMinutes, 10) * 60 * 1000);
    }

    let status = "AWAY";
    if (type === "BREAK") status = "ON_BREAK";
    if (type === "FIELD_WORK") status = "FIELD_WORK";
    if (type === "LEAVE") status = "ON_LEAVE";

    await prisma.dailyPresence.update({
      where: { id: daily.id },
      data: {
        currentStatus: status,
        approvedExceptionType: type,
        exceptionReason: reason || null,
        exceptionUntil: calculatedUntil,
      },
    });

    // If user had an open incident, excuse it
    const openIncident = await prisma.presenceIncident.findFirst({
      where: {
        userId: targetUserId,
        dailyPresenceId: daily.id,
        status: { in: ["OPEN", "ESCALATED_PENDING_REVIEW"] },
      },
      orderBy: { startedAt: "desc" },
    });

    if (openIncident) {
      await prisma.presenceIncident.update({
        where: { id: openIncident.id },
        data: {
          status: "EXCUSED",
          endedAt: now,
          resolution: `Excused via approved exception (${type}): ${reason || "Approved"}`,
          reviewedBy: session.name || session.email,
          reviewedAt: now,
        },
      });
    }

    await prisma.presenceEvent.create({
      data: {
        userId: targetUserId,
        dailyPresenceId: daily.id,
        eventType: `EXCEPTION_${type}_GRANTED`,
        description: `Approved ${type} until ${calculatedUntil ? calculatedUntil.toLocaleTimeString() : "End of day"}. Reason: ${reason || "N/A"}. By: ${session.name || session.email}`,
      },
    });

    return Response.json({
      success: true,
      status,
      type,
      until: calculatedUntil,
    });
  } catch (error) {
    console.error("Error setting presence exception:", error);
    return Response.json({ error: "Failed to record exception" }, { status: 500 });
  }
}
