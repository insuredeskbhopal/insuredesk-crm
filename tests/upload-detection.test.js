import { describe, expect, it } from "vitest";
import { buildUploadDetection, hasUploadDetection } from "../lib/upload-detection";

describe("upload detection summary", () => {
  it("builds a queue-safe detection payload from final motor extraction fields", () => {
    const detection = buildUploadDetection({
      insuranceCompany: "TATA AIG",
      documentCategory: "Motor Insurance",
      policyType: "Auto Secure - Private Car Package Policy",
      schemaExtraction: { confidence: 0.89 }
    });

    expect(detection).toMatchObject({
      company: { name: "TATA AIG" },
      serviceCategory: { name: "Motor Insurance" },
      policyType: { name: "Auto Secure - Private Car Package Policy" },
      confidenceScore: 0.89
    });
    expect(hasUploadDetection(detection)).toBe(true);
  });

  it("still reports partial detection when policy type is not available", () => {
    const detection = buildUploadDetection({
      companyName: "The New India Assurance Co. Ltd.",
      documentCategory: "Motor Insurance",
      extractionQuality: { confidenceScore: 0.72 }
    });

    expect(detection.policyType).toBeNull();
    expect(detection.company).toEqual({ name: "The New India Assurance Co. Ltd." });
    expect(detection.serviceCategory).toEqual({ name: "Motor Insurance" });
    expect(detection.confidenceScore).toBe(0.72);
    expect(hasUploadDetection(detection)).toBe(true);
  });

  it("does not claim detection when every summary field is empty", () => {
    expect(hasUploadDetection(buildUploadDetection({}))).toBe(false);
  });
});
