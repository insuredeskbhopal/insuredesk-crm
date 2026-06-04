import { getFieldSetupCatalog } from "@/lib/policies/field-setup";

const POLICY_SIGNALS = {
  "Vehicle Insurance": ["vehicle number", "registration no", "regn no", "chassis no", "engine no", "idv", "own damage"],
  "Health Insurance": ["tpa", "room rent", "hospitalization", "pre-existing disease", "members covered", "mediclaim"],
  "Commercial Insurance": ["fire", "stock", "building", "machinery", "burglary", "liability", "marine", "risk location"],
  "Bank Insurance": ["loan account", "hypothecation", "bank clause", "mortgage", "financier", "borrower"],
  "Cyber Insurance": ["cyber", "data breach", "network security", "ransomware"],
  "Travel Insurance": ["travel", "passport", "journey", "baggage", "trip"]
};

export async function classifyPolicyText(rawText, options = {}) {
  const catalog = await getFieldSetupCatalog();
  const text = normalize([rawText, options.sourceFile].filter(Boolean).join(" "));
  const policyType = bestPolicyType(catalog.policyTypes, text);
  const resolvedCompany = policyType.match?.insuranceCompanyId
    ? catalog.companies.find((item) => item.id === policyType.match.insuranceCompanyId) || null
    : null;
  const resolvedCategory = policyType.match?.serviceCategoryId
    ? catalog.categories.find((item) => item.id === policyType.match.serviceCategoryId) || null
    : null;
  const confidenceScore = policyType.score || 0;
  const boostedConfidence = policyType.match
    ? Math.max(confidenceScore, policyType.score >= 0.86 ? 0.78 : confidenceScore)
    : confidenceScore;
  const hasUsableClassification = Boolean(policyType.match && resolvedCategory);

  return {
    bankSource: null,
    company: resolvedCompany,
    serviceCategory: resolvedCategory,
    policyType: policyType.match,
    confidenceScore: Number(boostedConfidence.toFixed(2)),
    lowConfidence: !hasUsableClassification || boostedConfidence < 0.62,
    reasons: [...policyType.reasons]
  };
}

function bestPolicyType(policyTypes, text) {
  const exact = exactPolicyTypeMatch(policyTypes, text);
  if (exact.match) return exact;

  const candidates = policyTypes
    .map((type) => ({
      item: type,
      terms: [
        type.name,
        ...(type.aliases || []),
        ...(type.keywords || []),
        ...fieldIndicators(type.fields),
        ...(POLICY_SIGNALS[type.categoryName] || [])
      ]
    }));

  return bestMatch(candidates, text, 0.92);
}

function exactPolicyTypeMatch(policyTypes, text) {
  const match = findExactPolicyType(policyTypes, text);
  if (!match) return { match: null, score: 0, reasons: [] };

  return {
    match,
    score: 0.98,
    reasons: [`${match.name}: exact policy name or alias`]
  };
}

function findExactPolicyType(policyTypes, text) {
  return policyTypes.find((type) =>
    [type.name, ...(type.aliases || [])]
      .map(normalize)
      .filter(Boolean)
      .some((term) => text.includes(term))
  ) || null;
}

function bestMatch(candidates, text, maxScore) {
  let best = { match: null, score: 0, reasons: [] };

  for (const candidate of candidates) {
    const matched = unique(candidate.terms).filter((term) => term && text.includes(normalize(term)));
    if (!matched.length) continue;

    const exactNameBonus = text.includes(normalize(candidate.item.name)) ? 0.25 : 0;
    const score = Math.min(maxScore, 0.28 + matched.length * 0.12 + exactNameBonus);
    if (score > best.score) {
      best = {
        match: candidate.item,
        score,
        reasons: matched.slice(0, 5).map((term) => `${candidate.item.name}: ${term}`)
      };
    }
  }

  return best;
}

function fieldIndicators(fields = []) {
  return fields.flatMap((field) => [field.label, field.key, ...(field.aliases || [])]);
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function unique(values) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}
