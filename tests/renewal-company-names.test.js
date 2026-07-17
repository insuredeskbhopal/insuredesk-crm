import { describe, expect, it } from "vitest";
import {
  consolidateRenewalCompanyStats,
  getRenewalCompanyFilterTerms,
  normalizeRenewalInsuranceCompany,
  withRenewalCompanyDisplay,
} from "../src/lib/renewals/companies";

describe("renewal insurance company names", () => {
  it.each([
    ["ICICI", "ICICI Lombard General Insurance Company Limited"],
    ["ICICI Lombard", "ICICI Lombard General Insurance Company Limited"],
    ["HDFC", "HDFC ERGO General Insurance Company Limited"],
    ["Future", "Generali Central Insurance Company Limited"],
    ["UNITED", "United India Insurance Company Limited"],
    ["Go digit", "Go Digit General Insurance Limited"],
  ])("normalizes %s to one canonical renewal name", (input, expected) => {
    expect(normalizeRenewalInsuranceCompany(input)).toBe(expected);
  });

  it("uses canonical names for old and renewed policy displays", () => {
    expect(
      withRenewalCompanyDisplay({ insuranceCompany: "ICICI", renewedInsuranceCompany: "ICICI Lombard" }),
    ).toMatchObject({
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      renewedInsuranceCompany: "ICICI Lombard General Insurance Company Limited",
    });
  });

  it("merges legacy aliases into one company statistics row", () => {
    const rows = consolidateRenewalCompanyStats([
      { company: "ICICI", total: 2, due: 1 },
      { company: "ICICI Lombard", total: 3, due: 2 },
    ]);

    expect(rows).toEqual([
      {
        company: "ICICI Lombard General Insurance Company Limited",
        total: 5,
        due: 3,
      },
    ]);
  });

  it("expands a canonical company filter to its renewal aliases", () => {
    const terms = getRenewalCompanyFilterTerms("ICICI Lombard General Insurance Company Limited").split("|||");
    expect(terms).toContain("ICICI Lombard General Insurance Company Limited");
    expect(terms).toContain("ICICI Lombard");
    expect(terms).toContain("icici");
  });
});
