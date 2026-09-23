// @vitest-environment node

import { describe, expect, it } from "vitest";
import { calculateMonthlyAttendance } from "@/lib/presence/monthly-attendance";

describe("Monthly Staff Attendance Register Engine", () => {
  it("computes monthly attendance calendar with correct days count and Sunday weekly off", async () => {
    // September 2026 has 30 days
    const result = await calculateMonthlyAttendance({ monthStr: "2026-09" });

    expect(result.success).toBe(true);
    expect(result.month).toBe("2026-09");
    expect(result.totalDays).toBe(30);
    expect(result.days.length).toBe(30);

    // Verify Sundays in September 2026 (6, 13, 20, 27)
    const sundays = result.days.filter((d) => d.isSunday);
    expect(sundays.length).toBe(4);
    expect(sundays.map((s) => s.dayNumber)).toEqual([6, 13, 20, 27]);

    // Total working days should be 30 - 4 = 26
    expect(result.totalWorkingDays).toBe(26);

    // Office summary has all required metrics
    expect(result.officeSummary).toHaveProperty("totalWorkingDays");
    expect(result.officeSummary).toHaveProperty("averageAttendanceRate");
    expect(result.officeSummary).toHaveProperty("totalPresentDays");
    expect(result.officeSummary).toHaveProperty("totalLeaves");
    expect(result.officeSummary).toHaveProperty("totalFieldWork");
    expect(result.officeSummary).toHaveProperty("totalAbsences");
    expect(result.officeSummary).toHaveProperty("totalHoursLogged");

    // Staff list contains summary and day items
    if (result.staff.length > 0) {
      const firstStaff = result.staff[0];
      expect(firstStaff).toHaveProperty("user");
      expect(firstStaff).toHaveProperty("summary");
      expect(firstStaff).toHaveProperty("days");
      expect(firstStaff.days.length).toBe(30);

      // Verify Sunday days have 'WO' status
      const sundayRecord = firstStaff.days.find((d) => d.day === 6);
      expect(sundayRecord.status).toBe("WO");
      expect(sundayRecord.badge).toBe("WO");
    }
  });

  it("includes SUPER_ADMIN in the monthly attendance sheet and registers todayPunchIn", async () => {
    const result = await calculateMonthlyAttendance({ monthStr: "2026-09" });
    const superAdmin = result.staff.find((s) => s.user.role === "SUPER_ADMIN");
    expect(superAdmin).toBeDefined();
    expect(superAdmin.user.role).toBe("SUPER_ADMIN");
    expect(superAdmin.summary).toHaveProperty("todayPunchIn");
    expect(superAdmin.summary).toHaveProperty("todayPunchOut");
  });
});
