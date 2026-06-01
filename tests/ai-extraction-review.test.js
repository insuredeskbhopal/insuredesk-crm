import { describe, expect, it } from "vitest";
import {
  getExtractionAuthenticityIssues,
  mergeAiExtractionPatch,
  reviewPolicyExtractionWithAi
} from "../lib/ai-extraction-review";
import { extractCompanyEvidence, hasCompanyEvidence } from "../lib/company-detector";

describe("AI extraction review guardrails", () => {
  it("flags corrupted motor vehicle fields before AI review", () => {
    const issues = getExtractionAuthenticityIssues({
      insuranceCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
      policyNumber: "N7415324",
      registrationNumber: "MP04ZJ1165",
      engineNumber: "MP04ZJ11652023XUV700",
      chassisNumber: "Seating",
      fuelType: "CNG"
    });

    expect(issues).toContain("engineNumber appears to contain registrationNumber");
    expect(issues).toContain("chassisNumber is a label, not a value");
    expect(issues).toContain("startDate missing");
    expect(issues).toContain("expiryDate missing");
  });

  it("accepts AI fields only when source evidence exists and current values are missing or weak", () => {
    const rawText = `
      IFFCO-TOKIO GENERAL INSURANCE CO.LTD
      PRIVATE CAR PACKAGE POLICY
      Policy No. 1234567890
      Insured Name: SHRIDHAR RENEWABLE ENERGY PRIVATE LIMITED
      Policy effective from 0001 hrs 21/05/2026
      To MidNight 20/05/2027
      Registration Mark and No. MP04ZJ1165
      Engine No. ZTP4D64994
      Chassis No. MA1NE2ZTFP6E12261
      XUV700 AX7 D AT LUXURY PACK
      Cubic Capacity 2184 Seating Capacity 7
      IDV 1723680.00 Total Premium 33681.92 Net Premium 28544.00
      Own Damage Premium 4321.00 TP Driver Owner 7947.00
    `;

    const merge = mergeAiExtractionPatch({
      rawText,
      extractedData: {
        insuranceCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
        registrationNumber: "MP04ZJ1165",
        engineNumber: "MP04ZJ11652023XUV700",
        chassisNumber: "Seating",
        fuelType: "CNG"
      },
      aiPatch: {
        correctedFields: {
          startDate: {
            value: "21/05/2026",
            sourceText: "Policy effective from 0001 hrs 21/05/2026",
            reason: "missing"
          },
          expiryDate: {
            value: "20/05/2027",
            sourceText: "To MidNight 20/05/2027",
            reason: "missing"
          },
          engineNumber: {
            value: "ZTP4D64994",
            sourceText: "Engine No. ZTP4D64994",
            reason: "extractor included registration/model text"
          },
          chassisNumber: {
            value: "MA1NE2ZTFP6E12261",
            sourceText: "Chassis No. MA1NE2ZTFP6E12261",
            reason: "extractor captured a label"
          },
          fuelType: {
            value: "Diesel",
            sourceText: "XUV700 AX7 D AT LUXURY PACK",
            reason: "extractor value was not supported by source text"
          },
          policyType: {
            value: "PRIVATE CAR PACKAGE POLICY",
            sourceText: "PRIVATE CAR PACKAGE POLICY",
            reason: "missing"
          },
          insuredName: {
            value: "SHRIDHAR RENEWABLE ENERGY PRIVATE LIMITED",
            sourceText: "Insured Name: SHRIDHAR RENEWABLE ENERGY PRIVATE LIMITED",
            reason: "missing"
          },
          makeModel: {
            value: "XUV700 AX7 D AT LUXURY PACK",
            sourceText: "XUV700 AX7 D AT LUXURY PACK",
            reason: "missing"
          },
          cubicCapacity: {
            value: "2184",
            sourceText: "Cubic Capacity 2184 Seating Capacity 7",
            reason: "missing"
          },
          seatingCapacity: {
            value: "7",
            sourceText: "Cubic Capacity 2184 Seating Capacity 7",
            reason: "missing"
          },
          idv: {
            value: "1723680.00",
            sourceText: "IDV 1723680.00 Total Premium 33681.92 Net Premium 28544.00",
            reason: "missing"
          },
          totalPremium: {
            value: "33681.92",
            sourceText: "IDV 1723680.00 Total Premium 33681.92 Net Premium 28544.00",
            reason: "missing"
          },
          netPremium: {
            value: "28544.00",
            sourceText: "IDV 1723680.00 Total Premium 33681.92 Net Premium 28544.00",
            reason: "missing"
          },
          odPremium: {
            value: "4321.00",
            sourceText: "Own Damage Premium 4321.00 TP Driver Owner 7947.00",
            reason: "missing"
          },
          tpDriverOwner: {
            value: "7947.00",
            sourceText: "Own Damage Premium 4321.00 TP Driver Owner 7947.00",
            reason: "missing"
          },
          policyNumber: {
            value: "NOT-IN-SOURCE",
            sourceText: "Policy No. 1234567890",
            reason: "missing"
          }
        },
        unchangedFields: {
          registrationNumber: {
            value: "MP04ZJ1165",
            reason: "extractor value matched PDF evidence"
          }
        },
        unresolvedFields: {
          premium: {
            reason: "value not found in PDF text"
          }
        }
      }
    });

    expect(merge.data.engineNumber).toBe("ZTP4D64994");
    expect(merge.data.chassisNumber).toBe("MA1NE2ZTFP6E12261");
    expect(merge.data.startDate).toBe("21/05/2026");
    expect(merge.data.expiryDate).toBe("20/05/2027");
    expect(merge.data.fuelType).toBe("Diesel");
    expect(merge.data.policyType).toBe("PRIVATE CAR PACKAGE POLICY");
    expect(merge.data.insuredName).toBe("SHRIDHAR RENEWABLE ENERGY PRIVATE LIMITED");
    expect(merge.data.makeModel).toBe("XUV700 AX7 D AT LUXURY PACK");
    expect(merge.data.cubicCapacity).toBe("2184");
    expect(merge.data.seatingCapacity).toBe("7");
    expect(merge.data.idv).toBe("1723680.00");
    expect(merge.data.totalPremium).toBe("33681.92");
    expect(merge.data.netPremium).toBe("28544.00");
    expect(merge.data.odPremium).toBe("4321.00");
    expect(merge.data.tpDriverOwner).toBe("7947.00");
    expect(merge.data.policyNumber).toBeUndefined();
    expect(merge.acceptedFields).toEqual([
      "policyType",
      "insuredName",
      "startDate",
      "expiryDate",
      "makeModel",
      "engineNumber",
      "chassisNumber",
      "fuelType",
      "cubicCapacity",
      "seatingCapacity",
      "idv",
      "totalPremium",
      "netPremium",
      "odPremium",
      "tpDriverOwner"
    ]);
    expect(merge.rejectedFields).toContain("policyNumber");
  });

  it("does not overwrite existing source-backed values with AI alternatives", () => {
    const rawText = `
      Policy No. REAL12345
      Engine No. GOODENGINE99
      Chassis No. MA1NE2ZTFP6E12261
    `;

    const merge = mergeAiExtractionPatch({
      rawText,
      extractedData: {
        policyNumber: "REAL12345",
        engineNumber: "GOODENGINE99",
        chassisNumber: "MA1NE2ZTFP6E12261"
      },
      aiPatch: {
        correctedFields: {
          policyNumber: {
            value: "REAL12345",
            sourceText: "Policy No. REAL12345",
            reason: "same value"
          },
          engineNumber: {
            value: "GOODENGINE99",
            sourceText: "Engine No. GOODENGINE99",
            reason: "same value"
          },
          chassisNumber: {
            value: "MA1NE2ZTFP6E12261",
            sourceText: "Chassis No. MA1NE2ZTFP6E12261",
            reason: "same value"
          }
        }
      }
    });

    expect(merge.data.policyNumber).toBe("REAL12345");
    expect(merge.data.engineNumber).toBe("GOODENGINE99");
    expect(merge.data.chassisNumber).toBe("MA1NE2ZTFP6E12261");
    expect(merge.acceptedFields).toEqual([]);
    expect(merge.rejectedFields).toEqual(["policyNumber", "engineNumber", "chassisNumber"]);
  });

  it("rejects AI corrections without an exact sourceText snippet from the PDF", () => {
    const merge = mergeAiExtractionPatch({
      rawText: "Engine No. ZTP4D64994",
      extractedData: {},
      aiPatch: {
        correctedFields: {
          engineNumber: {
            value: "ZTP4D64994",
            sourceText: "Engine Number: ZTP4D64994",
            reason: "missing"
          }
        }
      }
    });

    expect(merge.data.engineNumber).toBeUndefined();
    expect(merge.acceptedFields).toEqual([]);
    expect(merge.rejectedFields).toEqual(["engineNumber"]);
  });

  it("clears unsupported extracted values when AI is unavailable", async () => {
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    const previousKey = process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;

    let review;
    try {
      review = await reviewPolicyExtractionWithAi({
        rawText: "Policy No. REAL12345\nEngine No. ZTP4D64994",
        extractedData: {
          policyNumber: "REAL12345",
          engineNumber: "WRONGENGINE",
          chassisNumber: "Seating"
        }
      });
    } finally {
      if (previousOpenAiKey) process.env.OPENAI_API_KEY = previousOpenAiKey;
      if (previousKey) process.env.GROQ_API_KEY = previousKey;
    }

    expect(review.data.policyNumber).toBe("REAL12345");
    expect(review.data.engineNumber).toBe("");
    expect(review.data.chassisNumber).toBe("");
    expect(review.aiReview.used).toBe(false);
    expect(review.aiReview.clearedFields).toEqual(["engineNumber", "chassisNumber"]);
  });

  it("validates insurance company through generic PDF company evidence", () => {
    const rawText = `
      ACME SHIELD
      GENERAL INSURANCE COMPANY LIMITED
      Private Car Package Policy
    `;

    expect(extractCompanyEvidence(rawText)).toContain("ACME SHIELD GENERAL INSURANCE COMPANY LIMITED");
    expect(hasCompanyEvidence("ACME SHIELD GENERAL INSURANCE COMPANY LIMITED", rawText)).toBe(true);
    expect(hasCompanyEvidence("UNSEEN GENERAL INSURANCE COMPANY LIMITED", rawText)).toBe(false);
  });
});
