/* @vitest-environment node */
// NOTE: Skipped — PDF fixture files removed from repo. Re-enable when new fixtures are provided.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

describe("Bajaj warehouse extraction", () => {
  const dir = "tests/Warehouse/bajaj";
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir)
        .filter((name) => name.toLowerCase().endsWith(".pdf") && !name.includes("LAHOTI"))
        .map((name) => path.join(dir, name).replace(/\\/g, "/"))
        .sort()
    : [];

  files.forEach((file) => {
    it(`extracts warehouse core fields from ${file}`, async () => {
      const parsed = await pdf(fs.readFileSync(file));
      const result = extractPolicyFromText(parsed.text || "", file);

      expect(result.documentFormat).toBe("BAJAJ_WAREHOUSE_V1");
      expect(result.sourceDocumentType).toBe("BAJAJ_WAREHOUSE_V1");
      expect(result.documentCategory).toBe("Warehouse Insurance");
      expect(result.insuranceCompany).toBe("Bajaj Allianz General Insurance Company Limited");
      expect(result.policyNumber).not.toBe("");
      expect(result.policyType).toMatch(/Commercial Property|Fidelity|Burglary/i);
      expect(result.insuredName).not.toBe("");
      expect(result.insuredName).not.toMatch(/Risk Location:|Annual Aggregate:|Tollfree/i);
      expect(result.sumInsured).not.toBe("");
      expect(result.premiumIncludingGst || result.netPremium).not.toBe("");
      expect(result.startDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(result.expiryDate).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(result.registrationNumber || result.vehicleNumber || "").toBe("");
    });
  });

  it("adds Bajaj fire warehouse training fields from proposal-driven layout", async () => {
    const file = "tests/Warehouse/bajaj/OG-27-2301-4056-00001653.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text || "", file);

    expect(result.policySubType).toBe("WAREHOUSE_FIRE_POLICY");
    expect(result.warehousePolicySubType).toBe("WAREHOUSE_FIRE_POLICY");
    expect(result.extractionTrainingVersion).toBe("BAJAJ_WAREHOUSE_TRAINING_V1");
    expect(result.addressEntity).toMatchObject({
      village: "BAHORIBAND",
      tehsil: "HUZUR",
      district: "REWA",
      state: "MADHYA PRADESH",
      pincode: "486446",
    });
    expect(result.financialInstitutions).toEqual(["STATE BANK OF INDIA BRANCH REWA"]);
    expect(result.buildingSumInsured).toBe("1,50,00,000.00");
    expect(result.stockSumInsured).toBe("0.00");
    expect(result.addonDetails).toEqual([{ addon: "Earthquake", sumInsured: "1,50,00,000.00" }]);
    expect(result.coverageDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ coverage: "Building", status: "Covered", sumInsured: "1,50,00,000.00" }),
        expect.objectContaining({ coverage: "Earthquake", status: "Covered", sumInsured: "1,50,00,000.00" }),
      ]),
    );
    expect(result.bajajFieldConfidence.policyNumber).toBeGreaterThanOrEqual(0.9);
    expect(result.bajajFieldEvidence.policyNumber).toContain("OG-27-2301-4056-00001653");
    expect(result.needsManualReview).toBe(false);
  });

  it("adds Bajaj fidelity warehouse training fields", async () => {
    const file = "tests/Warehouse/bajaj/Policy (51).pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text || "", file);

    expect(result.policySubType).toBe("WAREHOUSE_FIDELITY_POLICY");
    expect(result.employeeCount).toBe("05");
    expect(result.perEmployeeLimit).toBe("1160000.00");
    expect(result.employeeSumInsured).toBe("58,00,000.00");
    expect(result.coverageDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ coverage: "Fidelity Guarantee", status: "Covered", sumInsured: "58,00,000.00" }),
        expect.objectContaining({ coverage: "Per Employee Limit", status: "Covered", sumInsured: "1160000.00" }),
      ]),
    );
  });

  it("adds Bajaj burglary warehouse training fields and avoids fire-policy number bleed", async () => {
    const file = "tests/Warehouse/bajaj/Policy (57).pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text || "", file);

    expect(result.policyNumber).toBe("OG-26-2806-4010-00000024");
    expect(result.policySubType).toBe("WAREHOUSE_BURGLARY_POLICY");
    expect(result.firePolicyReference).toBe("OG-26-2806-4056-00000037");
    expect(result.addressEntity).toMatchObject({
      village: "PIPRODA KHURD",
      tehsil: "GUNA",
      district: "GUNA",
      pincode: "473001",
    });
    expect(result.financialInstitutions).toEqual(
      expect.arrayContaining(["AXIS BANK LTD", "IDBI BANK", "PUNJAB NATIONAL BANK", "STATE BANK OF INDIA"]),
    );
    expect(result.coverageDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ coverage: "Burglary", status: "Covered", sumInsured: "5,80,00,000.00" }),
        expect.objectContaining({ coverage: "Stocks", status: "Covered", sumInsured: "5,80,00,000.00" }),
      ]),
    );
  });
});
