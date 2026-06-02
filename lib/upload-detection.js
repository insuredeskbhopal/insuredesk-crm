function compactDetectionName(value) {
  const normalized = String(value || "").trim();
  return normalized ? { name: normalized } : null;
}

export function buildUploadDetection(extractedData = {}) {
  const confidenceScore =
    Number(extractedData.confidenceScore) ||
    Number(extractedData.extractionQuality?.confidenceScore) ||
    Number(extractedData.schemaExtraction?.confidence) ||
    0;

  return {
    bankSource: compactDetectionName(extractedData.bankName || extractedData.bankSource),
    company: compactDetectionName(extractedData.insuranceCompany || extractedData.companyName),
    serviceCategory: compactDetectionName(extractedData.documentCategory),
    policyType: compactDetectionName(extractedData.policyType),
    confidenceScore
  };
}

export function hasUploadDetection(detection = {}) {
  return Boolean(
    detection.bankSource?.name ||
    detection.company?.name ||
    detection.serviceCategory?.name ||
    detection.policyType?.name
  );
}
