import { describe, expect, it } from "vitest";
import { getExtractionAuthenticityIssues, mergeAiExtractionPatch } from "../lib/ai-extraction-review";

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
  });

  it("accepts AI fields only when source evidence exists and current values are weak", () => {
    const rawText = `
      Registration Mark and No. MP04ZJ1165
      Engine No. ZTP4D64994
      Chassis No. MA1NE2ZTFP6E12261
      XUV700 AX7 D AT LUXURY PACK
    `;

    const merge = mergeAiExtractionPatch({
      rawText,
      extractedData: {
        registrationNumber: "MP04ZJ1165",
        engineNumber: "MP04ZJ11652023XUV700",
        chassisNumber: "Seating",
        fuelType: "CNG"
      },
      aiPatch: {
        fields: {
          engineNumber: "ZTP4D64994",
          chassisNumber: "MA1NE2ZTFP6E12261",
          fuelType: "Diesel",
          policyNumber: "NOT-IN-SOURCE"
        }
      }
    });

    expect(merge.data.engineNumber).toBe("ZTP4D64994");
    expect(merge.data.chassisNumber).toBe("MA1NE2ZTFP6E12261");
    expect(merge.data.fuelType).toBe("CNG");
    expect(merge.data.policyNumber).toBeUndefined();
    expect(merge.acceptedFields).toEqual(["engineNumber", "chassisNumber"]);
    expect(merge.rejectedFields).toContain("fuelType");
    expect(merge.rejectedFields).toContain("policyNumber");
  });
});
