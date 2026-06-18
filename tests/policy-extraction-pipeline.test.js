import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPassiveReview, normalizePassiveAiPatch } from "../lib/policies/ai/extraction-review";
import {
  extractPolicyDataFromTextResult,
  mergeExtractionData,
  shouldUseAiPrimaryExtraction,
} from "../lib/policies/extraction-pipeline";
import { extractPolicyFromText } from "../lib/policies/pdf/extractor.cjs";

const previousOpenAiKey = process.env.OPENAI_API_KEY;
const previousGroqKey = process.env.GROQ_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (previousOpenAiKey) process.env.OPENAI_API_KEY = previousOpenAiKey;
  else delete process.env.OPENAI_API_KEY;
  if (previousGroqKey) process.env.GROQ_API_KEY = previousGroqKey;
  else delete process.env.GROQ_API_KEY;
});

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
        vehicleNumber: "MP04AB1234",
      },
      {
        insuredName: "CORRECT AI NAME",
        premium: "12,345.00",
        vehicleNumber: "",
      },
    );

    expect(merged).toMatchObject({
      sourceFile: "scan.pdf",
      insuredName: "CORRECT AI NAME",
      policyNumber: "P123",
      vehicleNumber: "MP04AB1234",
      premium: "12,345.00",
    });
  });

  it("stores passive AI suggestions without overwriting valid rule values", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.GROQ_API_KEY;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suggestedCorrections: {
                    policyNumber: {
                      value: "AI-WRONG-999",
                      evidenceText: "Policy No. REAL12345",
                      reason: "AI reviewer suggested a correction",
                    },
                  },
                  filledMissingFields: {},
                  rejectedCorrections: {},
                  evidence: {},
                }),
              },
            },
          ],
        }),
      })),
    );

    const rawText = [
      "TATA AIG General Insurance Company Limited",
      "Auto Secure - Private Car Package Policy",
      "Policy No. REAL12345",
      "Name MRS CHANCHAL ANAND SONI",
      "Engine No. GOODENGINE99",
      "Chassis No. MA3CNC62SPD328639",
      "Registration No. MP04ZH3415",
      "Total Premium 21466.00",
    ].join("\n");
    const ruleBased = extractPolicyFromText(rawText, "passive-ai.pdf");
    const result = await extractPolicyDataFromTextResult({
      textResult: { rawText, extractionMethod: "pdf_text", ocrAttempted: false },
      sourceFile: "passive-ai.pdf",
    });

    expect(result.data.policyNumber).toBe(ruleBased.policyNumber);
    expect(result.data.policyNumber).not.toBe("AI-WRONG-999");
    expect(result.data.extractionQuality.aiReview.suggestedCorrections.policyNumber).toBeUndefined();
    expect(result.data.extractionQuality.aiReview.rejectedCorrections.policyNumber).toBe(
      "evidence does not support field value",
    );
  });

  it("rejects passive AI suggestions when no evidence exists", () => {
    const normalized = normalizePassiveAiPatch(
      {
        suggestedCorrections: {
          engineNumber: {
            value: "GOODENGINE99",
            evidenceText: "Engine Number: GOODENGINE99",
            reason: "missing",
          },
        },
      },
      "Engine No. DIFFERENTENGINE88",
    );

    expect(normalized.suggestedCorrections).toEqual({});
    expect(normalized.rejectedCorrections.engineNumber).toBe("missing source evidence");
  });

  it("keeps existing extraction output unchanged apart from passive review metadata", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const rawText = [
      "Generali Central Insurance Company Limited",
      "Motor Protect Private Car Package Policy",
      "Policy No. 1001/31/26/0001/PC/01",
      "Name of Insured/Proposer: RAKESH RAJ",
      "Period of Insurance: From 03/05/2026 To 02/05/2027",
      "MP-04-TA-6636, BHOPAL TATA INDIGO ECS",
      "14GVYP29539MAT607331EPH19673",
      "Total Premium 5521.00",
    ].join("\n");

    const ruleBased = extractPolicyFromText(rawText, "unchanged.pdf");
    const result = await extractPolicyDataFromTextResult({
      textResult: { rawText, extractionMethod: "pdf_text", ocrAttempted: false },
      sourceFile: "unchanged.pdf",
    });

    for (const key of [
      "policyNumber",
      "insuredName",
      "insuranceCompany",
      "policyType",
      "startDate",
      "expiryDate",
      "registrationNumber",
      "engineNumber",
      "chassisNumber",
      "totalPremium",
    ]) {
      expect(result.data[key]).toBe(ruleBased[key]);
    }
    expect(result.data.extractionQuality.aiReview).toMatchObject({
      used: false,
      mode: "passive-review",
      suggestedCorrections: {},
      filledMissingFields: {},
    });
  });

  it("allows validation and passive AI review metadata to coexist", () => {
    const review = buildPassiveReview({
      used: true,
      detectedCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
      detectedPolicyType: "Motor Insurance",
      validationIssues: {
        status: "review_required",
        fieldIssues: [{ code: "engineNumber_format", fields: ["engineNumber"] }],
        crossFieldIssues: [],
      },
      suspiciousFields: ["engineNumber"],
      aiPatch: {
        filledMissingFields: {
          engineNumber: {
            value: "ZTP4D64994",
            evidenceText: "Engine No. ZTP4D64994",
            reason: "blank field has source evidence",
          },
        },
      },
      sourceText: "Engine No. ZTP4D64994",
    });

    expect(review.validationIssues.status).toBe("review_required");
    expect(review.suspiciousFields).toEqual(["engineNumber"]);
    expect(review.filledMissingFields.engineNumber).toMatchObject({
      value: "ZTP4D64994",
      evidenceText: "Engine No. ZTP4D64994",
    });
  });
});
