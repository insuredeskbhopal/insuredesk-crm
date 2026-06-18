const POLICY_KEYWORDS = [
  "policy",
  "premium",
  "sum insured",
  "insured",
  "expiry",
  "certificate",
  "vehicle",
  "chassis",
  "engine",
  "risk location",
  "hypothecation",
  "nominee",
  "tpa",
  "hospitalization",
];

export function scoreExtractionQuality(text, classificationConfidence = 0) {
  const normalized = String(text || "").toLowerCase();
  const textLength = normalized.trim().length;
  const keywordCount = POLICY_KEYWORDS.filter((keyword) => normalized.includes(keyword)).length;
  const dateCount = (normalized.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || []).length;
  const currencyValueCount = (
    normalized.match(/(?:rs\.?|inr|₹|premium|sum insured|amount)[^\d]{0,30}\d[\d,]*(?:\.\d{1,2})?/g) || []
  ).length;

  const lengthScore = Math.min(0.3, textLength / 2500);
  const keywordScore = Math.min(0.25, keywordCount * 0.025);
  const dateScore = Math.min(0.15, dateCount * 0.05);
  const currencyScore = Math.min(0.15, currencyValueCount * 0.05);
  const classifierScore = Math.min(0.15, Number(classificationConfidence || 0) * 0.15);
  const score = Number((lengthScore + keywordScore + dateScore + currencyScore + classifierScore).toFixed(2));

  return {
    score,
    lowConfidence: score < 0.45,
    textLength,
    keywordCount,
    dateCount,
    currencyValueCount,
    classificationConfidence: Number(classificationConfidence || 0),
  };
}
