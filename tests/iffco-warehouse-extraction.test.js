/* @vitest-environment node */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../lib/policies/pdf/extractor.cjs");
const pdf = require("pdf-parse");

describe("IFFCO Tokio Warehouse Policy extraction", () => {
  const testCases = [
    {
      file: "tests/Warehouse/IFFCO/222 copy.pdf",
      policyType: "Fidelity Guarantee",
      policyNumber: "41116078",
      insuredName: "KISHAN WAREHOUSE UNIT TARAIYA NO. 2/O/2 C/O MPWLC",
      district: "DATIA",
      tehsil: "",
      netPremium: "650.00",
      premiumIncludingGst: "767.00",
      sumInsured: "12000000.00",
      hypothecation: "MPWLC",
      startDate: "01/06/2026",
      expiryDate: "31/05/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/222.pdf",
      policyType: "Fidelity Guarantee",
      policyNumber: "41116078",
      insuredName: "KISHAN WAREHOUSE UNIT TARAIYA NO. 2/O/2 C/O MPWLC",
      district: "DATIA",
      tehsil: "",
      netPremium: "650.00",
      premiumIncludingGst: "767.00",
      sumInsured: "12000000.00",
      hypothecation: "MPWLC",
      startDate: "01/06/2026",
      expiryDate: "31/05/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/DERIYA WAREHOUSING AND LOGISTICS  FIRE POLICY.pdf",
      policyType: "FLEXI PROPERTY PROTECTOR",
      policyNumber: "12A97642",
      insuredName: "DERIYA WAREHOUSING AND LOGISTICS A/C MPWLC",
      district: "HOSHANGABAD",
      tehsil: "BABAI",
      netPremium: "21699.73",
      premiumIncludingGst: "25606.00",
      sumInsured: "62000000.00",
      hypothecation: "MPWLC",
      startDate: "04/06/2026",
      expiryDate: "03/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/DERIYA WAREHOUSING AND LOGISTICS - FIDELITY POLICY.pdf",
      policyType: "Fidelity Guarantee",
      policyNumber: "41116169",
      insuredName: "DERIYA WAREHOUSING AND LOGISTICS A/C MPWLC",
      district: "HOSHANGABAD",
      tehsil: "BABAI",
      netPremium: "236.07",
      premiumIncludingGst: "278.57",
      sumInsured: "6200000.00",
      hypothecation: "MPWLC",
      startDate: "04/06/2026",
      expiryDate: "03/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/DERIYA WAREHOUSING AND LOGISTICS BURGLARY POLICY.pdf",
      policyType: "BURGLARY AND HOUSE BREAKING INSURANCE",
      policyNumber: "44541964",
      insuredName: "DERIYA WAREHOUSING AND LOGISTICS A/C MPWLC",
      district: "HOSHANGABAD",
      tehsil: "BABAI",
      netPremium: "170.50",
      premiumIncludingGst: "201.00",
      sumInsured: "62000000.00",
      hypothecation: "MPWLC",
      startDate: "04/06/2026",
      expiryDate: "03/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/GURUKRIPA WAREHOUSE - FIDELITY POLICY.pdf",
      policyType: "Fidelity Guarantee",
      policyNumber: "41116170",
      insuredName: "GURUKRIPA WAREHOUSE A/C MPWLC",
      district: "SAGAR",
      tehsil: "",
      netPremium: "1612.00",
      premiumIncludingGst: "1902.16",
      sumInsured: "26000000.00",
      hypothecation: "MPWLC",
      startDate: "04/06/2026",
      expiryDate: "03/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/GURUKRIPA WAREHOUSE AC MPWLC -BURGLARY POLICY.pdf",
      policyType: "BURGLARY AND HOUSE BREAKING INSURANCE",
      policyNumber: "44541968",
      insuredName: "GURUKRIPA WAREHOUSE A/C MPWLC",
      district: "SAGAR",
      tehsil: "",
      netPremium: "214.50",
      premiumIncludingGst: "253.00",
      sumInsured: "260000000.00",
      hypothecation: "MPWLC",
      startDate: "04/06/2026",
      expiryDate: "03/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/GURUKRIPA WAREHOUSE AC MPWLC- FIRE POLICY.pdf",
      policyType: "FLEXI PROPERTY PROTECTOR",
      policyNumber: "12A97663",
      insuredName: "GURUKRIPA WAREHOUSE A/C MPWLC",
      district: "SAGAR",
      tehsil: "",
      netPremium: "90998.44",
      premiumIncludingGst: "107378.00",
      sumInsured: "260000000.00",
      hypothecation: "MPWLC",
      startDate: "04/06/2026",
      expiryDate: "03/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/HSV WAREHOUSING AC MPWLC  - BURGLARY.pdf",
      policyType: "BURGLARY AND HOUSE BREAKING INSURANCE",
      policyNumber: "44541864",
      insuredName: "HSV WAREHOUSING AC MPWLC",
      district: "",
      tehsil: "BABAI",
      netPremium: "330.00",
      premiumIncludingGst: "389.00",
      sumInsured: "120000000.00",
      hypothecation: "MPWLC",
      startDate: "02/06/2026",
      expiryDate: "01/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/HSV WAREHOUSING AC MPWLC - FIRE.pdf",
      policyType: "FLEXI PROPERTY PROTECTOR",
      policyNumber: "12A97009",
      insuredName: "HSV WAREHOUSING A/C MPWLC",
      district: "",
      tehsil: "BABAI",
      netPremium: "41999.47",
      premiumIncludingGst: "49559.00",
      sumInsured: "120000000.00",
      hypothecation: "MPWLC",
      startDate: "02/06/2026",
      expiryDate: "01/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/HSV WAREHOUSING AC MPWLC- FIDELITY.pdf",
      policyType: "Fidelity Guarantee",
      policyNumber: "41116120",
      insuredName: "HSV WAREHOUSING A/C MPWLC",
      district: "",
      tehsil: "",
      netPremium: "770.07",
      premiumIncludingGst: "908.69",
      sumInsured: "12000000.00",
      hypothecation: "MPWLC",
      startDate: "02/06/2026",
      expiryDate: "01/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/KISHAN WAREHOUSE UNIT TARAIYA NO. 2O2 CO MPWLC- FIDELITY.pdf",
      policyType: "Fidelity Guarantee",
      policyNumber: "41116078",
      insuredName: "KISHAN WAREHOUSE UNIT TARAIYA NO. 2/O/2 C/O MPWLC",
      district: "DATIA",
      tehsil: "",
      netPremium: "650.00",
      premiumIncludingGst: "767.00",
      sumInsured: "12000000.00",
      hypothecation: "MPWLC",
      startDate: "01/06/2026",
      expiryDate: "31/05/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/KISHAN WAREHOUSE UNIT TARAIYA NO.2 0 2 CO MPWLC -FIRE POLICY.pdf",
      policyType: "FLEXI PROPERTY PROTECTOR",
      policyNumber: "12A97008",
      insuredName: "KISHAN WAREHOUSE UNIT TARAIYA NO. 2/O/2 C/O MPWLC",
      district: "DATIA",
      tehsil: "",
      netPremium: "44687.96",
      premiumIncludingGst: "52732.00",
      sumInsured: "120000000.00",
      hypothecation: "MPWLC IN CARE OF MADHYA PRADESH WAREHOUSING AND",
      startDate: "01/06/2026",
      expiryDate: "31/05/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/NANDKISHOR LOGISTIC WAREHOUSE - FIDELITY POLICY.pdf",
      policyType: "Fidelity Guarantee",
      policyNumber: "41116174",
      insuredName: "NANDKISHOR LOGISTIC WAREHOUSE A/C MPWLC",
      district: "NARMADAPURAM",
      tehsil: "MAKHAN NAGAR",
      netPremium: "343.02",
      premiumIncludingGst: "404.76",
      sumInsured: "9750000.00",
      hypothecation: "MPWLC",
      startDate: "04/06/2026",
      expiryDate: "03/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/NANDKISHOR LOGISTIC WAREHOUSE AC MPWLC - FIRE POLICY.pdf",
      policyType: "FLEXI PROPERTY PROTECTOR",
      policyNumber: "12A97741",
      insuredName: "NANDKISHOR LOGISTIC WAREHOUSE A/C MPWLC",
      district: "NARMADAPURAM",
      tehsil: "MAKHAN NAGAR",
      netPremium: "34124.57",
      premiumIncludingGst: "40267.00",
      sumInsured: "97500000.00",
      hypothecation: "MPWLC",
      startDate: "04/06/2026",
      expiryDate: "03/06/2027",
    },
    {
      file: "tests/Warehouse/IFFCO/NANDKISHOR LOGISTIC WAREHOUSE AC MPWLC-BURGLARY.pdf",
      policyType: "BURGLARY AND HOUSE BREAKING INSURANCE",
      policyNumber: "44541975",
      insuredName: "NANDKISHOR LOGISTIC WAREHOUSE A/C MPWLC",
      district: "NARMADAPURAM",
      tehsil: "MAKHAN NAGAR",
      netPremium: "268.13",
      premiumIncludingGst: "316.00",
      sumInsured: "97500000.00",
      hypothecation: "MPWLC",
      startDate: "04/06/2026",
      expiryDate: "03/06/2027",
    },
  ];

  testCases.forEach((tc) => {
    it(`correctly extracts data from ${tc.file}`, async () => {
      const parsed = await pdf(fs.readFileSync(tc.file));
      const result = extractPolicyFromText(parsed.text, tc.file);

      expect(result.documentFormat).toBe("IFFCO_TOKIO_WAREHOUSE_V1");
      expect(result.sourceDocumentType).toBe("IFFCO_TOKIO_WAREHOUSE_V1");
      expect(result.insuranceCompany).toBe("IFFCO Tokio General Insurance Company Limited");
      expect(result.policyType).toBe(tc.policyType);
      expect(result.policyNumber).toBe(tc.policyNumber);
      expect(result.insuredName).toBe(tc.insuredName);
      expect(result.district).toBe(tc.district);
      expect(result.tehsil).toBe(tc.tehsil);
      expect(result.netPremium).toBe(tc.netPremium);
      expect(result.premiumIncludingGst).toBe(tc.premiumIncludingGst);
      expect(result.sumInsured).toBe(tc.sumInsured);
      expect(result.hypothecationDetails).toBe(tc.hypothecation);
      expect(result.startDate).toBe(tc.startDate);
      expect(result.expiryDate).toBe(tc.expiryDate);
    });
  });

  it("adds IFFCO warehouse training fields for fire policies", async () => {
    const file = "tests/Warehouse/IFFCO/DERIYA WAREHOUSING AND LOGISTICS  FIRE POLICY.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text, file);

    expect(result.policySubType).toBe("WAREHOUSE_FIRE_POLICY");
    expect(result.warehousePolicySubType).toBe("WAREHOUSE_FIRE_POLICY");
    expect(result.warehouseProfileName).toBe("DERIYA WAREHOUSING AND LOGISTICS");
    expect(result.warehouseFinanced).toBe(true);
    expect(result.mpwlcReference).toBe("MPWLC");
    expect(result.stockSumInsured).toBe("62000000.00");
    expect(result.goodsStored).toContain("Rice");
    expect(result.riskEntity).toMatchObject({
      storageType: "Food Grain Storage",
      hazardCategory: "Non-Hazardous Goods",
      warehouseType: "Warehouse",
    });
    expect(result.coverageDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ coverage: "Fire and Allied Perils", status: "Covered", sumInsured: "62000000.00" }),
        expect.objectContaining({ coverage: "Earthquake", status: "Covered" }),
      ]),
    );
    expect(result.iffcoFieldConfidence.sumInsured).toBeGreaterThanOrEqual(0.9);
    expect(result.iffcoFieldEvidence.policyNumber).toContain("12A97642");
    expect(result.needsManualReview).toBe(false);
    expect(result.extractionTrainingVersion).toBe("IFFCO_TOKIO_WAREHOUSE_TRAINING_V1");
  });

  it("adds IFFCO warehouse training fields for burglary policies", async () => {
    const file = "tests/Warehouse/IFFCO/DERIYA WAREHOUSING AND LOGISTICS BURGLARY POLICY.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text, file);

    expect(result.policySubType).toBe("WAREHOUSE_BURGLARY_POLICY");
    expect(result.coverageDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ coverage: "Theft", status: "Covered", sumInsured: "62000000.00" }),
        expect.objectContaining({ coverage: "RSMD", status: "Covered", sumInsured: "62000000.00" }),
      ]),
    );
    expect(result.warehouseProfile.policyNumber).toBe("44541964");
    expect(result.premiumEntity).toMatchObject({
      netPremium: "170.50",
      totalPremium: "201.00",
    });
  });

  it("adds IFFCO warehouse training fields for fidelity policies", async () => {
    const file = "tests/Warehouse/IFFCO/DERIYA WAREHOUSING AND LOGISTICS - FIDELITY POLICY.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text, file);

    expect(result.policySubType).toBe("WAREHOUSE_FIDELITY_POLICY");
    expect(result.coverageDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ coverage: "Unnamed Employee", status: "Covered", sumInsured: "6200000.00" }),
        expect.objectContaining({ coverage: "Limit of Guarantee", status: "Covered", sumInsured: "6200000.00" }),
      ]),
    );
    expect(result.warehouseProfile).toMatchObject({
      warehouseName: "DERIYA WAREHOUSING AND LOGISTICS",
      policySubType: "WAREHOUSE_FIDELITY_POLICY",
      warehouseFinanced: true,
    });
  });
});
