/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  FIELD_SETUP,
  FIELD_GROUPS,
  POLICY_SCHEMA_LIBRARY,
  getReviewValidation,
  inferUploadSchema,
} from "../src/app/lib/dashboard-helpers";
import { DEFAULT_POLICY_TYPES } from "../src/lib/policies/defaults";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const {
  deriveTrainingScope,
  selectScopedTraining,
} = require("../src/lib/policies/pdf/training/registry.cjs");
const healthTrainer = require("../src/lib/policies/pdf/training/icici-lombard/health.cjs");
const { resolveSchema } = require("../src/lib/policies/intelligence/schemaEngine.js");
const { classifyDocument } = require("../src/lib/policies/understanding/classifyDocument.js");

const healthText = `
ICICI Lombard General Insurance Company Limited
Policy Certificate
UIN: ICIHLIP26054V052526
Policyholder Details
Proposer
Name
Arun SampleEmail IDar********@example.com
Mobile
Number
98******10Invoice Number300626000000001
Address12 SAMPLE ROAD, BHOPAL, MADHYA PRADESH - 462001
Policy Details
Product NameELEVATE
Policy Number100012100001
Policy Start Date & TimeJuly 30, 2026, 00:00 hrsPolicy End Date & TimeJuly 29, 2027, 23:59 hrs
Policy Tenure1 YearPolicy TypeFLOATER
ZoneZone BPremium Payment FrequencySingle
Premium Payment ModeNON EMILAN Number
Premium Details
Basic Premium (₹)Total Tax Payable (₹)Stamp Duty (₹)Total Premium (₹)
24,612.830.001.0024,614.00
Nominee Details
Nominee NameRelationship with PolicyholderDate of BirthAppointee Name
MEERA SAMPLESpouseOctober 29 1988
Insured Details
Insured NameArun SampleMeera SampleAsha Sample
Date of BirthApril 28, 1989October 29, 1988November 01, 2021
Age37374
GenderMaleFemaleFemale
ABHA ID
Relationship with PolicyholderSelfSpouseDaughter
Pre-Existing Diseases
First Policy Inception Date ILJuly 30, 2025July 30, 2025July 30, 2025
Previous Policy Number100012100000
Sum Insured (₹)**10,00,000
Loyalty Bonus (₹)2,00,000
Power Booster (₹)10,00,000
Specific ConditionsNot ApplicableNot ApplicableNot Applicable
*Your Sum Insured value will be revised at renewal.
Branch Details
Policy Issuance Office LocationAddress
Prabhadevi
ICICI LOMBARD HOUSE, MUMBAI, 400025, MAHARASHTRA
Policy Servicing Office LocationAddress
Bhopal
5th Floor, Sample Building, Bhopal 462026, Madhya Pradesh
Agent Details
Agent NameINSUREDESK IMF PRIVATE LIMITED
Agent CodeIMF240706Mobile Number 8818889660
Table of Benefits
`;

