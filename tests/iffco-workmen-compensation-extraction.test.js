/* @vitest-environment node */
import fs from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../lib/policies/pdf/extractor.cjs");

describe("IFFCO Tokio Workmen Compensation extraction", () => {
  it("does not misclassify the IFFCO WC policy as motor", async () => {
    const file = "tests/POLICY COPY/WC/AKSHAT INDUSTRIES_WC-IFFCO.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text, file);

    expect(result).toMatchObject({
      documentFormat: "IFFCO_TOKIO_WORKMEN_COMPENSATION_V1",
      sourceDocumentType: "IFFCO_TOKIO_WORKMEN_COMPENSATION_V1",
      documentCategory: "Workmen Compensation Insurance",
      insuranceCompany: "IFFCO Tokio General Insurance Company Limited",
      policyType: "Workmen's Compensation Policy",
      policyNumber: "43329326",
      insuredName: "AKSHAT INDUSTRIES",
      businessDescription: "DAL MILL",
      description: "Flour and Dal Mills",
      startDate: "06/06/2024",
      expiryDate: "05/06/2025",
      netPremium: "3369.60",
      premiumIncludingGst: "3976.12",
      premium: "3976.12",
      totalPremium: "3976.12",
      cgst: "303.26",
      sgst: "303.26",
      gstAmount: "606.52",
      brokerCode: "21002149",
      brokerName: "GUPTA, CHANCHAL",
      brokerMobile: "8818889660",
      employeeCount: "8",
      totalWages: "1800000.00",
      sumInsured: "1800000.00",
    });
    expect(result.registrationNumber || result.vehicleNumber || "").toBe("");
    expect(result.employeeCategories).toEqual([
      { category: "CLERICAL STAFF", workers: "3", estimatedWages: "900000" },
      { category: "LABOUR", workers: "5", estimatedWages: "900000" },
    ]);
  });
});
