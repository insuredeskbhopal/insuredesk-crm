import { validatePolicyCrossFields, validatePolicyFields } from "../validation-engine.cjs";

export function buildAiMergePreview({
  sourceText = "",
  currentData = {},
  validation = {},
  aiReview = {},
} = {}) {
  const eligibleUpdates = {};
  const blockedUpdates = {};
  const reasons = {};
  const suggestions = collectAiSuggestions(aiReview);
  const suspiciousFields = new Set([
    ...(aiReview.suspiciousFields || []),
    ...getValidationFields(validation),
  ]);

  for (const [field, suggestion] of Object.entries(suggestions)) {
    const currentValue = currentData[field] || "";
    const suggestedValue = suggestion.value || "";
    const evidenceText = suggestion.evidenceText || "";
    const fieldIsBlank = !String(currentValue || "").trim();
    const fieldFailedValidation = hasValidationIssue(field, validation);
    const fieldIsSuspicious = suspiciousFields.has(field);

    const block = (reason) => {
      blockedUpdates[field] = {
        currentValue,
        suggestedValue,
        reason,
      };
      reasons[field] = reason;
    };

    if (!fieldIsBlank && !fieldFailedValidation && !fieldIsSuspicious) {
      block("Current rule value is valid and should not be overwritten");
      continue;
    }

    if (!String(evidenceText || "").trim()) {
      block("AI suggestion is missing evidence text");
      continue;
    }

    if (!containsSourceSnippet(sourceText, evidenceText)) {
      block("AI evidence text was not found in source text");
      continue;
    }

    if (!evidenceSupportsSuggestedValue(suggestedValue, evidenceText)) {
      block("AI evidence text does not support suggested value");
      continue;
    }

    if (!suggestedValuePassesValidation(field, suggestedValue, currentData)) {
      block("AI suggested value failed field validation");
      continue;
    }

    if (conflictsWithCompanyOrPolicyType(field, suggestedValue, currentData, aiReview)) {
      block("AI suggested value conflicts with detected company or policy type");
      continue;
    }

    const reason =
      suggestion.reason || buildEligibilityReason({ fieldIsBlank, fieldFailedValidation, fieldIsSuspicious });
    eligibleUpdates[field] = {
      currentValue,
      suggestedValue,
      evidenceText,
      reason,
    };
    reasons[field] = reason;
  }

  return {
    eligibleUpdates,
    blockedUpdates,
    reasons,
  };
}

function collectAiSuggestions(aiReview = {}) {
  return {
    ...normalizeSuggestionEntries(aiReview.suggestedCorrections),
    ...normalizeSuggestionEntries(aiReview.filledMissingFields),
  };
}

function normalizeSuggestionEntries(entries = {}) {
  return Object.entries(entries || {}).reduce((items, [field, entry]) => {
    if (!entry || typeof entry !== "object") return items;
    items[field] = {
      value: entry.value || "",
      evidenceText: entry.evidenceText || entry.sourceText || "",
      reason: entry.reason || "",
    };
    return items;
  }, {});
}

function hasValidationIssue(field, validation = {}) {
  return getValidationFields(validation).includes(field);
}

function getValidationFields(validation = {}) {
  const fields = new Set();
  for (const issue of [...(validation.fieldIssues || []), ...(validation.crossFieldIssues || [])]) {
    for (const field of issue.fields || []) fields.add(field);
  }
  return [...fields];
}

function suggestedValuePassesValidation(field, suggestedValue, currentData = {}) {
  const nextData = { ...currentData, [field]: suggestedValue };
  if (field === "registrationNumber" && !nextData.vehicleNumber) nextData.vehicleNumber = suggestedValue;
  if (field === "vehicleNumber" && !nextData.registrationNumber) nextData.registrationNumber = suggestedValue;

  const issues = [...validatePolicyFields(nextData), ...validatePolicyCrossFields(nextData)];
  return !issues.some((issue) => (issue.fields || []).includes(field));
}

function conflictsWithCompanyOrPolicyType(field, suggestedValue, currentData = {}, aiReview = {}) {
  if (field === "insuranceCompany") {
    const currentCompany = normalizeText(currentData.insuranceCompany || currentData.companyName);
    const detectedCompany = normalizeText(aiReview.detectedCompany);
    const nextCompany = normalizeText(suggestedValue);
    if (currentCompany && currentCompany !== nextCompany) return true;
    if (detectedCompany && detectedCompany !== nextCompany) return true;
  }

  if (field === "policyType") {
    const currentPolicyType = normalizeText(currentData.policyType);
    const detectedPolicyType = normalizeText(aiReview.detectedPolicyType);
    const nextPolicyType = normalizeText(suggestedValue);
    if (currentPolicyType && currentPolicyType !== nextPolicyType) return true;
    if (detectedPolicyType && detectedPolicyType !== nextPolicyType) return true;
  }

  return false;
}

function buildEligibilityReason({ fieldIsBlank, fieldFailedValidation, fieldIsSuspicious }) {
  if (fieldFailedValidation) return "Current value failed validation";
  if (fieldIsSuspicious) return "Current value is suspicious";
  if (fieldIsBlank) return "Current value is blank";
  return "AI suggestion is eligible for review";
}

function containsSourceSnippet(sourceText, evidenceText) {
  const source = String(sourceText || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const snippet = String(evidenceText || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return Boolean(snippet && source.includes(snippet));
}

function evidenceSupportsSuggestedValue(suggestedValue, evidenceText) {
  const compactSuggestion = compact(suggestedValue);
  const compactEvidence = compact(evidenceText);
  if (!compactSuggestion) return false;
  if (compactEvidence.includes(compactSuggestion)) return true;

  const suggestionTokens = String(suggestedValue || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
  if (!suggestionTokens.length) return false;
  const evidence = String(evidenceText || "").toLowerCase();
  return (
    suggestionTokens.filter((token) => evidence.includes(token)).length >=
    Math.min(2, suggestionTokens.length)
  );
}

function compact(value = "") {
  return String(value || "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function normalizeText(value = "") {
  return String(value || "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}
