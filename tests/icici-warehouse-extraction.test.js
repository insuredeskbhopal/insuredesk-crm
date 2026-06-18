/* @vitest-environment node */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../lib/policies/pdf/extractor.cjs");
const pdf = require("pdf-parse");

describe("ICICI warehouse MSME Suraksha Kavach extraction", () => {
  it("locks the PATEL WAREHOUSE AC MPWLC policy extraction contract", async () => {
    const file = "tests/POLICY COPY/FIRE - WAREHOUSE/PATEL WAREHOUSE AC MPWLC - POLICY- ICICI.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text, file);

    expect(result.documentFormat).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.sourceDocumentType).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.insuranceCompany).toBe("ICICI Lombard General Insurance Company Limited");
    expect(result.productName).toBe("MSME Suraksha Kavach Package Policy - Advance");
    expect(result.policyNumber).toBe("1030/443318299/00/000");
    expect(result.policyType).toBe("Warehouse / MSME / Fire & Burglary package");
    expect(result.insuredName).toBe("PATEL WAREHOUSE A/C MPWLC");
    expect(result.mailingAddress).toBe(
      "PROP. SWAMI SHARAN, GODOWN NO. 01 2E, GRAM TATARPUR, TEHSIL BHANDER, DISTRICT DATIA, MADHYA PRADESH 475335",
    );
    expect(result.riskLocation).toBe(
      "PROP. SWAMI SHARAN, GODOWN NO. 02E, GRAM TATARPUR, TEHSIL BHANDER, DISTRICT DATIA, MADHYA PRADESH, 475335",
    );
    expect(result.startDate).toBe("02/06/2026");
    expect(result.expiryDate).toBe("01/06/2027");
    expect(result.issuedAt).toBe("BHOPAL");
    expect(result.businessDescription).toBe("Storage of Non-hazardous goods / godown or warehouse");
    expect(result.premiumIncludingGst).toBe("15,340.00");
    expect(result.netPremium).toBe("13000.00");
    expect(result.gstAmount).toBe("2340.00");
    expect(result.cgst).toBe("1170.00");
    expect(result.sgst).toBe("1170.00");
    expect(result.invoiceNumber).toBe("100626100636");
    expect(result.invoiceDate).toBe("02/06/2026");
    expect(result.gstin).toBe("23AAACI7904G1ZV");
    expect(result.placeOfSupply).toBe("MADHYA PRADESH");
    expect(result.hypothecationDetails).toBe("MPWLC");
    expect(result.bankChargeType).toBe("MPWLC - Hypothecation");
    expect(result.brokerName).toBe("INSUREDESK");
    expect(result.brokerCode).toBe("2021477077928594");
    expect(result.brokerMobile).toBe("8818889660");
    expect(result.brokerEmail).toBe("anand.soni10@gmai.com");
    expect(result.coverages).toEqual([
      { sectionName: "MSME Suraksha Kavach - Contents", sumInsured: "5,00,00,000.00" },
      { sectionName: "Burglary", sumInsured: "5,00,00,000.00" },
      { sectionName: "Fidelity", sumInsured: "50,00,000.00" },
    ]);
    expect(result.vehicleNumber).toBe("");
    expect(result.registrationNumber).toBe("");
    expect(result.engineNumber).toBe("");
    expect(result.chassisNumber).toBe("");
    expect(result.policyCoverType).toBe("");
    expect(result.needsManualReview).toBe(false);
  });
});
