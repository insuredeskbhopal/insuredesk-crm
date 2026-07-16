/* @vitest-environment node */
import fs from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

describe("United India warehouse extraction", () => {
  const cases = [
    {
      file: "storage/S.Poddar Infra.pdf",
      insuredName: "S. PODDAR INFRA",
      policyNumber: "1913011126P104882811",
      riskLocation: "SURVEY NO. 61, NEAR NEW LP WAREHOUSE, TEHSIL BHARAPAR, DISTRICT KUTCH, GUJARAT, 370205",
      tehsil: "BHARAPAR",
      pincode: "370205",
      sumInsured: "250000000.00",
      netPremium: "38960.00",
      igst: "7013.00",
      totalPremium: "45974.00",
      invoiceNumber: "1126I104882811",
      receiptNumber: "10119130126135425847",
    },
    {
      file: "storage/Shreeji Exports.pdf",
      insuredName: "SHREEJI EXPORTS (NEW)",
      policyNumber: "1913011126P104882625",
      riskLocation: "GODOWN NO. 04, PLOT NO. 38, BEHIND ACT WAREHOUSE, TEHSIL KANDLA, DISTRICT KUTCH, GUJARAT, 370210",
      tehsil: "KANDLA",
      pincode: "370210",
      sumInsured: "100000000.00",
      netPremium: "15585.00",
      igst: "2805.00",
      totalPremium: "18391.00",
      invoiceNumber: "1126I104882625",
      receiptNumber: "10119130126135426050",
    },
  ];

  cases.forEach((expected) => {
    it(`extracts ${expected.file}`, async () => {
      const parsed = await pdf(fs.readFileSync(expected.file));
      const result = extractPolicyFromText(parsed.text || "", expected.file);

      expect(result).toMatchObject({
        documentFormat: "UNITED_INDIA_WAREHOUSE_V1",
        sourceDocumentType: "UNITED_INDIA_WAREHOUSE_V1",
        documentCategory: "Warehouse Insurance",
        insuranceCompany: "United India Insurance Company Limited",
        productName: "United Bharat Laghu Udyam Suraksha Policy",
        policyType: "United Bharat Laghu Udyam Suraksha Policy",
        policySubType: "WAREHOUSE_FIRE_POLICY",
        insuredName: expected.insuredName,
        policyNumber: expected.policyNumber,
        mailingAddress: expected.riskLocation,
        riskLocation: expected.riskLocation,
        district: "KUTCH",
        tehsil: expected.tehsil,
        state: "GUJARAT",
        pincode: expected.pincode,
        startDate: "03/07/2026",
        expiryDate: "02/08/2026",
        sumInsured: expected.sumInsured,
        contentsSumInsured: expected.sumInsured,
        stockSumInsured: expected.sumInsured,
        netPremium: expected.netPremium,
        igst: expected.igst,
        gstAmount: expected.igst,
        premiumIncludingGst: expected.totalPremium,
        invoiceNumber: expected.invoiceNumber,
        invoiceDate: "02/07/2026",
        receiptNumber: expected.receiptNumber,
        receiptDate: "02/07/2026",
        brokerName: "RUPAL SOMANI",
        brokerCode: "AGN1051496",
        goodsStored: "RICE",
        needsManualReview: false,
        extractionTrainingVersion: "UNITED_INDIA_WAREHOUSE_TRAINING_V1",
      });
      expect(result.financialInstitutions).toEqual(
        expect.arrayContaining(["HDFC BANK LTD", "ICICI BANK LTD", "STATE BANK OF INDIA"]),
      );
      expect(result.registrationNumber || result.vehicleNumber || "").toBe("");
    });
  });
});
