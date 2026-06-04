import { describe, expect, it } from "vitest";
import { buildAiMergePreview } from "../lib/policies/ai/merge-preview";

describe("AI merge preview", () => {
  it("blocks AI update when the current rule value is valid", () => {
    const preview = buildAiMergePreview({
      sourceText: "Policy No. N7470840\nPolicy No. N747084",
      currentData: {
        policyNumber: "N7470840"
      },
      validation: {
        status: "passed",
        fieldIssues: [],
        crossFieldIssues: []
      },
      aiReview: {
        suggestedCorrections: {
          policyNumber: {
            value: "N747084",
            evidenceText: "Policy No. N747084",
            reason: "AI suggested a shorter policy number"
          }
        }
      }
    });

    expect(preview.eligibleUpdates).toEqual({});
    expect(preview.blockedUpdates.policyNumber).toMatchObject({
      currentValue: "N7470840",
      suggestedValue: "N747084",
      reason: "Current rule value is valid and should not be overwritten"
    });
  });

  it("allows blank field update when exact source evidence exists", () => {
    const preview = buildAiMergePreview({
      sourceText: "Chassis No: MA1NE2ZTFP6E12261",
      currentData: {
        chassisNumber: "",
        engineNumber: "ZTP4D64994"
      },
      validation: {
        status: "passed",
        fieldIssues: [],
        crossFieldIssues: []
      },
      aiReview: {
        filledMissingFields: {
          chassisNumber: {
            value: "MA1NE2ZTFP6E12261",
            evidenceText: "Chassis No: MA1NE2ZTFP6E12261",
            reason: "Current chassis number is blank"
          }
        }
      }
    });

    expect(preview.eligibleUpdates.chassisNumber).toMatchObject({
      currentValue: "",
      suggestedValue: "MA1NE2ZTFP6E12261",
      evidenceText: "Chassis No: MA1NE2ZTFP6E12261"
    });
    expect(preview.blockedUpdates).toEqual({});
  });

  it("allows suspicious field update when suggested value passes validation", () => {
    const preview = buildAiMergePreview({
      sourceText: "Registration No. MP04AB1234\nEngine No: K15CN998877",
      currentData: {
        registrationNumber: "MP04AB1234",
        engineNumber: "MP04AB1234"
      },
      validation: {
        status: "review_required",
        fieldIssues: [],
        crossFieldIssues: [
          {
            code: "registration_equals_engine",
            fields: ["registrationNumber", "engineNumber"]
          }
        ]
      },
      aiReview: {
        suspiciousFields: ["engineNumber"],
        suggestedCorrections: {
          engineNumber: {
            value: "K15CN998877",
            evidenceText: "Engine No: K15CN998877",
            reason: "Current value failed engine number validation"
          }
        }
      }
    });

    expect(preview.eligibleUpdates.engineNumber).toMatchObject({
      currentValue: "MP04AB1234",
      suggestedValue: "K15CN998877",
      reason: "Current value failed engine number validation"
    });
    expect(preview.blockedUpdates).toEqual({});
  });

  it("blocks AI suggestion when evidence is absent from source text", () => {
    const preview = buildAiMergePreview({
      sourceText: "Engine No: DIFFERENT99",
      currentData: {
        engineNumber: ""
      },
      validation: {
        status: "passed",
        fieldIssues: [],
        crossFieldIssues: []
      },
      aiReview: {
        filledMissingFields: {
          engineNumber: {
            value: "K15CN998877",
            evidenceText: "Engine No: K15CN998877",
            reason: "AI suggestion without source evidence"
          }
        }
      }
    });

    expect(preview.eligibleUpdates).toEqual({});
    expect(preview.blockedUpdates.engineNumber).toMatchObject({
      currentValue: "",
      suggestedValue: "K15CN998877",
      reason: "AI evidence text was not found in source text"
    });
  });

  it("blocks company and policy type conflicts", () => {
    const preview = buildAiMergePreview({
      sourceText: "TATA AIG General Insurance Company Limited\nICICI Lombard General Insurance Company Limited",
      currentData: {
        insuranceCompany: "TATA AIG"
      },
      validation: {
        status: "review_required",
        fieldIssues: [{ code: "company_review", fields: ["insuranceCompany"] }],
        crossFieldIssues: []
      },
      aiReview: {
        detectedCompany: "TATA AIG",
        suggestedCorrections: {
          insuranceCompany: {
            value: "ICICI Lombard",
            evidenceText: "ICICI Lombard General Insurance Company Limited",
            reason: "Conflicting company suggestion"
          }
        }
      }
    });

    expect(preview.eligibleUpdates).toEqual({});
    expect(preview.blockedUpdates.insuranceCompany.reason).toBe("AI suggested value conflicts with detected company or policy type");
  });
});