describe("ICICI Lombard Elevate Health training", () => {
  it("recognizes the exact ICICI Elevate document before extraction", () => {
    const classification = classifyDocument(healthText);

    expect(classification).toMatchObject({
      company: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Health Insurance",
      documentFormat: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
      policyType: "Elevate",
      confidence: 1,
    });
  });

  it("resolves a dedicated Health schema without Motor or Warehouse fields", () => {
    const schema = resolveSchema(classifyDocument(healthText));
    const fields = schema.fields.map((field) => field.field);

    expect(schema.fileName).toBe("icici_health.json");
    expect(fields).toEqual(
      expect.arrayContaining([
        "proposerName",
        "customerName",
        "contactNumber",
        "email",
        "insuredMembers",
        "numberOfInsuredMembers",
        "sumInsured",
        "nomineeName",
        "loyaltyBonus",
        "powerBooster",
        "totalPremium",
        "gstAmount",
        "remark",
      ]),
    );
    expect(fields).not.toEqual(
      expect.arrayContaining(["vehicleNumber", "engineNumber", "chassisNumber", "riskLocation"]),
    );
    expect(fields).not.toEqual(expect.arrayContaining(["businessType", "issueDate"]));
  });

  it("provides the custom Health fields in both default and dashboard field setup", () => {
    const defaultType = DEFAULT_POLICY_TYPES.find(
      (type) =>
        type.company === "ICICI Lombard" && type.category === "Health Insurance" && type.name === "Elevate",
    );
    const dashboardType = POLICY_SCHEMA_LIBRARY.find((group) => group.id === "health")?.policies.find(
      (policy) => policy.id === "health-icici-elevate",
    );
    const registeredDashboardFields = new Set(FIELD_SETUP.map(([, key]) => key));

    expect(defaultType?.fields.map((field) => field.key)).toEqual(
      expect.arrayContaining([
        "productUin",
        "customerName",
        "contactNumber",
        "email",
        "insuredMembers",
        "numberOfInsuredMembers",
        "nomineeRelationship",
        "loyaltyBonus",
        "powerBooster",
        "agentCode",
        "gstAmount",
        "remark",
      ]),
    );
    expect(dashboardType?.fields).toHaveLength(40);
    expect(dashboardType?.fields.every((field) => registeredDashboardFields.has(field))).toBe(true);
    const groupedFields = new Set(FIELD_GROUPS.flatMap((group) => group.fields));
    const hiddenReviewFields = [
      "customerName",
      "proposerName",
      "email",
      "productName",
      "productUin",
      "zone",
      "premiumPaymentFrequency",
      "premiumPaymentMode",
      "policyholderEmailMasked",
      "policyholderMobileMasked",
      "invoiceNumber",
      "servicingBranchName",
      "servicingBranchAddress",
      "agentName",
      "agentCode",
      "agentMobile",
      "appointeeName",
      "loyaltyBonus",
      "powerBooster",
    ];
    expect(
      dashboardType?.fields
        .filter((field) => !hiddenReviewFields.includes(field))
        .every((field) => groupedFields.has(field)),
    ).toBe(true);
    expect(hiddenReviewFields.every((field) => !groupedFields.has(field))).toBe(true);
    expect(FIELD_GROUPS.some((group) => group.title === "Service & Agent")).toBe(false);
  });

  it("keeps the explicit Health schema when noisy PDF text creates false vehicle values", () => {
    const upload = {
      sourceFile: "Apurv Gour- health policy- 26-27.pdf",
      extractedData: {
        documentCategory: "Health Insurance",
        documentFormat: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
        insuranceCompany: "ICICI Lombard General Insurance Company Limited",
        policyType: "FLOATER",
        vehicleNumber: "DT09MAY2027",
        registrationNumber: "DT09MAY2027",
        engineNumber: "false-positive-engine",
        chassisNumber: "false-positive-chassis",
      },
    };

    expect(inferUploadSchema(upload)).toMatchObject({
      groupId: "health",
      policyId: "health-icici-elevate",
      policyName: "ICICI Lombard Elevate",
    });
    const validation = getReviewValidation(upload);
    const visibleKeys = validation.visibleFields.map(([, key]) => key);
    expect(visibleKeys).toEqual(expect.arrayContaining(["insuredMembers", "sumInsured", "nomineeName"]));
    expect(visibleKeys).not.toEqual(
      expect.arrayContaining(["vehicleNumber", "engineNumber", "chassisNumber", "idv"]),
    );
    expect(validation.missingRequired).not.toEqual(
      expect.arrayContaining(["Engine Number", "Chassis Number", "IDV"]),
    );
  });

  it("does not recognize ICICI Warehouse, ICICI Motor, or another insurer as ICICI Health", () => {
    const warehouse = classifyDocument(`
      ICICI Lombard
      MSME Suraksha Kavach
      Premises to be Insured
      Section wise details
    `);
    const motor = classifyDocument(`
      ICICI Lombard
      PRIVATE CAR PACKAGE POLICY
      Registration Number MP04AB1234
      Chassis Number SAMPLE123
      Engine Number ENGINE123
    `);
    const otherInsurerHealth = classifyDocument(
      healthText.replace(/ICICI\s+LOMBARD(?:\s+General Insurance Company Limited)?/gi, "Tata AIG"),
    );

    expect(warehouse.documentCategory).toBe("Warehouse Insurance");
    expect(warehouse.documentFormat).toBe("ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1");
    expect(motor.documentFormat).not.toBe("ICICI_LOMBARD_HEALTH_ELEVATE_V1");
    expect(otherInsurerHealth.documentFormat).not.toBe("ICICI_LOMBARD_HEALTH_ELEVATE_V1");
  });

  it("extracts the scoped Health certificate without using a Motor or Warehouse trainer", () => {
    const result = extractPolicyFromText(healthText, "sample-health-policy.pdf");

    expect(result).toMatchObject({
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Health Insurance",
      documentFormat: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
      sourceDocumentType: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
      extractionTrainingVersion: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
      productName: "ELEVATE",
      policyNumber: "100012100001",
      policyType: "FLOATER",
      policyTenure: "1 Year",
      startDate: "30/07/2026",
      expiryDate: "29/07/2027",
      proposerName: "Arun Sample",
      customerName: "Arun Sample",
      insuredName: "Arun Sample",
      sumInsured: "10,00,000.00",
      basicPremium: "24,612.83",
      netPremium: "24,612.83",
      taxAmount: "0.00",
      stampDuty: "1.00",
      totalPremium: "24,614.00",
      nomineeName: "MEERA SAMPLE",
      nomineeRelationship: "Spouse",
      previousPolicyNumber: "100012100000",
      numberOfInsuredMembers: 3,
      agentName: "INSUREDESK IMF PRIVATE LIMITED",
      agentCode: "IMF240706",
      agentMobile: "8818889660",
      servicingBranchName: "Bhopal",
      productUin: "ICIHLIP26054V052526",
    });
    expect(result.insuredMembers).toEqual([
      {
        name: "Arun Sample",
        dateOfBirth: "28/04/1989",
        age: "37",
        gender: "Male",
        abhaId: "",
        relationship: "Self",
        preExistingDiseases: "",
        firstPolicyInceptionDate: "30/07/2025",
        specificConditions: "Not Applicable",
      },
      {
        name: "Meera Sample",
        dateOfBirth: "29/10/1988",
        age: "37",
        gender: "Female",
        abhaId: "",
        relationship: "Spouse",
        preExistingDiseases: "",
        firstPolicyInceptionDate: "30/07/2025",
        specificConditions: "Not Applicable",
      },
      {
        name: "Asha Sample",
        dateOfBirth: "01/11/2021",
        age: "4",
        gender: "Female",
        abhaId: "",
        relationship: "Daughter",
        preExistingDiseases: "",
        firstPolicyInceptionDate: "30/07/2025",
        specificConditions: "Not Applicable",
      },
    ]);
    expect(result.contactNumber).toBeFalsy();
    expect(result.email).toBeFalsy();
    expect(result.policyholderMobileMasked).toContain("******");
    expect(result.policyholderEmailMasked).toContain("********");
  });

  it("selects the Health scope from the exact ICICI Elevate/UIN signature", () => {
    const initiallyMisclassified = {
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Motor Insurance",
    };

    expect(deriveTrainingScope(initiallyMisclassified, { text: healthText })).toEqual({
      insurer: "icici-lombard",
      category: "health",
    });
    expect(selectScopedTraining(initiallyMisclassified, { text: healthText })).toEqual([healthTrainer]);
  });

  it("does not select Health training for ICICI Motor or Warehouse documents", () => {
    const iciciMotor = {
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Motor Insurance",
    };
    const iciciWarehouse = {
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Warehouse Insurance",
    };

    expect(
      selectScopedTraining(iciciMotor, {
        text: "ICICI Lombard PRIVATE CAR PACKAGE POLICY vehicle chassis engine registration",
      }),
    ).toHaveLength(0);
    expect(
      selectScopedTraining(iciciWarehouse, {
        text: "ICICI Lombard MSME Suraksha Kavach warehouse stock fire burglary",
      }),
    ).toHaveLength(0);
  });

  it("does not select ICICI Health training for another insurer's Health document", () => {
    const tataHealth = {
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      documentCategory: "Health Insurance",
    };

    expect(selectScopedTraining(tataHealth, { text: healthText })).toHaveLength(0);
  });

  it("keeps scope identity out of the training module patch", () => {
    const patch = healthTrainer.train({ text: healthText, result: {} });

    for (const field of [
      "insuranceCompany",
      "companyName",
      "documentCategory",
      "documentFormat",
      "sourceDocumentType",
    ]) {
      expect(patch).not.toHaveProperty(field);
    }
  });
});
