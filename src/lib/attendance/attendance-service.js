import { prisma as defaultPrisma } from "@/lib/db/prisma";
import { PrismaClient } from "@prisma/client";
import { getISTDateInfo } from "@/lib/presence/presence-monitor";
import { resolveEffectivePunchOut } from "@/lib/presence/punch-out-resolver";

const prisma = defaultPrisma?.dailyPresence ? defaultPrisma : new PrismaClient();

// Earliest allowed time for attendance IN registration: 08:30 AM IST (8 * 60 + 30 = 510 mins)
const ATTENDANCE_START_MINUTES = 8 * 60 + 30;

/**
 * Record an agent's attendance IN time upon successful login.
 * 
 * Rules:
 * 1. Must be >= 08:30 AM IST. Any login before 08:30 AM is ignored for attendance.
 * 2. Recorded only once per day. If IN time is already recorded, subsequent logins are ignored.
 * 3. Does not affect or rely on live tracking/heartbeat.
 */
export async function recordLoginAttendance({ userId, organizationId = null }) {
  if (!userId) return { recorded: false, error: "Missing userId" };

  try {
    const now = new Date();
    const ist = getISTDateInfo(now);
    const totalMinutes = ist.hour * 60 + ist.minute;

    // Rule: Logins before 08:30 AM IST do not register attendance IN time
    if (totalMinutes < ATTENDANCE_START_MINUTES) {
      return {
        recorded: false,
        reason: "BEFORE_8_30_AM",
        message: "Login occurred before 08:30 AM IST; attendance IN not registered",
        time: ist.formattedTime,
      };
    }

    // Find today's daily record for this user
    let daily = await prisma.dailyPresence.findUnique({
      where: {
        userId_workDate: {
          userId,
          workDate: ist.workDate,
        },
      },
    });

    // If record exists and IN time is already set, keep original IN time (do not overwrite)
    if (daily && daily.firstLoginAt) {
      return {
        recorded: false,
        reason: "ALREADY_REGISTERED",
        message: "Attendance IN time already recorded for today",
        inTime: daily.firstLoginAt,
        locked: Boolean(daily.shiftEnd || daily.metadata?.attendanceLocked),
      };
    }

    // If daily record exists but firstLoginAt is null (e.g. from an early morning tab heartbeat)
    if (daily) {
      const existingMeta = typeof daily.metadata === "object" && daily.metadata ? daily.metadata : {};
      daily = await prisma.dailyPresence.update({
        where: { id: daily.id },
        data: {
          firstLoginAt: now,
          currentStatus: "ONLINE",
          metadata: {
            ...existingMeta,
            inTime: now.toISOString(),
            attendanceLocked: false,
          },
        },
      });
      return {
        recorded: true,
        reason: "IN_REGISTERED",
        inTime: now,
        workDate: ist.workDate,
      };
    }

    // If no record exists yet, create it with firstLoginAt
    daily = await prisma.dailyPresence.create({
      data: {
        userId,
        organizationId,
        workDate: ist.workDate,
        firstLoginAt: now,
        currentStatus: "ONLINE",
        metadata: {
          inTime: now.toISOString(),
          attendanceLocked: false,
        },
      },
    });

    return {
      recorded: true,
      reason: "IN_REGISTERED",
      inTime: now,
      workDate: ist.workDate,
    };
  } catch (error) {
    console.error("Error recording attendance IN time:", error);
    return { recorded: false, error: error.message };
  }
}

/**
 * Record an agent's attendance OUT time upon clicking Logout.
 * 
 * Rules:
 * 1. Requires that an IN time was registered today.
 * 2. Recorded only once per day on the first logout.
 * 3. Once OUT is recorded, attendance is final and locked for the day.
 * 4. Subsequent logins or logouts on the same day are ignored.
 */
