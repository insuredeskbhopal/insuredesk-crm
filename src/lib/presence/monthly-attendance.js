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
  
  // Format YYYY-MM
  const currentMonthStr = istNow.workDate.slice(0, 7);
  const targetMonth = monthStr && /^\d{4}-\d{2}$/.test(monthStr) ? monthStr : currentMonthStr;

  const [yearStr, mStr] = targetMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10);

  // Total days in target month
  const totalDays = new Date(year, month, 0).getDate();

  // Build calendar days array for the month
  const days = [];
  let totalWorkingDaysInMonth = 0;
  let elapsedWorkingDays = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dayStr = String(d).padStart(2, "0");
    const dateStr = `${targetMonth}-${dayStr}`;
    const dateObj = new Date(`${dateStr}T12:00:00+05:30`);
    const weekdayShort = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    }).format(dateObj);

    const isSunday = weekdayShort === "Sun";
    const isFuture = dateStr > istNow.workDate;
    const isToday = dateStr === istNow.workDate;

    if (!isSunday) {
      totalWorkingDaysInMonth++;
      if (!isFuture) {
        elapsedWorkingDays++;
      }
    }

    days.push({
      dayNumber: d,
      dateStr,
      weekdayShort,
      isSunday,
      isFuture,
      isToday,
    });
  }

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

  // Fetch all DailyPresence records for these users in this month
  const dailyRecords = await prisma.dailyPresence.findMany({
    where: {
      userId: { in: userIds },
      workDate: {
        gte: `${targetMonth}-01`,
        lte: `${targetMonth}-${String(totalDays).padStart(2, "0")}`,
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
          punchIn: daily.firstLoginAt
            ? new Date(daily.firstLoginAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Kolkata",
              })
            : null,
          punchOut: daily.lastSeenAt
            ? new Date(daily.lastSeenAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Kolkata",
              })
            : null,
          reason: daily.exceptionReason || "Client Visit",
          warnings,
        };
      }

      let hours = 0;
      let punchIn = null;
      let punchOut = null;

      const firstLogin = daily?.firstLoginAt || (daily?.totalConnectedSeconds > 0 ? daily.lastSeenAt : null);

      if (firstLogin) {
        punchIn = new Date(firstLogin).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        });

        const lastSeen = daily.lastSeenAt ? new Date(daily.lastSeenAt) : new Date(firstLogin);
        punchOut = new Date(lastSeen).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        });

        if (daily.totalConnectedSeconds > 0) {
          hours = Math.round((daily.totalConnectedSeconds / 3600) * 10) / 10;
          totalSeconds += daily.totalConnectedSeconds;
        } else {
          const diffMs = Math.max(0, lastSeen.getTime() - new Date(firstLogin).getTime());
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

      // If 0 hours on today's date
      if (day.isToday) {
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
      days: dayRecords,
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
  const monthName = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${targetMonth}-15T12:00:00+05:30`));

  return {
    success: true,
    month: targetMonth,
    monthName,
    currentDate: istNow.workDate,
    totalDays,
    totalWorkingDays: totalWorkingDaysInMonth,
    elapsedWorkingDays,
    days: days.map((d) => ({
      dayNumber: d.dayNumber,
      dateStr: d.dateStr,
      weekday: d.weekdayShort,
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
