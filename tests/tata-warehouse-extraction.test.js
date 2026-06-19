/* @vitest-environment node */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

describe("Tata AIG warehouse extraction", () => {
  const files = fs
    .readdirSync("tests/Warehouse/Tata")
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .map((name) => path.join("tests/Warehouse/Tata", name).replace(/\\/g, "/"))
    .sort();

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
});