export async function recordLogoutAttendance({ userId }) {
  if (!userId) return { recorded: false, error: "Missing userId" };

  try {
    const now = new Date();
    const ist = getISTDateInfo(now);

    const daily = await prisma.dailyPresence.findUnique({
      where: {
        userId_workDate: {
          userId,
          workDate: ist.workDate,
        },
      },
    });

    // If no record or IN time was never registered today
    if (!daily || !daily.firstLoginAt) {
      return {
        recorded: false,
        reason: "NO_IN_TIME",
        message: "No attendance IN time was registered today",
      };
    }

    // If OUT time was already recorded or attendance is locked, ignore
    if (daily.shiftEnd || daily.metadata?.attendanceLocked) {
      return {
        recorded: false,
        reason: "ALREADY_LOCKED",
        message: "Attendance OUT time already recorded and locked for today",
        inTime: daily.firstLoginAt,
        outTime: daily.shiftEnd || daily.metadata?.outTime,
      };
    }

    // Record the first OUT time
    const inDate = new Date(daily.firstLoginAt);
    const durationSeconds = Math.max(0, Math.round((now.getTime() - inDate.getTime()) / 1000));
    const existingMeta = typeof daily.metadata === "object" && daily.metadata ? daily.metadata : {};

    const updated = await prisma.dailyPresence.update({
      where: { id: daily.id },
      data: {
        shiftEnd: now,
        totalConnectedSeconds: durationSeconds,
        currentStatus: "OFFLINE",
        metadata: {
          ...existingMeta,
          inTime: inDate.toISOString(),
          outTime: now.toISOString(),
          attendanceLocked: true,
          durationSeconds,
        },
      },
    });

    return {
      recorded: true,
      reason: "OUT_REGISTERED",
      inTime: updated.firstLoginAt,
      outTime: updated.shiftEnd,
      durationSeconds,
      workDate: ist.workDate,
    };
  } catch (error) {
    console.error("Error recording attendance OUT time:", error);
    return { recorded: false, error: error.message };
  }
}

/**
 * Idempotently finalizes attendance for completed days or departed staff after duty hours (>= 18:30 IST).
 *
 * Rules:
 * 1. Explicit manual logout remains highest priority (has outSource: "MANUAL_LOGOUT").
 * 2. Only processes records where firstLoginAt is NOT null and shiftEnd IS null.
 * 3. Only finalizes past days (workDate < today) OR today after duty hours (>= 18:30 IST) when staff is OFFLINE.
 * 4. Never overwrites lastSeenAt.
 * 5. Uses latest trustworthy presence timestamp (lastSeenAt || firstLoginAt).
 * 6. Sets metadata.outSource = "AUTO_LAST_SEEN".
 * 7. Completely idempotent — records with existing shiftEnd are ignored.
 */
export async function finalizeCompletedAttendance({ workDate = null } = {}) {
  try {
    const now = new Date();
    const ist = getISTDateInfo(now);
    const totalMinutes = ist.hour * 60 + ist.minute;
    const isPastShiftHours = totalMinutes >= (18 * 60 + 30); // 6:30 PM IST

    const whereClause = {
      firstLoginAt: { not: null },
      shiftEnd: null,
    };

    if (workDate) {
      if (workDate === ist.workDate && !isPastShiftHours) {
        // Today before 6:30 PM: provisional only; do not permanently lock active day
        return { finalized: 0, skipped: "TODAY_BEFORE_SHIFT_END" };
      }
      whereClause.workDate = workDate;
    } else {
      // General batch: all past days, plus today if after 6:30 PM and offline
      if (isPastShiftHours) {
        whereClause.workDate = { lte: ist.workDate };
        whereClause.currentStatus = "OFFLINE";
      } else {
        whereClause.workDate = { lt: ist.workDate };
      }
    }

    const pendingRecords = await prisma.dailyPresence.findMany({
      where: whereClause,
      include: {
        sessions: {
          orderBy: { lastHeartbeatAt: "desc" },
        },
      },
    });

    let finalizedCount = 0;
    for (const record of pendingRecords) {
      const resolved = resolveEffectivePunchOut({
        daily: record,
        sessions: record.sessions || [],
        isToday: false,
        now,
      });

      const finalOutTime = resolved.punchOutDate || record.lastSeenAt || record.firstLoginAt;
      const inDate = new Date(record.firstLoginAt);
      const outDate = new Date(finalOutTime);
      const durationSeconds = Math.max(0, Math.round((outDate.getTime() - inDate.getTime()) / 1000));
      const existingMeta = typeof record.metadata === "object" && record.metadata ? record.metadata : {};

      await prisma.dailyPresence.update({
        where: { id: record.id },
        data: {
          shiftEnd: finalOutTime,
          totalConnectedSeconds: durationSeconds,
          currentStatus: "OFFLINE",
          metadata: {
            ...existingMeta,
            outTime: outDate.toISOString(),
            outSource: resolved.outSource || "AUTO_LAST_SEEN",
            attendanceLocked: true,
            durationSeconds,
            finalizedAt: now.toISOString(),
          },
        },
      });
      finalizedCount++;
    }

    return { finalized: finalizedCount };
  } catch (error) {
    console.error("Error finalizing completed attendance:", error);
    return { finalized: 0, error: error.message };
  }
}
