import { prisma } from "@/lib/db/prisma";
import {
  sendWarning1,
  sendWarning2,
  sendWarning3,
  sendManagementEscalation,
  sendReconnectionNotice,
} from "@/lib/whatsapp/presence-alerts";

/**
 * Returns IST Date & Time information, workDate ('YYYY-MM-DD'), and shift active flag.
 */
export function getISTDateInfo(date = new Date()) {
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = istFormatter.formatToParts(date);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = partMap.year;
  const month = partMap.month;
  const day = partMap.day;
  const hour = parseInt(partMap.hour || "0", 10);
  const minute = parseInt(partMap.minute || "0", 10);
  const second = parseInt(partMap.second || "0", 10);
  const weekday = partMap.weekday; // 'Sun', 'Mon', 'Tue', ...

  const workDate = `${year}-${month}-${day}`;
  const totalMinutes = hour * 60 + minute;
  const shiftStartMinutes = 10 * 60; // 10:00 AM = 600
  const shiftEndMinutes = 18 * 60 + 30; // 6:30 PM = 1110

  const isSunday = weekday === "Sun";
  const isShiftHours = !isSunday && totalMinutes >= shiftStartMinutes && totalMinutes <= shiftEndMinutes;

  return {
    workDate,
    hour,
    minute,
    second,
    weekday,
    isSunday,
    isShiftHours,
    formattedTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} IST`,
  };
}

/**
 * Handle a tab heartbeat or close action from client
 */
export async function recordHeartbeat({
  userId,
  tabId,
  visibilityState = "visible",
  action = "heartbeat",
  ipAddress = null,
  userAgent = null,
}) {
  const now = new Date();
  const ist = getISTDateInfo(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organizationId: true,
      presenceMonitored: true,
      whatsappPhone: true,
    },
  });

  if (!user || user.presenceMonitored === false) {
    return { success: true, monitored: false };
  }

  // 1. Get or create DailyPresence for today
  let daily = await prisma.dailyPresence.findUnique({
    where: {
      userId_workDate: {
        userId: user.id,
        workDate: ist.workDate,
      },
    },
  });

  if (!daily) {
    daily = await prisma.dailyPresence.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        workDate: ist.workDate,
        lastSeenAt: now,
        currentStatus: "ONLINE",
      },
    });
  }

  // 2. Handle tab close vs heartbeat
  if (action === "close") {
    await prisma.presenceSession.updateMany({
      where: {
        userId: user.id,
        tabId,
        endedAt: null,
      },
      data: {
        endedAt: now,
      },
    });
  } else {
    // Upsert session
    const existingSession = await prisma.presenceSession.findFirst({
      where: {
        userId: user.id,
        tabId,
        endedAt: null,
      },
    });

    if (existingSession) {
      await prisma.presenceSession.update({
        where: { id: existingSession.id },
        data: {
          lastHeartbeatAt: now,
          visibilityState,
        },
      });
    } else {
      await prisma.presenceSession.create({
        data: {
          userId: user.id,
          dailyPresenceId: daily.id,
          tabId,
          ipAddress,
          userAgent,
          visibilityState,
          lastHeartbeatAt: now,
        },
      });
    }
  }

  // 3. Count remaining active tabs (lastHeartbeat within 90s and not ended)
  const ninetySecondsAgo = new Date(now.getTime() - 90 * 1000);
  const activeTabsCount = await prisma.presenceSession.count({
    where: {
      userId: user.id,
      endedAt: null,
      lastHeartbeatAt: { gte: ninetySecondsAgo },
    },
  });

  let newStatus = daily.currentStatus;

  // If user has active tabs, they are ONLINE (unless on approved break / field work / leave)
  if (activeTabsCount > 0) {
    if (["OFFLINE", "AWAY"].includes(daily.currentStatus)) {
      newStatus = "ONLINE";
    }

    // Check if there was an open incident and resolve it
    const openIncident = await prisma.presenceIncident.findFirst({
      where: {
        userId: user.id,
        dailyPresenceId: daily.id,
        status: { in: ["OPEN", "ESCALATED_PENDING_REVIEW"] },
      },
      orderBy: { startedAt: "desc" },
    });

    if (openIncident) {
      const offlineSecs = Math.round((now.getTime() - openIncident.startedAt.getTime()) / 1000);
      await prisma.presenceIncident.update({
        where: { id: openIncident.id },
        data: {
          endedAt: now,
          durationSeconds: offlineSecs,
          status: "RESOLVED",
          resolution: "Reconnected active CRM tab",
        },
      });

      // Record reconnection event
      await prisma.presenceEvent.create({
        data: {
          userId: user.id,
          dailyPresenceId: daily.id,
          incidentId: openIncident.id,
          eventType: "RECONNECTED",
          description: `User re-opened CRM tab after ${Math.round(offlineSecs / 60)} minutes offline.`,
        },
      });

      if (openIncident.warning1SentAt && user.whatsappPhone) {
        // Send recovery notification
        await sendReconnectionNotice({
          organizationId: user.organizationId,
          user,
          timeStr: ist.formattedTime,
          durationMinutes: Math.max(1, Math.round(offlineSecs / 60)),
        }).catch((err) => console.error("Error sending reconnect notice:", err));
      }
    }
  } else if (action === "close") {
    // No remaining active tabs
    if (!daily.approvedExceptionType) {
      newStatus = "OFFLINE";
    }
  }

  // Update DailyPresence lastSeenAt and status
  const updateData = {
    lastSeenAt: now,
    currentStatus: newStatus,
  };
  if (!daily.firstLoginAt && action !== "close") {
    updateData.firstLoginAt = now;
  }
  await prisma.dailyPresence.update({
    where: { id: daily.id },
    data: updateData,
  });

  return {
    success: true,
    status: newStatus,
    activeTabs: activeTabsCount,
    serverTime: now.toISOString(),
    isShiftHours: ist.isShiftHours,
  };
}

/**
 * Presence Evaluator Engine: Runs periodically (e.g. via cron / worker)
 * Checks all monitored staff during 10:00 AM - 6:30 PM IST.
 */
export async function evaluateStaffPresence() {
  const now = new Date();
  const ist = getISTDateInfo(now);

  if (!ist.isShiftHours) {
    return {
      evaluated: 0,
      warningsIssued: 0,
      message: `Outside official duty hours (10:00 AM - 6:30 PM IST Mon-Sat). Current time: ${ist.formattedTime}, ${ist.weekday}`,
    };
  }

  // Find all monitored users (AGENT, MANAGER; excludes SUPER_ADMIN)
  const monitoredUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      presenceMonitored: true,
      role: { not: "SUPER_ADMIN" },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organizationId: true,
      whatsappPhone: true,
    },
  });

  const ninetySecondsAgo = new Date(now.getTime() - 90 * 1000);
  let warningsCount = 0;
  let escalationsCount = 0;

  for (const user of monitoredUsers) {
    // 1. Check if user has an active tab
    const activeSessionsCount = await prisma.presenceSession.count({
      where: {
        userId: user.id,
        endedAt: null,
        lastHeartbeatAt: { gte: ninetySecondsAgo },
      },
    });

    // 2. Fetch or create today's DailyPresence
    let daily = await prisma.dailyPresence.findUnique({
      where: {
        userId_workDate: {
          userId: user.id,
          workDate: ist.workDate,
        },
      },
    });

    if (!daily) {
      daily = await prisma.dailyPresence.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          workDate: ist.workDate,
          currentStatus: activeSessionsCount > 0 ? "ONLINE" : "OFFLINE",
        },
      });
    }

    // 3. Check for approved exceptions (Break, Field Work, Leave)
    if (daily.approvedExceptionType) {
      if (daily.exceptionUntil && daily.exceptionUntil > now) {
        // Exception is active, skip warning evaluation
        continue;
      } else if (daily.exceptionUntil && daily.exceptionUntil <= now) {
        // Exception expired
        await prisma.dailyPresence.update({
          where: { id: daily.id },
          data: {
            approvedExceptionType: null,
            exceptionReason: null,
            exceptionUntil: null,
          },
        });
      }
    }

    // If active tabs exist, ensure status is ONLINE
    if (activeSessionsCount > 0) {
      if (daily.currentStatus !== "ONLINE") {
        await prisma.dailyPresence.update({
          where: { id: daily.id },
          data: { currentStatus: "ONLINE", lastSeenAt: now },
        });
      }
      continue;
    }

    // --- USER HAS 0 ACTIVE TABS ---
    // Update daily presence to OFFLINE if not already
    if (daily.currentStatus !== "OFFLINE") {
      await prisma.dailyPresence.update({
        where: { id: daily.id },
        data: { currentStatus: "OFFLINE" },
      });
    }

    // Find or create an open PresenceIncident
    let incident = await prisma.presenceIncident.findFirst({
      where: {
        userId: user.id,
        dailyPresenceId: daily.id,
        status: { in: ["OPEN", "ESCALATED_PENDING_REVIEW"] },
      },
      orderBy: { startedAt: "desc" },
    });

    if (!incident) {
      // Offline start time is either lastSeenAt or now
      const offlineStart = daily.lastSeenAt || now;
      incident = await prisma.presenceIncident.create({
        data: {
          userId: user.id,
          dailyPresenceId: daily.id,
          startedAt: offlineStart,
          status: "OPEN",
        },
      });

      await prisma.presenceEvent.create({
        data: {
          userId: user.id,
          dailyPresenceId: daily.id,
          incidentId: incident.id,
          eventType: "OFFLINE_DETECTED",
          description: `All CRM tabs closed/disconnected during duty hours.`,
        },
      });
    }

    // Calculate offline duration in minutes
    const offlineMinutes = Math.floor((now.getTime() - incident.startedAt.getTime()) / (60 * 1000));
    await prisma.presenceIncident.update({
      where: { id: incident.id },
      data: { durationSeconds: offlineMinutes * 60 },
    });

    // 4. Warning Evaluation Stages:
    // Stage 1: >= 5 minutes offline -> Warning 1
    if (offlineMinutes >= 5 && !incident.warning1SentAt) {
      await sendWarning1({
        organizationId: user.organizationId,
        user,
        incidentId: incident.id,
        offlineMinutes,
        timeStr: ist.formattedTime,
      }).catch((err) => console.error("Error sending Warning 1:", err));

      await prisma.presenceIncident.update({
        where: { id: incident.id },
        data: { warning1SentAt: now },
      });

      await prisma.dailyPresence.update({
        where: { id: daily.id },
        data: { warningCount: { increment: 1 } },
      });

      await prisma.presenceEvent.create({
        data: {
          userId: user.id,
          dailyPresenceId: daily.id,
          incidentId: incident.id,
          eventType: "WARNING_1_SENT",
          description: `Warning 1 WhatsApp sent after ${offlineMinutes}m offline.`,
        },
      });
      warningsCount++;
    }

    // Stage 2: >= 15 minutes offline -> Warning 2
    if (offlineMinutes >= 15 && !incident.warning2SentAt) {
      await sendWarning2({
        organizationId: user.organizationId,
        user,
        incidentId: incident.id,
        offlineMinutes,
        timeStr: ist.formattedTime,
      }).catch((err) => console.error("Error sending Warning 2:", err));

      await prisma.presenceIncident.update({
        where: { id: incident.id },
        data: { warning2SentAt: now },
      });

      await prisma.dailyPresence.update({
        where: { id: daily.id },
        data: { warningCount: { increment: 1 } },
      });

      await prisma.presenceEvent.create({
        data: {
          userId: user.id,
          dailyPresenceId: daily.id,
          incidentId: incident.id,
          eventType: "WARNING_2_SENT",
          description: `Warning 2 WhatsApp sent after ${offlineMinutes}m offline.`,
        },
      });
      warningsCount++;
    }

    // Stage 3: >= 30 minutes offline -> Warning 3 (Final Warning)
    if (offlineMinutes >= 30 && !incident.warning3SentAt) {
      await sendWarning3({
        organizationId: user.organizationId,
        user,
        incidentId: incident.id,
        offlineMinutes,
        timeStr: ist.formattedTime,
      }).catch((err) => console.error("Error sending Warning 3:", err));

      await prisma.presenceIncident.update({
        where: { id: incident.id },
        data: { warning3SentAt: now },
      });

      await prisma.dailyPresence.update({
        where: { id: daily.id },
        data: { warningCount: { increment: 1 } },
      });

      await prisma.presenceEvent.create({
        data: {
          userId: user.id,
          dailyPresenceId: daily.id,
          incidentId: incident.id,
          eventType: "WARNING_3_SENT",
          description: `Warning 3 WhatsApp sent after ${offlineMinutes}m offline.`,
        },
      });
      warningsCount++;
    }

    // Stage 4: >= 45 minutes offline -> Management Escalation
    if (offlineMinutes >= 45 && !incident.escalatedAt) {
      await sendManagementEscalation({
        organizationId: user.organizationId,
        user,
        incidentId: incident.id,
        offlineMinutes,
        timeStr: ist.formattedTime,
      }).catch((err) => console.error("Error sending Management Escalation:", err));

      await prisma.presenceIncident.update({
        where: { id: incident.id },
        data: {
          escalatedAt: now,
          status: "ESCALATED_PENDING_REVIEW",
        },
      });

      await prisma.presenceEvent.create({
        data: {
          userId: user.id,
          dailyPresenceId: daily.id,
          incidentId: incident.id,
          eventType: "ESCALATED_TO_MANAGEMENT",
          description: `Absence escalated to management after 45m offline without response.`,
        },
      });
      escalationsCount++;
    }
  }

  return {
    evaluated: monitoredUsers.length,
    warningsIssued: warningsCount,
    escalationsIssued: escalationsCount,
    time: ist.formattedTime,
  };
}
