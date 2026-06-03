import { describe, expect, it, vi } from "vitest";
import {
  applyAiSuggestionToReviewField,
  getEligibleAiSuggestion
} from "../app/components/upload/aiSuggestionHelpers";

function buildUpload() {
  return {
    extractedData: {
      engineNumber: "",
      policyNumber: "POL12345",
      extractionQuality: {
        aiMergePreview: {
          eligibleUpdates: {
            engineNumber: {
              currentValue: "",
              suggestedValue: "K15CN998877",
              evidenceText: "Engine No: K15CN998877",
              reason: "Current value is blank"
            }
          },
          blockedUpdates: {
            policyNumber: {
              currentValue: "POL12345",
              suggestedValue: "POL123",
              reason: "Current rule value is valid and should not be overwritten"
            }
          },
          reasons: {}
        }
      }
    }
  };
}

describe("AI suggestion UI helpers", () => {
  it("returns eligible suggestions beside review fields", () => {
    expect(getEligibleAiSuggestion(buildUpload(), "engineNumber")).toMatchObject({
      suggestedValue: "K15CN998877",
      evidenceText: "Engine No: K15CN998877"
    });
  });

  it("does not expose blocked updates beside fields by default", () => {
    expect(getEligibleAiSuggestion(buildUpload(), "policyNumber")).toBeNull();
  });

  it("apply suggestion updates local review form callback only", () => {
    const onFieldChange = vi.fn();
    const onSave = vi.fn();
    const applied = applyAiSuggestionToReviewField({
      fieldKey: "engineNumber",
      suggestion: getEligibleAiSuggestion(buildUpload(), "engineNumber"),
      onFieldChange
    });

    expect(applied).toBe(true);
    expect(onFieldChange).toHaveBeenCalledWith("engineNumber", "K15CN998877");
    expect(onSave).not.toHaveBeenCalled();
  });
});
