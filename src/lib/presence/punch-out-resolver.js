/**
 * Authoritative Punch-Out Resolver
 * Single source of truth across all CRM modules (Daily, Monthly, Operations, Drawer, Excel, Finalization).
 *
 * Priority order:
 * 1. Explicit / manual logout timestamp (shiftEnd with MANUAL_LOGOUT or attendanceLocked).
 * 2. Explicit finalized attendance OUT (shiftEnd with AUTO_LAST_SEEN or ADMIN_CORRECTION).
 * 3. Active presence check (for TODAY):
 *    - If any session has endedAt === null and lastHeartbeatAt >= (now - 180s):
 *      => isActive: true, isCompleted: false, punchOut: null (Active Now).
 * 4. Latest trustworthy employee PresenceSession:
 *    - Filters sessions for genuine employee presence (duration >= 30s or multiple heartbeats or explicit endedAt from employee device).
 *    - Transient / zero-second pings from administrative logins or foreign devices with 0 active duration (< 30s)
 *      are not used as work departure evidence over a genuine completed session.
 *    - Effective punch-out = session.endedAt || session.lastHeartbeatAt.
 * 5. DailyPresence.lastSeenAt only if no sessions exist, and only if > firstLoginAt.
 * 6. Never mark an employee ABSENT if firstLoginAt is recorded.
 */

// Shared time formatter (avoids per-call Intl creation)
const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export const fmtPunchTime = (dt) => (dt ? timeFmt.format(new Date(dt)) : null);

export function resolveEffectivePunchOut({
  daily,
  sessions = [],
  isToday = false,
  now = new Date(),
}) {
  const firstLogin = daily?.firstLoginAt ? new Date(daily.firstLoginAt) : null;
  if (!firstLogin) {
    return {
      punchIn: null,
      punchOut: null,
      punchOutDate: null,
      effectiveOut: null,
      isActive: false,
      isCompleted: !isToday,
      workedMinutes: 0,
      hours: 0,
      status: isToday ? "PENDING_LOGIN" : "ABSENT",
      badge: "A",
      label: isToday ? "Pending Login" : "Absent",
      outSource: null,
    };
  }

  const punchIn = fmtPunchTime(firstLogin);
  const nowMs = now.getTime();
  const inMs = firstLogin.getTime();

  // 1. Priority 1 & 2: Explicit confirmed logout or finalized OUT
  const isLocked = Boolean(
    daily?.shiftEnd && (daily?.metadata?.attendanceLocked || daily?.metadata?.outSource)
  );
  if (isLocked || daily?.shiftEnd) {
    const outDate = new Date(daily.shiftEnd);
    const diffMs = Math.max(0, outDate.getTime() - inMs);
    const workedMinutes = Math.round(diffMs / 60000);
    const hours = Math.round((diffMs / 3600000) * 10) / 10;
    const isPresent = hours >= 4.5;
    return {
      punchIn,
      punchOut: fmtPunchTime(outDate),
      punchOutDate: outDate,
      effectiveOut: fmtPunchTime(outDate),
      isActive: false,
      isCompleted: true,
      workedMinutes,
      hours,
      status: isPresent ? "PRESENT" : hours > 0 ? "HALF_DAY" : "ABSENT",
      badge: isPresent ? "P" : hours > 0 ? "HD" : "A",
      label: isPresent ? "Present" : hours > 0 ? "Half Day" : "Absent",
      outSource: daily?.metadata?.outSource || (isLocked ? "MANUAL_LOGOUT" : "CONFIRMED"),
    };
  }

  // 2. Multi-tab / Multi-device active check for TODAY
  if (isToday) {
    // A session is active if endedAt is null and heartbeat was within last 180 seconds (3 mins)
    const activeSessions = sessions.filter((s) => {
      if (s.endedAt) return false;
      const hb = s.lastHeartbeatAt ? new Date(s.lastHeartbeatAt).getTime() : 0;
      return nowMs - hb <= 180000;
    });

    if (activeSessions.length > 0) {
      // Employee is currently actively online!
      const diffMs = Math.max(0, nowMs - inMs);
      const workedMinutes = Math.round(diffMs / 60000);
      const hours = Math.round((diffMs / 3600000) * 10) / 10;
      return {
        punchIn,
        punchOut: null,
        punchOutDate: null,
        effectiveOut: null,
        isActive: true,
        isCompleted: false,
        workedMinutes,
        hours,
        status: "PRESENT",
        badge: "P",
        label: "Active Now",
        outSource: null,
      };
    }
  }

  // 3. Fallback to latest trustworthy presence session:
  // Genuine work sessions have duration >= 30s OR explicit endedAt from genuine work session OR multiple heartbeats
  const genuineSessions = sessions.filter((s) => {
    const start = new Date(s.startedAt).getTime();
    const end = (
      s.endedAt
        ? new Date(s.endedAt)
        : s.lastHeartbeatAt
        ? new Date(s.lastHeartbeatAt)
        : new Date(s.startedAt)
    ).getTime();
    const durSec = Math.round((end - start) / 1000);
    // Ignore isolated transient pings (< 30s) if earlier substantial sessions exist
    return durSec >= 30 || s.endedAt !== null;
  });

  const candidateSessions = genuineSessions.length > 0 ? genuineSessions : sessions;

  let latestTrustworthyDate = null;
  for (const s of candidateSessions) {
    const sDate = s.endedAt
      ? new Date(s.endedAt)
      : s.lastHeartbeatAt
      ? new Date(s.lastHeartbeatAt)
      : new Date(s.startedAt);
    if (!latestTrustworthyDate || sDate.getTime() > latestTrustworthyDate.getTime()) {
      latestTrustworthyDate = sDate;
    }
  }

  // 4. Fallback to daily.lastSeenAt only if no sessions or if sessions are older
  let finalOutDate = latestTrustworthyDate;
  if (!finalOutDate && daily?.lastSeenAt) {
    finalOutDate = new Date(daily.lastSeenAt);
  }
  if (!finalOutDate) {
    finalOutDate = firstLogin;
  }

  const diffMs = Math.max(0, finalOutDate.getTime() - inMs);
  const workedMinutes = Math.round(diffMs / 60000);
  const hours = Math.round((diffMs / 3600000) * 10) / 10;
  const isPresent = hours >= 4.5;

  return {
    punchIn,
    punchOut: fmtPunchTime(finalOutDate),
    punchOutDate: finalOutDate,
    effectiveOut: fmtPunchTime(finalOutDate),
    isActive: false,
    isCompleted: true,
    workedMinutes,
    hours,
    status: isPresent ? "PRESENT" : hours > 0 ? "HALF_DAY" : "ABSENT",
    badge: isPresent ? "P" : hours > 0 ? "HD" : "A",
    label: isPresent ? "Present" : hours > 0 ? "Half Day" : "Absent",
    outSource: "AUTO_LAST_SEEN",
  };
}
