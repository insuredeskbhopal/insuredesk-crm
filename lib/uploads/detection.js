import insuranceCompanyMaster from "@/lib/master/insurance-companies.cjs";

const { normalizeInsuranceCompanyName } = insuranceCompanyMaster;

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
    company: compactDetectionName(
      normalizeInsuranceCompanyName(
        extractedData.insuranceCompany || extractedData.companyName,
        extractedData.sourceText || "",
      ),
    ),
    serviceCategory: compactDetectionName(extractedData.documentCategory),
    policyType: compactDetectionName(extractedData.policyType),
    confidenceScore,
  };
}

export function hasUploadDetection(detection = {}) {
  return Boolean(
    detection.bankSource?.name ||
    detection.company?.name ||
    detection.serviceCategory?.name ||
    detection.policyType?.name,
  );
}
