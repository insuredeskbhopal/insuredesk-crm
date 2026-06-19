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
    expect(result.district).toBe("DATIA");
    expect(result.tehsil).toBe("BHANDER");
    expect(result.startDate).toBe("02/06/2026");
    expect(result.expiryDate).toBe("01/06/2027");
    expect(result.issuedAt).toBe("BHOPAL");
    expect(result.businessDescription).toBe("Storage of Non-hazardous goods / godown or warehouse");
    expect(result.premiumIncludingGst).toBe("15,340.00");
    expect(result.netPremium).toBe("13000.00");
    expect(result.gstAmount).toBe("2340.00");
    expect(result.cgst).toBe("1170.00");
    expect(result.sgst).toBe("1170.00");
    expect(result.igst).toBe("0.00");
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
    expect(result.needsManualReview).toBe(false);
  });

  it("locks the HARIOM WAREHOUSE - policy.pdf extraction contract", async () => {
    const file = "tests/Warehouse/ICICI/HARIOM WAREHOUSE - policy.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text, file);

    expect(result.documentFormat).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.sourceDocumentType).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.insuranceCompany).toBe("ICICI Lombard General Insurance Company Limited");
    expect(result.productName).toBe("MSME Suraksha Kavach Package Policy - Advance");
    expect(result.policyNumber).toBe("1030/443224286/00/000");
    expect(result.policyType).toBe("Warehouse / MSME / Fire & Burglary package");
    expect(result.insuredName).toBe("HARIOM WAREHOUSE");
    expect(result.mailingAddress).toBe(
      "PROP. TRIPTI LODHI, JABALPUR TO BHOPAL 4 LANE ROAD, VILLAGE JAMUNIYA, TEHSIL TENDUKHEDA, DISTRICT NARSINGHPUR, JAMUNIA, NARSINGHPUR, MADHYA PRADESH, NARSIMHAPUR, MADHYA PRADESH - 487118",
    );
    expect(result.riskLocation).toBe(
      "PROP. TRIPTI LODHI, JABALPUR TO BHOPAL 4 LANE ROAD, VILLAGE JAMUNIYA, TEHSIL TENDUKHEDA, DISTRICT NARSINGHPUR, JAMUNIA, NARSINGHPUR, MADHYA PRADESH, MADHYA PRADESH, NARSIMHAPUR, 487118",
    );
    expect(result.district).toBe("NARSINGHPUR");
    expect(result.tehsil).toBe("TENDUKHEDA");
    expect(result.startDate).toBe("01/06/2026");
    expect(result.expiryDate).toBe("31/05/2027");
    expect(result.issuedAt).toBe("BHOPAL");
    expect(result.businessDescription).toBe("Storage of Non-hazardous goods / godown or warehouse");
    expect(result.premiumIncludingGst).toBe("2,213.00");
    expect(result.netPremium).toBe("1875.00");
    expect(result.gstAmount).toBe("337.00");
    expect(result.cgst).toBe("168.75");
    expect(result.sgst).toBe("168.75");
    expect(result.igst).toBe("0.00");
    expect(result.invoiceNumber).toBe("10062618038");
    expect(result.invoiceDate).toBe("01/06/2026");
    expect(result.gstin).toBe("23AAACI7904G1ZV");
    expect(result.placeOfSupply).toBe("MADHYA PRADESH");
    expect(result.hypothecationDetails).toBe("None");
    expect(result.bankChargeType).toBe("");
    expect(result.brokerName).toBe("INSUREDESK");
    expect(result.brokerCode).toBe("2021477077928594");
    expect(result.brokerMobile).toBe("8818889660");
    expect(result.brokerEmail).toBe("anand.soni10@gmai.com");
    expect(result.coverages).toEqual([{ sectionName: "MSME Suraksha Kavach - Buildings", sumInsured: "75,00,000.00" }]);
    expect(result.needsManualReview).toBe(false);
  });

  it("locks the MS KAMLADEVI WAREHOUSE -BUILDING POLICY.pdf extraction contract", async () => {
    const file = "tests/Warehouse/ICICI/MS KAMLADEVI WAREHOUSE -BUILDING POLICY.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text, file);

    expect(result.documentFormat).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.sourceDocumentType).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.insuranceCompany).toBe("ICICI Lombard General Insurance Company Limited");
    expect(result.productName).toBe("MSME Suraksha Kavach Package Policy - Advance");
    expect(result.policyNumber).toBe("1030/443484221/00/000");
    expect(result.policyType).toBe("Warehouse / MSME / Fire & Burglary package");
    expect(result.insuredName).toBe("M/S KAMLADEVI WAREHOUSE");
    expect(result.mailingAddress).toBe(
      "PROP. BHAVANA KAMRANI, SURVEY NO. 516/1 2, VILLAGE MOHAMMADPURA, NEAR MACRO VISION ACADEMY SCHOOL, MADHYA PRADESH, BURHANPUR, MADHYA PRADESH - 450331",
    );
    expect(result.riskLocation).toBe(
      "PROP. BHAVANA KAMRANI, SURVEY NO. 516/1 2, VILLAGE MOHAMMADPURA, NEAR MACRO VISION ACADEMY SCHOOL, MADHYA PRADESH, MADHYA PRADESH, BURHANPUR, 450331",
    );
    expect(result.district).toBe("BURHANPUR");
    expect(result.tehsil).toBe("");
    expect(result.startDate).toBe("01/06/2026");
    expect(result.expiryDate).toBe("31/05/2027");
    expect(result.issuedAt).toBe("BHOPAL");
    expect(result.businessDescription).toBe("Storage of Non-hazardous goods / godown or warehouse");
    expect(result.premiumIncludingGst).toBe("5,163.00");
    expect(result.netPremium).toBe("4375.00");
    expect(result.gstAmount).toBe("787.00");
    expect(result.cgst).toBe("393.75");
    expect(result.sgst).toBe("393.75");
    expect(result.igst).toBe("0.00");
    expect(result.invoiceNumber).toBe("100626241789");
    expect(result.invoiceDate).toBe("01/06/2026");
    expect(result.gstin).toBe("23AAACI7904G1ZV");
    expect(result.placeOfSupply).toBe("MADHYA PRADESH");
    expect(result.hypothecationDetails).toBe("BANK OF BARODA");
    expect(result.bankChargeType).toBe("BANK OF BARODA - Hypothecation");
    expect(result.brokerName).toBe("INSUREDESK");
    expect(result.brokerCode).toBe("2021477077928594");
    expect(result.brokerMobile).toBe("8818889660");
    expect(result.brokerEmail).toBe("anand.soni10@gmai.com");
    expect(result.coverages).toEqual([{ sectionName: "MSME Suraksha Kavach - Buildings", sumInsured: "1,75,00,000.00" }]);
    expect(result.needsManualReview).toBe(false);
  });

  it("locks the MS KAMLADEVI WAREHOUSE AC MPWLC_STOCK POLICY.pdf extraction contract", async () => {
    const file = "tests/Warehouse/ICICI/MS KAMLADEVI WAREHOUSE AC MPWLC_STOCK POLICY.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text, file);

    expect(result.documentFormat).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.sourceDocumentType).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.insuranceCompany).toBe("ICICI Lombard General Insurance Company Limited");
    expect(result.productName).toBe("MSME Suraksha Kavach Package Policy - Advance");
    expect(result.policyNumber).toBe("1030/443328681/00/000");
    expect(result.policyType).toBe("Warehouse / MSME / Fire & Burglary package");
    expect(result.insuredName).toBe("M/S KAMLADEVI WAREHOUSE A/C MPWLC");
    expect(result.mailingAddress).toBe(
      "PROP. MANOHAR KAMRANI, SURVEY NO 516/1 2 TOTAL AREA 0.85 HECTARE, VILLAGE MOHAMMADPURA, NEAR MACRO VISION ACADEMY SCHOOL ,DISTRICT BURHANPUR, MADHYA PRADESH 450331, BURHANPUR, MADHYA PRADESH - 450331",
    );
    expect(result.riskLocation).toBe(
      "PROP. MANOHAR KAMRANI, SURVEY NO 516/1 2 TOTAL AREA 0.85 HECTARE, VILLAGE MOHAMMADPURA, NEAR MACRO VISION ACADEMY SCHOOL ,DISTRICT BURHANPUR, MADHYA PRADESH, 450331, MADHYA PRADESH, BURHANPUR, 450331",
    );
    expect(result.district).toBe("BURHANPUR");
    expect(result.tehsil).toBe("");
    expect(result.startDate).toBe("02/06/2026");
    expect(result.expiryDate).toBe("01/06/2027");
    expect(result.issuedAt).toBe("BHOPAL");
    expect(result.businessDescription).toBe("Storage of Non-hazardous goods / godown or warehouse");
    expect(result.premiumIncludingGst).toBe("51,920.00");
    expect(result.netPremium).toBe("44000.00");
    expect(result.gstAmount).toBe("7920.00");
    expect(result.cgst).toBe("3960.00");
    expect(result.sgst).toBe("3960.00");
    expect(result.igst).toBe("0.00");
    expect(result.invoiceNumber).toBe("100626110823");
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
      { sectionName: "MSME Suraksha Kavach - Contents", sumInsured: "10,00,00,000.00" },
      { sectionName: "Burglary", sumInsured: "10,00,00,000.00" },
      { sectionName: "Fidelity", sumInsured: "1,00,00,000.00" },
    ]);
    expect(result.needsManualReview).toBe(false);
  });

  it("locks the MS SIYA WAREHOUSE AC MPWLC-policy.pdf extraction contract", async () => {
    const file = "tests/Warehouse/ICICI/MS SIYA WAREHOUSE AC MPWLC-policy.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text, file);

    expect(result.documentFormat).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.sourceDocumentType).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(result.insuranceCompany).toBe("ICICI Lombard General Insurance Company Limited");
    expect(result.productName).toBe("MSME Suraksha Kavach Package Policy - Advance");
    expect(result.policyNumber).toBe("1030/443244539/00/000");
    expect(result.policyType).toBe("Warehouse / MSME / Fire & Burglary package");
    expect(result.insuredName).toBe("MS SIYA WAREHOUSE A/C MPWLC");
    expect(result.mailingAddress).toBe(
      "PROP. RASHMI THAKUR, GRAM SONPUR, GOURJHAMAR, TEHSIL DEORI, DISTRICT SAGAR, MADHYA PRADESH 470223, SAGAR, MADHYA PRADESH - 470223",
    );
    expect(result.riskLocation).toBe(
      "PROP. RASHMI THAKUR, GRAM SONPUR, GOURJHAMAR, TEHSIL DEORI, DISTRICT SAGAR, MADHYA PRADESH, 470223, MADHYA PRADESH, SAGAR, 470223",
    );
    expect(result.district).toBe("SAGAR");
    expect(result.tehsil).toBe("DEORI");
    expect(result.startDate).toBe("01/06/2026");
    expect(result.expiryDate).toBe("30/11/2026");
    expect(result.issuedAt).toBe("BHOPAL");
    expect(result.businessDescription).toBe("Storage of Non-hazardous goods / godown or warehouse");
    expect(result.premiumIncludingGst).toBe("30,000.00");
    expect(result.netPremium).toBe("25424.00");
    expect(result.gstAmount).toBe("4576.32");
    expect(result.cgst).toBe("2288.16");
    expect(result.sgst).toBe("2288.16");
    expect(result.igst).toBe("0.00");
    expect(result.invoiceNumber).toBe("10062637927");
    expect(result.invoiceDate).toBe("01/06/2026");
    expect(result.gstin).toBe("23AAACI7904G1ZV");
    expect(result.placeOfSupply).toBe("MADHYA PRADESH");
    expect(result.hypothecationDetails).toBe("MPWLC");
    expect(result.bankChargeType).toBe("MPWLC - Hypothecation");
    expect(result.brokerName).toBe("INSUREDESK");
    expect(result.brokerCode).toBe("2021477077928594");
    expect(result.brokerMobile).toBe("8818889660");
    expect(result.brokerEmail).toBe("anand.soni10@gmai.com");
    expect(result.coverages).toEqual([
      { sectionName: "MSME Suraksha Kavach - Contents", sumInsured: "13,00,00,000.00" },
      { sectionName: "Burglary", sumInsured: "13,00,00,000.00" },
      { sectionName: "Fidelity", sumInsured: "1,30,00,000.00" },
    ]);
    expect(result.needsManualReview).toBe(false);
  });

  it("locks the PATEL WAREHOUSE AC MPWLC - POLICY.pdf extraction contract", async () => {
    const file = "tests/Warehouse/ICICI/PATEL WAREHOUSE AC MPWLC - POLICY.pdf";
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
    expect(result.district).toBe("DATIA");
    expect(result.tehsil).toBe("BHANDER");
    expect(result.startDate).toBe("02/06/2026");
    expect(result.expiryDate).toBe("01/06/2027");
    expect(result.issuedAt).toBe("BHOPAL");
    expect(result.businessDescription).toBe("Storage of Non-hazardous goods / godown or warehouse");
    expect(result.premiumIncludingGst).toBe("15,340.00");
    expect(result.netPremium).toBe("13000.00");
    expect(result.gstAmount).toBe("2340.00");
    expect(result.cgst).toBe("1170.00");
    expect(result.sgst).toBe("1170.00");
    expect(result.igst).toBe("0.00");
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
    expect(result.needsManualReview).toBe(false);
  });
});
