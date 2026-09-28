import { describe, expect, it } from "vitest";
import {
  calculateDaysLeft,
  calculateRenewalStatus,
  getDaysStatus,
  getExpiryState,
  parseRenewalDate,
  getIndiaDateParts,
} from "../src/lib/renewals/dates.js";
import { parseBusinessDate } from "../src/lib/operations-center/engine.js";

describe("renewal date helpers", () => {
  it("parses DMY expiry dates", () => {
    const date = parseRenewalDate("15/06/2026");
    expect(date).not.toBeNull();
    const parts = getIndiaDateParts(date);
    expect(parts.day).toBe(15);
    expect(parts.month).toBe(6);
    expect(parts.year).toBe(2026);
  });

  it("flags missing and invalid expiry states", () => {
    expect(getExpiryState("")).toBe("missing");
    expect(getExpiryState("not-a-date")).toBe("invalid");
    expect(getDaysStatus("")).toBe("Missing Expiry Date");
    expect(getDaysStatus("bad-value")).toBe("Invalid Expiry Date");
  });

  describe("Timezone Stable Days-Left Calculations (IST)", () => {
    const expiryDateStr = "25/07/2026";

    it("calculates 19 days remaining at 11:30 PM IST (July 6)", () => {
      const referenceDate = new Date("2026-07-06T23:30:00+05:30");
      const daysLeft = calculateDaysLeft(expiryDateStr, referenceDate);
      expect(daysLeft).toBe(19);

      const status = calculateRenewalStatus(expiryDateStr, "", referenceDate);
      expect(status).toBe("expiry_soon");
    });

    it("calculates 18 days remaining at 12:30 AM IST (July 7)", () => {
      const referenceDate = new Date("2026-07-07T00:30:00+05:30");
      const daysLeft = calculateDaysLeft(expiryDateStr, referenceDate);
      expect(daysLeft).toBe(18);

      const status = calculateRenewalStatus(expiryDateStr, "", referenceDate);
      expect(status).toBe("expiry_soon");
    });

    it("evaluates correctly parsed date from various formatting strings relative to IST", () => {
      const dmyParsed = parseRenewalDate("25/07/2026");
      expect(dmyParsed).not.toBeNull();
      expect(dmyParsed.toISOString()).toBe("2026-07-24T18:30:00.000Z");

      const isoParsed = parseRenewalDate("2026-07-25");
      expect(isoParsed).not.toBeNull();
      expect(isoParsed.toISOString()).toBe("2026-07-24T18:30:00.000Z");
    });
  });
});

describe("parseBusinessDate helper", () => {
  it("parses standard date strings", () => {
    const date = parseBusinessDate("2026-07-09");
    expect(date).not.toBeNull();
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6); // 0-indexed July
    expect(date.getDate()).toBe(9);
    expect(date.getHours()).toBe(9); // default time
  });

  it("parses datetime strings with T separator", () => {
    const date = parseBusinessDate("2026-07-09T11:40");
    expect(date).not.toBeNull();
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(9);
    expect(date.getHours()).toBe(11);
    expect(date.getMinutes()).toBe(40);
  });

  it("parses datetime strings with space separator", () => {
    const date = parseBusinessDate("2026-07-09 15:30");
    expect(date).not.toBeNull();
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(9);
    expect(date.getHours()).toBe(15);
    expect(date.getMinutes()).toBe(30);
  });

  it("returns input Date object when valid", () => {
    const original = new Date();
    const parsed = parseBusinessDate(original);
    expect(parsed).toBe(original);
  });
});

