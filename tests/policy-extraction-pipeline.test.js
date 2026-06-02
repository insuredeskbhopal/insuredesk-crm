import { describe, expect, it } from "vitest";
import { mergeExtractionData, shouldUseAiPrimaryExtraction } from "../lib/policy-extraction-pipeline";

describe("policy extraction pipeline", () => {
  it("uses AI as primary extractor when OCR was attempted", () => {
    expect(shouldUseAiPrimaryExtraction({ extractionMethod: "ocr", ocrAttempted: true })).toBe(true);
    expect(shouldUseAiPrimaryExtraction({ extractionMethod: "mixed", ocrAttempted: true })).toBe(true);
    expect(shouldUseAiPrimaryExtraction({ extractionMethod: "pdf_text", ocrAttempted: false })).toBe(false);
  });

  it("lets AI source-backed fields override rule fields while preserving rule-only fields", () => {
    const merged = mergeExtractionData(
      {
        sourceFile: "scan.pdf",
        insuredName: "OCR WRONG NAME",
        policyNumber: "P123",
        vehicleNumber: "MP04AB1234"
      },
      {
        insuredName: "CORRECT AI NAME",
        premium: "12,345.00",
        vehicleNumber: ""
      }
    );

    expect(merged).toMatchObject({
      sourceFile: "scan.pdf",
      insuredName: "CORRECT AI NAME",
      policyNumber: "P123",
      vehicleNumber: "MP04AB1234",
      premium: "12,345.00"
    });
  });
});
