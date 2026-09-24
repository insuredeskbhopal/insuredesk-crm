import { prisma as defaultPrisma } from "@/lib/db/prisma";
import { PrismaClient } from "@prisma/client";
import { getISTDateInfo } from "@/lib/presence/presence-monitor";

const prisma = defaultPrisma?.dailyPresence ? defaultPrisma : new PrismaClient();

/**
 * Calculates monthly attendance for all staff or a specific user based on DailyPresence records.
 *
 * Rules:
 * - Mon-Sat 10:00 AM - 6:30 PM IST are working days.
 * - Sunday is Weekly Off ('WO').
 * - Present ('P'): >= 4.5 hours connected.
 * - Half Day ('HD'): > 0 and < 4.5 hours connected.
 * - Leave ('L'): Approved leave exception.
 * - Field Work ('F'): Approved field/client visit.
 * - Absent ('A'): Past working day with 0 login and no exception.
 * - Future ('--'): Days not yet elapsed.
 */
export async function calculateMonthlyAttendance({
  monthStr = null,
  userId = null,
  isRestrictedAgent = false,
} = {}) {
  const istNow = getISTDateInfo(new Date());
  
  // Office Payroll cycle: 11th of start month to 10th of next month (e.g. 11-09-2026 to 10-10-2026)
  const [todayYear, todayMonth, todayDay] = istNow.workDate.split("-").map(Number);
  
  let startYear;
  let startMonth;
  
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    startYear = y;
    startMonth = m;
  } else {
    // Current payroll cycle based on IST today
    if (todayDay >= 11) {
      startYear = todayYear;
      startMonth = todayMonth;
    } else {
      startMonth = todayMonth - 1;
      if (startMonth === 0) {
        startMonth = 12;
        startYear = todayYear - 1;
      } else {
        startYear = todayYear;
      }
    }
  }

  const targetMonthKey = `${startYear}-${String(startMonth).padStart(2, "0")}`;
  const startDateStr = `${startYear}-${String(startMonth).padStart(2, "0")}-11`;
  
  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth === 13) {
    endMonth = 1;
    endYear = startYear + 1;
  }
  const endDateStr = `${endYear}-${String(endMonth).padStart(2, "0")}-10`;

  // Build calendar days array for the payroll cycle (11th of startMonth to 10th of endMonth)
  const days = [];
  let totalWorkingDaysInMonth = 0;
  let elapsedWorkingDays = 0;

  // Hoist formatters outside the loop — creating Intl objects is expensive
  const weekdayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" });
  const monthFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" });

  let currDate = new Date(`${startDateStr}T12:00:00+05:30`);
  const stopDate = new Date(`${endDateStr}T12:00:00+05:30`);

  while (currDate <= stopDate) {
    const y = currDate.getFullYear();
    const m = String(currDate.getMonth() + 1).padStart(2, "0");
    const d = String(currDate.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    const dayNumber = currDate.getDate();

    // getDay() === 0 is Sunday — avoids Intl call entirely for Sunday check
    const isSunday = currDate.getDay() === 0;
    const weekdayShort = weekdayFmt.format(currDate);
    const monthShort = monthFmt.format(currDate);

    const isFuture = dateStr > istNow.workDate;
    const isToday = dateStr === istNow.workDate;

    if (!isSunday) {
      totalWorkingDaysInMonth++;
      if (!isFuture) {
        elapsedWorkingDays++;
      }
    }

    days.push({
      dayNumber,
      dateStr,
      weekdayShort,
      monthShort,
      isSunday,
      isFuture,
      isToday,
    });

    // Advance 1 day
    currDate.setDate(currDate.getDate() + 1);
  }

  const totalDays = days.length;

  // Determine staff (includes SUPER_ADMIN, MANAGERS, AGENTS)
  const userWhere = {
    deletedAt: null,
  };

  if (isRestrictedAgent && userId) {
    userWhere.id = userId;
  }

  const users = await prisma.user.findMany({
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

  const userIds = users.map((u) => u.id);

  // Fetch all DailyPresence records for these users in this payroll cycle
  const dailyRecords = await prisma.dailyPresence.findMany({
    where: {
      userId: { in: userIds },
      workDate: {
        gte: startDateStr,
        lte: endDateStr,
      },
    },
    include: {
      incidents: {
        select: { id: true, status: true, durationSeconds: true },
      },
    },
  });

  const dailyMap = new Map();
  for (const r of dailyRecords) {
    dailyMap.set(`${r.userId}_${r.workDate}`, r);
  }

  // Reusable time formatter for punch-in / punch-out display (avoids per-call Intl creation)
  const timeFmt = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const fmtTime = (dt) => timeFmt.format(new Date(dt));

  // Aggregate monthly stats for each staff member
  let officeTotalPresent = 0;
  let officeTotalHalfDays = 0;
  let officeTotalLeaves = 0;
  let officeTotalFieldWork = 0;
  let officeTotalAbsences = 0;
  let officeTotalHours = 0;
  let officeTotalWarnings = 0;

  const staffAttendance = users.map((user) => {
    let pCount = 0;
    let hdCount = 0;
    let lCount = 0;
    let fCount = 0;
    let aCount = 0;
    let totalSeconds = 0;
    let warningsCount = 0;

    const dayRecords = days.map((day) => {
      if (day.isSunday) {
        return {
          date: day.dateStr,
          day: day.dayNumber,
          weekday: day.weekdayShort,
          status: "WO",
          badge: "WO",
          label: "Weekly Off",
          hours: 0,
          punchIn: null,
          punchOut: null,
          warnings: 0,
        };
      }

      if (day.isFuture) {
        return {
          date: day.dateStr,
          day: day.dayNumber,
          weekday: day.weekdayShort,
          status: "FUTURE",
          badge: "--",
          label: "Upcoming",
          hours: 0,
          punchIn: null,
          punchOut: null,
          warnings: 0,
        };
      }

      // Past or Today working day
      const daily = dailyMap.get(`${user.id}_${day.dateStr}`);
      const warnings = daily?.warningCount || 0;
      warningsCount += warnings;

      if (daily?.approvedExceptionType === "LEAVE") {
        lCount++;
        return {
          date: day.dateStr,
          day: day.dayNumber,
          weekday: day.weekdayShort,
          status: "LEAVE",
          badge: "L",
          label: "Leave",
          hours: 0,
          punchIn: null,
          punchOut: null,
          reason: daily.exceptionReason || "Approved Leave",
          warnings,
        };
      }

      if (daily?.approvedExceptionType === "FIELD_WORK") {
        fCount++;
        totalSeconds += 8 * 3600;
        return {
          date: day.dateStr,
          day: day.dayNumber,
          weekday: day.weekdayShort,
          status: "FIELD_WORK",
          badge: "F",
          label: "Field Work",
          hours: 8,
          punchIn: daily.firstLoginAt ? fmtTime(daily.firstLoginAt) : null,
          punchOut: daily.lastSeenAt ? fmtTime(daily.lastSeenAt) : null,
          reason: daily.exceptionReason || "Client Visit",
          warnings,
        };
      }

      let hours = 0;
      let punchIn = null;
      let punchOut = null;

      const firstLogin = daily?.firstLoginAt;

      if (firstLogin) {
        punchIn = fmtTime(firstLogin);

        // Official attendance OUT time recorded upon logout
        const officialOut = daily.shiftEnd;
        if (officialOut) {
          punchOut = fmtTime(officialOut);

          const diffMs = Math.max(0, new Date(officialOut).getTime() - new Date(firstLogin).getTime());
          const calculatedSec = Math.round(diffMs / 1000);
          hours = Math.round((calculatedSec / 3600) * 10) / 10;
          totalSeconds += calculatedSec;
        } else if (day.isToday) {
          // Currently active today (logged in, not yet logged out)
          const nowMs = new Date().getTime();
          const inMs = new Date(firstLogin).getTime();
          const diffMs = Math.max(0, nowMs - inMs);
          const calculatedSec = Math.round(diffMs / 1000);
          hours = Math.round((calculatedSec / 3600) * 10) / 10;
          totalSeconds += calculatedSec;
        }
      }

      // If hours >= 4.5 => Full Day Present
      if (hours >= 4.5) {
        pCount++;
        return {
          date: day.dateStr,
          day: day.dayNumber,
          weekday: day.weekdayShort,
          status: "PRESENT",
          badge: "P",
          label: "Present",
          hours,
          punchIn,
          punchOut,
          warnings,
        };
      }

      // If hours > 0 and < 4.5 => Half Day
      if (hours > 0) {
        hdCount++;
        return {
          date: day.dateStr,
          day: day.dayNumber,
          weekday: day.weekdayShort,
          status: "HALF_DAY",
          badge: "HD",
          label: "Half Day",
          hours,
          punchIn,
          punchOut,
          warnings,
        };
      }

      // If on today's date
      if (day.isToday) {
        if (firstLogin) {
          pCount++;
          return {
            date: day.dateStr,
            day: day.dayNumber,
            weekday: day.weekdayShort,
            status: "PRESENT",
            badge: "P",
            label: "Present Today",
            hours,
            punchIn,
            punchOut,
            warnings,
          };
        }

        return {
          date: day.dateStr,
          day: day.dayNumber,
          weekday: day.weekdayShort,
          status: "PENDING_LOGIN",
          badge: "A",
          label: "Pending Login",
          hours: 0,
          punchIn: null,
          punchOut: null,
          warnings,
        };
      }

      // Past elapsed working day with 0 login
      aCount++;
      return {
        date: day.dateStr,
        day: day.dayNumber,
        weekday: day.weekdayShort,
        status: "ABSENT",
        badge: "A",
        label: "Absent",
        hours: 0,
        punchIn: null,
        punchOut: null,
        warnings,
      };
    });

    const effectivePresentDays = pCount + fCount + hdCount * 0.5;
    const attendancePercentage =
      elapsedWorkingDays > 0
        ? Math.min(100, Math.round((effectivePresentDays / elapsedWorkingDays) * 100))
        : 100;

    const totalHoursWorked = Math.round((totalSeconds / 3600) * 10) / 10;

    officeTotalPresent += pCount;
    officeTotalHalfDays += hdCount;
    officeTotalLeaves += lCount;
    officeTotalFieldWork += fCount;
    officeTotalAbsences += aCount;
    officeTotalHours += totalHoursWorked;
    officeTotalWarnings += warningsCount;

    return {
      user: {
        id: user.id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        role: user.role,
        whatsappPhone: user.whatsappPhone,
      },
      summary: {
        presentDays: pCount,
        halfDays: hdCount,
        leaveDays: lCount,
        fieldWorkDays: fCount,
        absentDays: aCount,
        totalHours: totalHoursWorked,
        attendancePercentage,
        warningsCount,
        todayPunchIn: dayRecords.find((d) => d.date === istNow.workDate)?.punchIn || null,
        todayPunchOut: dayRecords.find((d) => d.date === istNow.workDate)?.punchOut || null,
      },
      days: dayRecords.map((r, i) => ({
        ...r,
        isToday: Boolean(days[i]?.isToday),
        isFuture: Boolean(days[i]?.isFuture),
        isSunday: Boolean(days[i]?.isSunday),
      })),
    };
  });

  const totalStaffCount = staffAttendance.length;
  const averageAttendanceRate =
    totalStaffCount > 0
      ? Math.round(
          staffAttendance.reduce((acc, s) => acc + s.summary.attendancePercentage, 0) /
            totalStaffCount
        )
      : 100;

  // Month metadata
  // Payroll cycle metadata (e.g. 11 Sep 2026 – 10 Oct 2026)
  const startFmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${startDateStr}T12:00:00+05:30`));

  const endFmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${endDateStr}T12:00:00+05:30`));

  const monthName = `${startFmt} – ${endFmt}`;

  return {
    success: true,
    month: targetMonthKey,
    monthName,
    startDate: startDateStr,
    endDate: endDateStr,
    currentDate: istNow.workDate,
    totalDays,
    totalWorkingDays: totalWorkingDaysInMonth,
    elapsedWorkingDays,
    days: days.map((d) => ({
      dayNumber: d.dayNumber,
      dateStr: d.dateStr,
      weekday: d.weekdayShort,
      monthShort: d.monthShort,
      isSunday: d.isSunday,
      isToday: d.isToday,
      isFuture: d.isFuture,
    })),
    officeSummary: {
      totalStaff: totalStaffCount,
      totalWorkingDays: totalWorkingDaysInMonth,
      elapsedWorkingDays,
      averageAttendanceRate,
      totalPresentDays: officeTotalPresent,
      totalHalfDays: officeTotalHalfDays,
      totalLeaves: officeTotalLeaves,
      totalFieldWork: officeTotalFieldWork,
      totalAbsences: officeTotalAbsences,
      totalHoursLogged: Math.round(officeTotalHours),
      totalWarnings: officeTotalWarnings,
    },
    staff: staffAttendance,
  };
}
