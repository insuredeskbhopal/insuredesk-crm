function validateExtraction({ legacyData = {}, schemaResult = {}, understanding = {} }) {
  const fieldConfidence = schemaResult.extractedFields || {};
  const warnings = dedupeWarnings([...(schemaResult.warnings || [])]);

  const requiredKeys = ["insuredName", "policyNumber", "policyType", "insuranceCompany"];
  for (const key of requiredKeys) {
    if (!legacyData[key] && !schemaResult.flatData?.[key]) {
      warnings.push({ field: key, warning: "Core review field missing", confidence: 0 });
    }
  }
  if (!understanding.layout?.layoutHash) {
    warnings.push({ field: "layout", warning: "Layout fingerprint missing", confidence: 0 });
  }
  if ((understanding.confidence || 0) < 0.55) {
    warnings.push({ field: "document", warning: "Low document understanding confidence", confidence: understanding.confidence || 0 });
  }
  if ((schemaResult.schemaMatch || 0) < 0.62) {
    warnings.push({ field: "schema", warning: "Low schema match; regex fallback used", confidence: schemaResult.schemaMatch || 0 });
  }
  for (const [key, result] of Object.entries(fieldConfidence)) {
    if (result?.value != null && result.confidence < 0.55) {
      warnings.push({ field: key, warning: "Very low confidence field candidate", confidence: result.confidence });
    }
  }

  const filledLegacy = Object.values(legacyData).filter(Boolean).length;
  const confidenceScore = Number(Math.min(0.99,
    (understanding.confidence || 0) * 0.35 +
    (schemaResult.confidence || 0) * 0.4 +
    Math.min(1, filledLegacy / 20) * 0.25
  ).toFixed(2));

  return {
    confidenceScore,
    fieldConfidence,
      warnings: dedupeWarnings(warnings),
      quality: warnings.length ? "review_required" : "ready_for_review"
  };
}

function mergeSchemaWithFallback(schemaResult = {}, legacyData = {}) {
  const flatData = schemaResult.flatData || {};
  const fields = schemaResult.extractedFields || {};
  const merged = { ...legacyData };
  if ((schemaResult.schemaMatch || 0) < 0.62) return merged;

  for (const [key, value] of Object.entries(flatData)) {
    const fieldConfidence = fields[key]?.confidence || 0;
    const existing = merged[key];
    if (value != null && value !== "" && !existing && fieldConfidence >= 0.72) {
      merged[key] = value;
    }
  }

  return merged;
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((warning) => {
    const key = `${warning.field}:${warning.warning}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { validateExtraction, mergeSchemaWithFallback };
