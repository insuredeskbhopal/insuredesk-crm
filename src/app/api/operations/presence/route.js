import { verifyJWT } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db/prisma";
import { getISTDateInfo, evaluateStaffPresence } from "@/lib/presence/presence-monitor";

const prisma = defaultPrisma?.dailyPresence ? defaultPrisma : new PrismaClient();

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || !session.id) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const specificUserId = searchParams.get("userId");
    const ist = getISTDateInfo();
    const now = new Date();
    const ninetySecondsAgo = new Date(now.getTime() - 90 * 1000);

    // If requesting specific user details for slide-over drawer
    if (specificUserId) {
      const user = await prisma.user.findUnique({
        where: { id: specificUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          whatsappPhone: true,
          presenceMonitored: true,
          createdAt: true,
        },
      });

      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      const daily = await prisma.dailyPresence.findUnique({
        where: {
          userId_workDate: {
            userId: specificUserId,
            workDate: ist.workDate,
          },
        },
        include: {
          sessions: {
            where: { endedAt: null },
            orderBy: { lastHeartbeatAt: "desc" },
          },
          incidents: {
            orderBy: { startedAt: "desc" },
          },
          events: {
            orderBy: { createdAt: "desc" },
            take: 30,
          },
        },
      });

      return Response.json({
        success: true,
        user,
        daily,
        ist,
      });
    }

    // Role check: AGENT can only see their own row, MANAGER/ADMIN/SUPER_ADMIN sees all
    const isRestrictedAgent = session.role === "AGENT";

    const userWhere = {
      deletedAt: null,
      role: { not: "SUPER_ADMIN" },
    };

    if (isRestrictedAgent) {
      userWhere.id = session.id;
    }

    const monitoredUsers = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        whatsappPhone: true,
      },
      orderBy: { name: "asc" },
    });

    const userIds = monitoredUsers.map((u) => u.id);

    // Get today's daily presence records for these users
    const dailyRecords = await prisma.dailyPresence.findMany({
      where: {
        userId: { in: userIds },
        workDate: ist.workDate,
      },
      include: {
        incidents: {
          where: { status: { in: ["OPEN", "ESCALATED_PENDING_REVIEW"] } },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    const dailyMap = new Map();
    for (const d of dailyRecords) {
      dailyMap.set(d.userId, d);
    }

    // Get active sessions count per user
    const activeSessions = await prisma.presenceSession.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        endedAt: null,
        lastHeartbeatAt: { gte: ninetySecondsAgo },
      },
      _count: { id: true },
    });

    const sessionCountMap = new Map();
    for (const s of activeSessions) {
      sessionCountMap.set(s.userId, s._count.id);
    }

    // Build staff list
    let onlineCount = 0;
    let onBreakCount = 0;
    let fieldWorkCount = 0;
    let onLeaveCount = 0;
    let offlineCount = 0;
    let warningsToday = 0;
    let escalatedCount = 0;

    const staffList = monitoredUsers.map((user) => {
      const daily = dailyMap.get(user.id);
      const activeTabs = sessionCountMap.get(user.id) || 0;

      let status = "OFFLINE";
      if (daily?.approvedExceptionType === "BREAK") {
        status = "ON_BREAK";
        onBreakCount++;
      } else if (daily?.approvedExceptionType === "FIELD_WORK") {
        status = "FIELD_WORK";
        fieldWorkCount++;
      } else if (daily?.approvedExceptionType === "LEAVE") {
        status = "ON_LEAVE";
        onLeaveCount++;
      } else if (activeTabs > 0) {
        status = "ONLINE";
        onlineCount++;
      } else {
        status = "OFFLINE";
        offlineCount++;
      }

      const activeIncident = daily?.incidents?.[0] || null;
      if (activeIncident?.status === "ESCALATED_PENDING_REVIEW") {
        escalatedCount++;
      }

      const userWarnings = daily?.warningCount || 0;
      warningsToday += userWarnings;

      return {
        id: user.id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        role: user.role,
        whatsappPhone: user.whatsappPhone,
        status,
        activeTabs,
        firstLoginAt: daily?.firstLoginAt || null,
        lastSeenAt: daily?.lastSeenAt || null,
        shiftEnd: daily?.shiftEnd || null,
        effectiveOut: daily?.shiftEnd || (status === "OFFLINE" ? daily?.lastSeenAt : null),
        outSource: daily?.metadata?.outSource || (daily?.shiftEnd ? "MANUAL_LOGOUT" : null),
        warningCount: userWarnings,
        approvedExceptionType: daily?.approvedExceptionType || null,
        exceptionReason: daily?.exceptionReason || null,
        exceptionUntil: daily?.exceptionUntil || null,
        activeIncident: activeIncident
          ? {
              id: activeIncident.id,
              startedAt: activeIncident.startedAt,
              durationMinutes: Math.floor((now.getTime() - new Date(activeIncident.startedAt).getTime()) / (60 * 1000)),
              status: activeIncident.status,
              warning1SentAt: activeIncident.warning1SentAt,
              warning2SentAt: activeIncident.warning2SentAt,
              warning3SentAt: activeIncident.warning3SentAt,
              escalatedAt: activeIncident.escalatedAt,
            }
          : null,
      };
    });

    return Response.json({
      success: true,
      ist,
      summary: {
        totalMonitored: monitoredUsers.length,
        onlineStaff: onlineCount,
        onBreak: onBreakCount,
        fieldWork: fieldWorkCount,
        onLeave: onLeaveCount,
        offlineStaff: offlineCount,
        warningsToday,
        escalatedCount,
      },
      staff: staffList,
    });
  } catch (error) {
    console.error("Error in GET /api/operations/presence:", error);
    return Response.json({
      error: "Failed to fetch presence data",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.role)) {
      return Response.json({ error: "Forbidden: Management only" }, { status: 403 });
    }

    const result = await evaluateStaffPresence();
    return Response.json({ success: true, result });
  } catch (error) {
    console.error("Error running presence evaluation:", error);
    return Response.json({ error: "Failed to run presence evaluation" }, { status: 500 });
  }
}
