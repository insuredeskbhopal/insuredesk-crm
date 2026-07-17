import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  RENEWAL_REGISTER_CATEGORY_TABS,
  RENEWAL_REGISTER_MONTHS,
  formatRenewalRegisterAmount,
  formatRenewalRegisterDate,
  getRenewalRegisterMonthLabel,
  getRenewalRegisterStatusTone,
  normalizeRenewalRegisterMonth,
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

  it("provides category tabs and all twelve expiry-month filters", () => {
    expect(RENEWAL_REGISTER_CATEGORY_TABS.map((tab) => tab.value)).toEqual(["All", "Motor", "Fire", "Other"]);
    expect(RENEWAL_REGISTER_MONTHS).toHaveLength(13);
    expect(normalizeRenewalRegisterMonth("8")).toBe("8");
    expect(normalizeRenewalRegisterMonth("13")).toBe("All");
    expect(getRenewalRegisterMonthLabel("8")).toBe("August");
  });

  it("applies the month filter before server pagination and returns category counts", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/renewals/policies/route.js"), "utf8");
    const page = fs.readFileSync(path.join(process.cwd(), "src/app/(dashboard)/dashboard/renewals/policies/page.js"), "utf8");

    expect(route).toContain("EXTRACT(MONTH FROM expiry_date)");
    expect(route).toContain("categoryCounts: normalizeCategoryCounts");
    expect(route).toContain("LIMIT $12::integer OFFSET $13::integer");
    expect(page).toContain('params.set("month", renewalMonth)');
    expect(page).toContain('params.set("company", company)');
    expect(page).toContain('aria-label="Insurance company"');
    expect(page).toContain("RENEWAL_REGISTER_CATEGORY_TABS.map");
  });
});
