import { describe, expect, it } from "vitest";
import { getDaysStatus, getExpiryState, parseRenewalDate } from "../lib/renewals/dates.js";

describe("renewal date helpers", () => {
  it("parses DMY expiry dates", () => {
    const date = parseRenewalDate("15/06/2026");
    expect(date).not.toBeNull();
    expect(date.getDate()).toBe(15);
    expect(date.getMonth()).toBe(5);
  });

  it("flags missing and invalid expiry states", () => {
    expect(getExpiryState("")).toBe("missing");
    expect(getExpiryState("not-a-date")).toBe("invalid");
    expect(getDaysStatus("")).toBe("Missing Expiry Date");
    expect(getDaysStatus("bad-value")).toBe("Invalid Expiry Date");
  });
});
