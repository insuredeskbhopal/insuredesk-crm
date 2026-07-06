import { describe, expect, it } from "vitest";
import { getDaysStatus, getExpiryState, parseRenewalDate, getIndiaDateParts } from "../src/lib/renewals/dates.js";

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
});
