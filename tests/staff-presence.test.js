// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getISTDateInfo } from "@/lib/presence/presence-monitor";
import { OPERATIONS_MODULES } from "@/app/lib/operations-modules";
import { normalizePhone } from "@/lib/whatsapp/presence-alerts";

describe("Staff Presence & Attendance Module", () => {
  it("Operations Hub preserves all 11 original modules and adds presence as #12", () => {
    const expectedOriginalIds = [
      "work-center",
      "lead-generation",
      "manual-policy-entry",
      "claims-management",
      "declarations",
      "endorsements",
      "service-requests",
      "lead-management",
      "birthday-management",
      "whatsapp-setup",
      "client-management",
    ];

    // Verify all 11 original modules exist in their exact positions
    for (let i = 0; i < expectedOriginalIds.length; i++) {
      expect(OPERATIONS_MODULES[i].id).toBe(expectedOriginalIds[i]);
    }

    // Verify presence is the 12th module
    expect(OPERATIONS_MODULES.length).toBe(12);
    expect(OPERATIONS_MODULES[11].id).toBe("presence");
    expect(OPERATIONS_MODULES[11].name).toBe("Staff Presence & Attendance");
    expect(OPERATIONS_MODULES[11].route).toBe("/operations/presence");
    expect(OPERATIONS_MODULES[11].functions.length).toBeGreaterThanOrEqual(4);
  });

  it("Phone number normalization adds country code 91 for 10-digit Indian numbers", () => {
    expect(normalizePhone("9876543210")).toBe("919876543210");
    expect(normalizePhone("+91 98765-43210")).toBe("919876543210");
    expect(normalizePhone("918818889660")).toBe("918818889660");
    expect(normalizePhone("")).toBe("");
  });

  it("IST Date info calculation properly flags duty hours and Sundays", () => {
    // Sunday test (2026-09-20 was a Sunday)
    const sunday = new Date("2026-09-20T06:30:00Z"); // 12:00 PM IST on Sunday
    const sundayInfo = getISTDateInfo(sunday);
    expect(sundayInfo.isSunday).toBe(true);
    expect(sundayInfo.isShiftHours).toBe(false);

    // Tuesday at 11:30 AM IST (inside shift 10:00 AM - 6:30 PM)
    const tuesdayActive = new Date("2026-09-22T06:00:00Z"); // 11:30 AM IST
    const tuesdayInfo = getISTDateInfo(tuesdayActive);
    expect(tuesdayInfo.isShiftHours).toBe(true);
    expect(tuesdayInfo.workDate).toBe("2026-09-22");

    // Tuesday at 9:00 AM IST (before shift)
    const tuesdayBefore = new Date("2026-09-22T03:30:00Z"); // 9:00 AM IST
    const tuesdayBeforeInfo = getISTDateInfo(tuesdayBefore);
    expect(tuesdayBeforeInfo.isShiftHours).toBe(false);

    // Tuesday at 7:00 PM IST (after shift)
    const tuesdayAfter = new Date("2026-09-22T13:30:00Z"); // 7:00 PM IST
    const tuesdayAfterInfo = getISTDateInfo(tuesdayAfter);
    expect(tuesdayAfterInfo.isShiftHours).toBe(false);
  });
});
