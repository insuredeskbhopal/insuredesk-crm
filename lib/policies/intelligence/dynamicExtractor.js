function extractWithSchema(text = "", understanding = {}, schema = {}) {
  const fields = schema.fields || [];
  const fieldMap = schema.fieldMap || [];
  const extractedFields = {};
  const flatData = {};
  const warnings = [];

  for (const field of fields) {
    const mapEntry = fieldMap.find((entry) => entry.field === field.field);
    const result = extractField(text, understanding, field, mapEntry);
    extractedFields[field.field] = result;
    flatData[field.field] = result.value ?? "";
    if (field.required && result.value == null) {
      warnings.push({ field: field.field, warning: "Required field missing", confidence: result.confidence });
    } else if (result.value != null && result.confidence < 0.65) {
      warnings.push({
        field: field.field,
        warning: "Low confidence extraction",
        confidence: result.confidence,
      });
    }
  }

  const populated = Object.values(extractedFields).filter((field) => field.value != null).length;
  const highConfidence = Object.values(extractedFields).filter(
    (field) => field.value != null && field.confidence >= 0.72,
  ).length;
  const confidence = Number(
    Math.min(
      0.99,
      (schema.schemaMatch || 0) * 0.45 +
        ratio(populated, fields.length) * 0.25 +
        ratio(highConfidence, fields.length) * 0.3,
    ).toFixed(2),
  );

  return {
    schemaName: schema.name || "",
    schemaVersion: schema.version || 1,
    schemaMatch: schema.schemaMatch || 0,
    confidence,
    extractedFields,
    flatData,
    warnings,
  };
}

function extractField(text, understanding, schemaField, mapEntry) {
  const aliases = schemaField.aliases || [];
  const sectionText = mapEntry?.sectionMatch?.text || "";
  const sectionType = mapEntry?.sectionMatch?.type || "";
  const haystacks = [
    {
      text: sectionText,
      sectionBoost: sectionTypeBoost(sectionType),
      page: mapEntry?.sectionMatch?.page || 1,
      scope: "section",
    },
    { text, sectionBoost: 0, page: 1, scope: "document" },
  ].filter((entry) => entry.text);

  const candidates = [];
  for (const alias of aliases) {
    for (const haystack of haystacks) {
      const matches = matchNearLabel(haystack.text, alias, schemaField);
      for (const match of matches) {
        const confidence = clamp(match.confidence + haystack.sectionBoost + aliasBoost(alias, schemaField));
        candidates.push({
          value: match.value,
          confidence,
          page: haystack.page,
          sourceLabel: alias,
          sourceText: match.sourceText,
          scope: haystack.scope,
        });
      }
    }
  }

  const best = candidates
    .filter((candidate) => candidate.value != null && candidate.value !== "")
    .filter((candidate) => !isNoisyCandidate(candidate, schemaField))
    .sort((a, b) => b.confidence - a.confidence || b.sourceText.length - a.sourceText.length)[0];

  if (best) return best;
  return { value: null, confidence: 0, page: null, sourceLabel: "", sourceText: "" };
}

function matchNearLabel(text, alias, field) {
  const escaped = escapeRegExp(alias).replace(/\\ /g, "\\s+");
  const patterns = [
    new RegExp(`${escaped}\\s*(?:[:.\\-]|is)?\\s*([^\\n]{1,180})`, "ig"),
    new RegExp(`${escaped}\\s*\\n\\s*([^\\n]{1,180})`, "ig"),
  ];

  const matches = [];
  for (const pattern of patterns) {
    for (const match of String(text || "").matchAll(pattern)) {
      const sourceText = `${alias} ${match[1]}`.replace(/\s+/g, " ").trim().slice(0, 240);
      const value = normalizeTypedValue(match[1], field.type);
      if (value != null && value !== "") {
        matches.push({ value, confidence: confidenceForValue(value, field.type, sourceText), sourceText });
      }
    }
  }

  return matches;
}

function normalizeTypedValue(value, type) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  if (type === "amount") {
    const amount = text.match(/[0-9][0-9,]*(?:\.\d{1,2})?/);
    if (!amount) return null;
    return amount[0].includes(".") ? amount[0] : `${amount[0]}.00`;
  }
  if (type === "date") {
    return text.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/)?.[0] || null;
  }
  if (type === "registration") {
    return (
      text.match(
        /(?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4})/i,
      )?.[0] || null
    );
  }
  if (type === "percent") {
    return text.match(/\d{1,2}\s*%/)?.[0]?.replace(/\s+/g, "") || null;
  }
  if (type === "pan") {
    return text.match(/[A-Z]{5}\d{4}[A-Z]/i)?.[0] || null;
  }
  if (type === "email") {
    return text.match(/[A-Z0-9*._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  }
  if (type === "number") {
    return text.match(/\d+(?:\.\d+)?/)?.[0] || null;
  }
  return (
    text
      .split(
        /\s{3,}|(?=\b(?:Policy|Proposal|Invoice|Customer|From|To|Make|Model|RTO|GSTIN|Premium|Document generated|UIN)\b)/i,
      )[0]
      .replace(/^is\s+/i, "")
      .trim() || null
  );
}

function confidenceForValue(value, type, sourceText = "") {
  if (!value) return 0;
  let score = 0.45;
  if (["date", "registration", "percent", "pan", "email"].includes(type)) score = 0.86;
  else if (type === "amount") score = /[0-9]/.test(value) ? 0.82 : 0.35;
  else if (type === "number") score = /^\d/.test(value) ? 0.78 : 0.35;
  else score = String(value).length >= 3 ? 0.72 : 0.45;

  if (/document generated|customer care|claim|sms|website|uin:/i.test(sourceText)) score -= 0.18;
  if (String(value).length > 90) score -= 0.14;
  return clamp(score);
}

function sectionTypeBoost(sectionType) {
  if (["policy_details", "insured_details", "vehicle_details", "premium_details"].includes(sectionType))
    return 0.14;
  if (["gst_table", "previous_policy_details", "nominee_details", "financier_details"].includes(sectionType))
    return 0.1;
  return 0.06;
}

function aliasBoost(alias, field) {
  const normalizedAlias = normalizeLabel(alias);
  const normalizedField = normalizeLabel(field.field);
  if (normalizedAlias === normalizedField) return 0.08;
  if (/policy(no|number)$/.test(normalizedAlias) && field.field === "policyNumber") return 0.08;
  if (/totalpremium/.test(normalizedAlias) && /premium/i.test(field.field)) return 0.06;
  return 0;
}

function isNoisyCandidate(candidate, field) {
  const value = String(candidate.value || "");
  const source = String(candidate.sourceText || "");
  if (!value) return true;
  if (field.type === "amount" && /^0(?:\.00)?$/.test(value)) return true;
  if (field.field === "policyNumber" && /previous/i.test(source)) return true;
  if (field.field === "customerMobile" && /claim|sms|contact us|customer care/i.test(source)) return true;
  if (field.field === "panNumber" && /GCI PAN|Company PAN|Insurer/i.test(source)) return true;
  if (/legal|exclusion|disclaimer|terms and conditions/i.test(source) && field.required) return true;
  return false;
}

function normalizeLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function ratio(value, total) {
  return total ? Math.min(1, value / total) : 0;
}

function clamp(value) {
  return Number(Math.max(0, Math.min(0.99, value)).toFixed(2));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { extractWithSchema, extractField };
