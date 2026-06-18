export function getEligibleAiSuggestion(upload, fieldKey) {
  const aiMergePreview =
    upload?.extractedData?.extractionQuality?.aiMergePreview ||
    upload?.extractionQuality?.aiMergePreview ||
    {};
  return aiMergePreview.eligibleUpdates?.[fieldKey] || null;
}

export function applyAiSuggestionToReviewField({ fieldKey, suggestion, onFieldChange }) {
  if (!fieldKey || !suggestion?.suggestedValue || typeof onFieldChange !== "function") return false;
  onFieldChange(fieldKey, suggestion.suggestedValue);
  return true;
}
