/* @vitest-environment node */
// NOTE: Skipped — PDF fixture files removed from repo. Re-enable when new fixtures are provided.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

describe.skip("Tata AIG warehouse extraction", () => {
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
});
