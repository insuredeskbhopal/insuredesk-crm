/* @vitest-environment node */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
const {
  deriveTrainingScope,
  selectScopedTraining,
} = require("../src/lib/policies/pdf/training/registry.cjs");
const healthTrainer = require("../src/lib/policies/pdf/training/hdfc-ergo/health.cjs");

const healthText = `
HDFC ERGO General Insurance Company Limited
Policy Schedule
my:Optima Secure
UIN: HDFHLIP26058V082526
Dear Mr Gaurav Singh,
This is to certify that we have received an amount of \`34543 towards premium.
Insured Person’s Premium Details
Name of Insured PersonRelation with policy holder
GenderDate of Birth Premium Total Premium
Gaurav SinghSelfMale03/11/19801773117731
Rashi Raje SinghSpouseFemale13/03/198673967396
Riddhiman Singh GahlotSonMale17/10/201347814781
Ranshdheer Singh GahlotSonMale30/11/201546354635
Note:
Policy Number: 2856 2066 3940 9802 000Issuance Date: 14/07/2026
Period of Insurance: From 27/07/2026 00:00 hrs To 26/07/2027 Midnight
Invoice No.: 3822607347805Premium Frequency: SINGLE
Policyholder Name: Mr Gaurav SinghPolicy Type: Family Floater
Previous Policy : 2856206639409801
Customer Id Renewal : YES
Email ID : gsxxxvy@gxxxx.com
Mr Gaurav Singh
CRD-II/6 PANDARA PARK, SOUTH DELHI, DELHI-110003
Contact No : 98XXXXXXX6
Intermediary NameIntermediary CodeIntermediary Contact Number
INSUREDESK IMF PRIVATE LIMITED2004272079678827731100
Insured Person’s Details and Sum Insured - Optima Secure
Gaurav SinghSelfMale03/11/1980Rashi Raje SinghWife23/07/20142000000250001000000YesNo
Rashi Raje SinghSpouseFemale13/03/1986--23/07/2014YesNo
Riddhiman Singh GahlotSonMale17/10/2013--27/07/2018YesNo
Ranshdheer Singh GahlotSonMale30/11/2015--27/07/2018YesNo
The nominee must be an immediate relative of the policyholder.
Sum Insured opted:2000000
Branch :HDFC ERGO General Insurance Co. Ltd., Stellar IT Park, Noida
`;

describe("HDFC ERGO Optima Secure Health training", () => {
  it("routes the exact HDFC Optima Secure document to an isolated Health format", () => {
    const result = extractPolicyFromText(healthText, "hdfc-optima-secure-health.pdf");

    expect(result).toMatchObject({
      insuranceCompany: "HDFC ERGO General Insurance Company Limited",
      documentCategory: "Health Insurance",
      documentFormat: "HDFC_ERGO_HEALTH_OPTIMA_SECURE_V1",
      sourceDocumentType: "HDFC_ERGO_HEALTH_OPTIMA_SECURE_V1",
      productName: "Optima Secure",
      productUin: "HDFHLIP26058V082526",
      policyNumber: "2856206639409802000",
      policyType: "Family Floater",
      newOrRenewal: "Renewal",
      policyTenure: "1 Year",
      startDate: "27/07/2026",
      expiryDate: "26/07/2027",
      sumInsured: "20,00,000.00",
      basicPremium: "34,543.00",
      totalPremium: "34,543.00",
      previousPolicyNumber: "2856206639409801",
      nomineeName: "Rashi Raje Singh",
      nomineeRelationship: "Wife",
      agentName: "INSUREDESK IMF PRIVATE LIMITED",
      agentCode: "200427207967",
      agentMobile: "8827731100",
      numberOfInsuredMembers: 4,
      vehicleNumber: "",
      engineNumber: "",
      chassisNumber: "",
    });
    expect(result.insuredMembers).toEqual([
      {
        name: "Gaurav Singh",
        relationship: "Self",
        gender: "Male",
        dateOfBirth: "03/11/1980",
        age: "45",
        abhaId: "",
        preExistingDiseases: "",
        firstPolicyInceptionDate: "23/07/2014",
        specificConditions: "",
      },
      {
        name: "Rashi Raje Singh",
        relationship: "Spouse",
        gender: "Female",
        dateOfBirth: "13/03/1986",
        age: "40",
        abhaId: "",
        preExistingDiseases: "",
        firstPolicyInceptionDate: "23/07/2014",
        specificConditions: "",
      },
      {
        name: "Riddhiman Singh Gahlot",
        relationship: "Son",
        gender: "Male",
        dateOfBirth: "17/10/2013",
        age: "12",
        abhaId: "",
        preExistingDiseases: "",
        firstPolicyInceptionDate: "27/07/2018",
        specificConditions: "",
      },
      {
        name: "Ranshdheer Singh Gahlot",
        relationship: "Son",
        gender: "Male",
        dateOfBirth: "30/11/2015",
        age: "10",
        abhaId: "",
        preExistingDiseases: "",
        firstPolicyInceptionDate: "27/07/2018",
        specificConditions: "",
      },
    ]);
  });

  it("corrects a false HDFC Motor classification only for the Optima Secure Health signature", () => {
    const falseMotorResult = {
      insuranceCompany: "HDFC ERGO General Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "HDFC_ERGO_MOTOR_V1",
    };

    expect(deriveTrainingScope(falseMotorResult, { text: healthText })).toEqual({
      insurer: "hdfc-ergo",
      category: "health",
    });
    expect(selectScopedTraining(falseMotorResult, { text: healthText })).toEqual([healthTrainer]);
  });

  it("does not select HDFC Health training for HDFC Motor/Warehouse or another insurer", () => {
    const hdfcMotor = {
      insuranceCompany: "HDFC ERGO General Insurance Company Limited",
      documentCategory: "Motor Insurance",
    };
    const hdfcWarehouse = { ...hdfcMotor, documentCategory: "Warehouse Insurance" };
    const iciciHealth = {
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Health Insurance",
    };

    expect(
      selectScopedTraining(hdfcMotor, {
        text: "HDFC ERGO PRIVATE CAR COMPREHENSIVE POLICY Total IDV CSC Name",
      }),
    ).toHaveLength(0);
    expect(
      selectScopedTraining(hdfcWarehouse, {
        text: "HDFC ERGO warehouse fire policy stock and contents",
      }),
    ).toHaveLength(0);
    expect(selectScopedTraining(iciciHealth, { text: healthText })).toHaveLength(0);
  });

  it("keeps insurer and category identity outside the scoped training patch", () => {
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
