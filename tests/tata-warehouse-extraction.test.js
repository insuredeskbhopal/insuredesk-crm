/* @vitest-environment node */
// NOTE: Skipped — PDF fixture files removed from repo. Re-enable when new fixtures are provided.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

describe("Tata AIG warehouse extraction", () => {
  const dir = "tests/Warehouse/Tata";
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir)
        .filter((name) => name.toLowerCase().endsWith(".pdf"))
        .map((name) => path.join(dir, name).replace(/\\/g, "/"))
        .sort()
    : [];

  files.forEach((file) => {
    it(`extracts warehouse core fields from ${file}`, async () => {
      const parsed = await pdf(fs.readFileSync(file));
      const result = extractPolicyFromText(parsed.text || "", file);

      expect(result.documentFormat).toBe("TATA_AIG_WAREHOUSE_V1");
      expect(result.sourceDocumentType).toBe("TATA_AIG_WAREHOUSE_V1");
      expect(result.documentCategory).toBe("Warehouse Insurance");
      expect(result.insuranceCompany).toBe("Tata AIG General Insurance Company Limited");
      expect(result.policyNumber).not.toBe("");
      expect(result.policyType).toMatch(/Business Guard/i);
      expect(result.insuredName).not.toBe("");
      expect(result.insuredName).not.toMatch(/Risk Location:|Annual Aggregate:|Tollfree/i);
      expect(result.riskLocation).not.toBe("");
      expect(result.businessDescription).toMatch(/Storage|Warehouse/i);
      expect(result.sumInsured).not.toBe("");
      expect(result.premiumIncludingGst).not.toBe("");
      expect(result.netPremium).not.toBe("");
      expect(result.startDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(result.expiryDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(result.registrationNumber || result.vehicleNumber || "").toBe("");
    });
  });

  it("extracts exact details from the Lahoti Warehousing policy", async () => {
    const file = "tests/Warehouse/bajaj/_LAHOTI WAREHOUSING CORPORATION AC MPWLC -POLICY.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text || "", file);

    expect(result.documentFormat).toBe("TATA_AIG_WAREHOUSE_V1");
    expect(result.sourceDocumentType).toBe("TATA_AIG_WAREHOUSE_V1");
    expect(result.insuranceCompany).toBe("Tata AIG General Insurance Company Limited");
    expect(result.policyNumber).toBe("5130026758");
    expect(result.policyType).toBe("Business Guard Laghu Package Policy");
    expect(result.insuredName).toBe("LAHOTI WAREHOUSING CORPORATION A/C MPWLC");
    expect(result.riskLocation).toContain("VIDISHA");
    expect(result.sumInsured).toBe("9,00,00,000.00");
    expect(result.netPremium).toBe("16,351.00");
    expect(result.premiumIncludingGst).toBe("19,294.00");
  });

  it("extracts the Shri Sawariya warehouse sum-insured endorsement", async () => {
    const file = "tests/Warehouse/Tata/SHRI SAWARIYA WAREHOUSE 20 AC MPWLC ENDO.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text || "", file);

    expect(result).toMatchObject({
      documentFormat: "TATA_AIG_WAREHOUSE_V1",
      documentCategory: "Warehouse Insurance",
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      policyNumber: "5161117456",
      insuredName: "SHRI SAWARIYA WAREHOUSE 20 A/C MPWLC",
      startDate: "12/05/2026",
      expiryDate: "11/05/2027",
      netPremium: "13,871.00",
      premiumIncludingGst: "16,367.00",
      cgst: "1,248.00",
      sgst: "1,248.00",
      gstAmount: "2496.00",
      sumInsured: "59,000,000.00",
      contentsSumInsured: "59,000,000.00",
      burglarySumInsured: "59,000,000.00",
      fidelitySumInsured: "5,900,000.00",
      isEndorsement: true,
      endorsementNumber: "01",
      endorsementEffectiveDate: "02/07/2026",
      extractionTrainingVersion: "TATA_AIG_WAREHOUSE_ENDORSEMENT_V1",
    });
    expect(result.coverages).toHaveLength(3);
    expect(result.registrationNumber || result.vehicleNumber || "").toBe("");
  });
});
