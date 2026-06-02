import { extractPolicyFromText } from "./pdf-extractor.cjs";
import { reviewPolicyExtractionWithAi } from "./ai-extraction-review.js";

export async function extractPolicyDataFromTextResult({ textResult = {}, sourceFile = "" } = {}) {
  const rawText = textResult.rawText || "";
  const ruleBasedData = extractPolicyFromText(rawText, sourceFile);
  const scannedDocument = shouldUseAiPrimaryExtraction(textResult);

  const aiReviewedExtraction = await reviewPolicyExtractionWithAi({
    rawText,
    extractedData: scannedDocument ? {} : ruleBasedData,
    sourceFile
  });

  const data = scannedDocument
    ? mergeExtractionData(ruleBasedData, aiReviewedExtraction.data)
    : aiReviewedExtraction.data;

  return {
    data: {
      ...data,
      sourceFile: data.sourceFile || ruleBasedData.sourceFile || sourceFile || "Untitled.pdf",
      status: data.status || ruleBasedData.status || "saved",
      documentFormat: data.documentFormat || ruleBasedData.documentFormat || "",
      documentCategory: data.documentCategory || ruleBasedData.documentCategory || "",
      sourceText: rawText,
      extractionMethod: scannedDocument ? `ai_primary_${textResult.extractionMethod || "ocr"}` : (data.extractionMethod || textResult.extractionMethod || ""),
      extractionQuality: {
        ...(data.extractionQuality || {}),
        scannedDocument,
        aiPrimaryExtraction: scannedDocument,
        textExtractionMethod: textResult.extractionMethod || "",
        ocrAttempted: Boolean(textResult.ocrAttempted)
      }
    },
    ruleBasedData,
    aiReview: aiReviewedExtraction.aiReview,
    scannedDocument
  };
}

export function shouldUseAiPrimaryExtraction(textResult = {}) {
  const method = String(textResult.extractionMethod || "").toLowerCase();
  return Boolean(textResult.ocrAttempted) || method === "ocr" || method === "mixed";
}

export function mergeExtractionData(ruleBasedData = {}, aiData = {}) {
  const merged = { ...ruleBasedData };

  for (const [key, value] of Object.entries(aiData || {})) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    merged[key] = value;
  }

  return merged;
}
