import { extractPolicyFromText } from "./pdf/extractor.cjs";
import { buildAiMergePreview } from "./ai/merge-preview.js";
import { reviewPolicyExtractionPassivelyWithAi } from "./ai/extraction-review.js";

export async function extractPolicyDataFromTextResult({ textResult = {}, sourceFile = "" } = {}) {
  const rawText = textResult.rawText || "";
  const ruleBasedData = extractPolicyFromText(rawText, sourceFile);
  const scannedDocument = shouldUseAiPrimaryExtraction(textResult);
  const validation = ruleBasedData.extractionQuality?.validation || {};
  const missingFields = getMissingFields(ruleBasedData);
  const suspiciousFields = getSuspiciousFields(validation);
  const aiReview = await reviewPolicyExtractionPassivelyWithAi({
    sourceText: rawText,
    detectedCompany: ruleBasedData.insuranceCompany || ruleBasedData.companyName || "",
    detectedPolicyType: ruleBasedData.policyType || "",
    ruleExtraction: ruleBasedData,
    schemaExtraction: ruleBasedData.schemaExtraction || {},
    validationIssues: validation,
    missingFields,
    suspiciousFields,
    sourceFile,
  });
  const aiMergePreview = buildAiMergePreview({
    sourceText: rawText,
    currentData: ruleBasedData,
    validation,
    aiReview,
  });
  const autoFilledData = { ...ruleBasedData };
  const autoFilledFields = [];

  for (const [field, update] of Object.entries(aiMergePreview?.eligibleUpdates || {})) {
    if (update?.suggestedValue && (isInvalidFieldValue(field, autoFilledData[field]) || suspiciousFields.includes(field))) {
      autoFilledData[field] = update.suggestedValue;
      if (field === "registrationNumber" && isInvalidFieldValue("vehicleNumber", autoFilledData.vehicleNumber)) {
        autoFilledData.vehicleNumber = update.suggestedValue;
      }
      if (field === "vehicleNumber" && isInvalidFieldValue("registrationNumber", autoFilledData.registrationNumber)) {
        autoFilledData.registrationNumber = update.suggestedValue;
      }
      autoFilledFields.push(field);
    }
  }

  const data = {
    ...autoFilledData,
    extractionQuality: {
      ...(ruleBasedData.extractionQuality || {}),
      aiReview,
      aiMergePreview,
      autoFilledFields,
    },
  };

  return {
    data: {
      ...data,
      sourceFile: data.sourceFile || ruleBasedData.sourceFile || sourceFile || "Untitled.pdf",
      status: data.status || ruleBasedData.status || "saved",
      documentFormat: data.documentFormat || ruleBasedData.documentFormat || "",
      documentCategory: data.documentCategory || ruleBasedData.documentCategory || "",
      sourceText: rawText,
      extractionMethod: scannedDocument
        ? `ai_primary_${textResult.extractionMethod || "ocr"}`
        : data.extractionMethod || textResult.extractionMethod || "",
      extractionQuality: {
        ...(data.extractionQuality || {}),
        scannedDocument,
        aiPrimaryExtraction: false,
        textExtractionMethod: textResult.extractionMethod || "",
        ocrAttempted: Boolean(textResult.ocrAttempted),
      },
    },
    ruleBasedData,
    aiReview,
    scannedDocument,
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

export function getMissingFields(data = {}) {
  const reviewFields = [
    "insuranceCompany",
    "policyType",
    "insuredName",
    "policyNumber",
    "startDate",
    "expiryDate",
    "registrationNumber",
    "vehicleNumber",
    "engineNumber",
    "chassisNumber",
    "premium",
    "totalPremium",
  ];
  return reviewFields.filter((field) => isInvalidFieldValue(field, data[field]));
}

export function isInvalidFieldValue(field, val) {
  const s = String(val || "").trim();
  if (!s) return true;
  if (/^(?:Policy|Policy No|Registration|Chassis|Engine|Name|Address)$/i.test(s)) return true;
  if (field === "policyNumber" && (s.length < 5 || (!/\d/.test(s) && /^(?:Policy|Policy No|Certificate)$/i.test(s)))) return true;
  return false;
}

export function getSuspiciousFields(validation = {}) {
  const fields = new Set();
  for (const item of [...(validation.fieldIssues || []), ...(validation.crossFieldIssues || [])]) {
    for (const field of item.fields || []) fields.add(field);
  }
  return [...fields];
}
