import { describe, expect, it } from "vitest";
import {
  formatRenewalRegisterAmount,
  formatRenewalRegisterDate,
  getRenewalRegisterStatusTone,
} from "../src/lib/renewals/register";

describe("policy-wise renewal register", () => {
  it("formats renewal dates without exposing a time", () => {
    expect(formatRenewalRegisterDate("2026-08-01")).toBe("01 Aug 2026");
    expect(formatRenewalRegisterDate("")).toBe("—");
  });

  it("formats numeric renewal amounts and preserves non-numeric values", () => {
    expect(formatRenewalRegisterAmount("125000")).toContain("1,25,000");
    expect(formatRenewalRegisterAmount("On request")).toBe("On request");
  });

  it("maps statuses to stable visual tones", () => {
    expect(getRenewalRegisterStatusTone("expiry_soon")).toBe("warning");
    expect(getRenewalRegisterStatusTone("expired")).toBe("danger");
    expect(getRenewalRegisterStatusTone("active")).toBe("success");
  });
});
