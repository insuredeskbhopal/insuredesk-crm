export function extractCompanyEvidence(rawText = "") {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const evidence = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!isCompanyEvidenceLine(line)) continue;
    evidence.push(line);
    if (lines[index - 1]) evidence.push(`${lines[index - 1]} ${line}`);
    if (lines[index + 1]) evidence.push(`${line} ${lines[index + 1]}`);
  }

  return Array.from(new Set(evidence)).slice(0, 30);
}

export function hasCompanyEvidence(value = "", rawText = "") {
  const tokens = getCompanyTokens(value);
  if (!tokens.length) return false;

  return extractCompanyEvidence(rawText).some((line) => {
    const source = line.toLowerCase();
    const matched = tokens.filter((token) => source.includes(token));
    return matched.length >= Math.min(2, tokens.length);
  });
}

function isCompanyEvidenceLine(line = "") {
  const text = String(line || "").toLowerCase();
  return /\b(?:insurance|assurance|insurer|company|co\.?|ltd\.?|limited|general\s+insurance)\b/i.test(text) &&
    /[a-z]/i.test(text) &&
    text.length >= 5 &&
    text.length <= 180;
}

function getCompanyTokens(value = "") {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
    .filter((token) => !["the", "and", "company", "limited", "ltd", "insurance", "assurance", "general"].includes(token));
}
