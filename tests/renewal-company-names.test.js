import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
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
    ["IFFCO", "IFFCO Tokio General Insurance Company Limited"],
    ["RELIANCE", "Reliance General Insurance Company Limited"],
    ["SHRIRAM", "Shriram General Insurance Company Limited"],
    ["SHRIRAM GENERAL INSURANCE COMPANY LIMITED", "Shriram General Insurance Company Limited"],
    ["UNITED", "United India Insurance Company Limited"],
    ["UNITED INDIA", "United India Insurance Company Limited"],
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

  it.each([
    ["The New India Assurance Company Limited", "New India Assurance Company Limited"],
    ["Bajaj Allianz General Insurance Company Limited", "Bajaj Allianz General Insurance Co. Ltd."],
    ["HDFC ERGO General Insurance Company Limited", "HDFC"],
    ["IFFCO Tokio General Insurance Company Limited", "IFFCO TOKIO GENERAL INSURANCE CO.LTD."],
    ["Liberty General Insurance Limited", "LIBERTY GENERAL"],
    ["United India Insurance Company Limited", "UNITED INDIA"],
  ])("provides an alias contained in the stored renewal name for %s", (company, storedName) => {
    const terms = getRenewalCompanyFilterTerms(company).split("|||");
    expect(terms.some((term) => storedName.toLowerCase().includes(term.toLowerCase()))).toBe(true);
  });

  it("uses alias-aware company matching in policy and customer renewal queries", () => {
    const policiesRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/renewals/policies/route.js"),
      "utf8",
    );
    const customersRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/renewals/customers/route.js"),
      "utf8",
    );

    expect(policiesRoute.match(/LIKE '%' \|\| LOWER\(TRIM\(filter_company\.value\)\) \|\| '%'/g)).toHaveLength(6);
    expect(customersRoute.match(/LIKE '%' \|\| LOWER\(TRIM\(filter_company\.value\)\) \|\| '%'/g)).toHaveLength(2);
  });
});
