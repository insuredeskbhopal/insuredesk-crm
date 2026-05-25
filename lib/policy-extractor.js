const FALLBACK_PATTERNS = {
  date: [
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
    /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})\b/i
  ],
  policyNumber: [
    /policy\s*(?:no|number|schedule no|schedule number)\s*[:.-]?\s*([A-Z0-9/.-]{6,})/i,
    /certificate\s*(?:no|number)\s*[:.-]?\s*([A-Z0-9/.-]{6,})/i
  ],
  premium: [
    /(?:total\s+premium|premium\s+inclusive\s+tax|gross\s+premium|net\s+premium)[^\d]{0,30}([0-9][0-9,]*(?:\.\d{1,2})?)/i
  ],
  sumInsured: [
    /(?:sum\s+insured|total\s+sum\s+insured|coverage\s+amount)[^\d]{0,30}([0-9][0-9,]*(?:\.\d{1,2})?)/i
  ],
  vehicleNumber: [
    /\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})\b/i
  ],
  gstNumber: [
    /\b(\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9])\b/i
  ],
  mobileNumber: [
    /\b([6-9]\d{9})\b/
  ],
  email: [
    /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i
  ],
  insuredName: [
    /name\s+of\s+the\s+insured\s*([A-Z0-9/&().,\-\s]{3,160}?)\s*policy\s*no/i
  ],
  policyPeriod: [
    /period\s+of\s+insurance\s*from\s*:?\s*(?:00:00\s+hours\s+of\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*to\s*:?\s*(?:midnight\s+of\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
  ],
  riskLocation: [
    /premises\s+to\s+be\s+insured\s*([A-Z0-9/&().,\-\s]{10,360}?)\s*premium/i
  ],
  businessOfInsured: [
    /business\s+of\s+the\s+insured\s*([A-Z0-9/&().,\-\s]{10,300}?)\s*issued\s+at/i
  ],
  issuedAt: [
    /issued\s+at\s*([A-Z ]{3,80})\s*premises/i
  ],
  brokerName: [
    /agency\/broker\s+code\s*agency\/broker\s+name\s*agency\/broker\s+mobile\s+no\s*agency\/broker\s+email-id\s*\d+\s*([A-Z0-9 .&-]{3,80})\s*\d{10}/i
  ],
  sectionAmount: [
    /MSME\s+Suraksha\s+Kavach\s+-\s+Contents\s*\(`\)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
    /Burglary\s*\(`\)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
    /Fidelity\s*\(`\)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i
  ]
};

export function extractFieldsForSchema(rawText, schema) {
  const text = clean(rawText);
  const extractedData = {};

  for (const field of schema?.fields || []) {
    const value = extractFieldValue(text, field);
    extractedData[field.key] = value;
  }

  return extractedData;
}

export function extractFieldValue(rawText, field) {
  const text = clean(rawText);
  const aliases = [field.label, field.key, ...(field.aliases || [])].filter(Boolean);

  if (field.regexPattern) {
    try {
      const match = text.match(new RegExp(field.regexPattern, "i"));
      if (match?.[1] || match?.[0]) {
        return normalizeFieldValue(match[1] || match[0], field.fieldType);
      }
    } catch {}
  }

  for (const alias of aliases) {
    const value = extractAfterAlias(text, alias, field.fieldType);
    if (value) return normalizeFieldValue(value, field.fieldType);
  }

  const fallback = fallbackForField(text, field);
  return normalizeFieldValue(fallback, field.fieldType);
}

function extractAfterAlias(text, alias, fieldType) {
  const safeAlias = escapeRegExp(alias).replace(/\\ /g, "\\s+");
  const pattern = new RegExp(`${safeAlias}\\s*(?:[:\\-]|no\\.?|number)?\\s*([A-Z0-9@.,/&()\\-\\s]{2,180})`, "i");
  const match = text.match(pattern);
  if (!match?.[1]) return "";

  const raw = match[1]
    .split(/\n| {3,}|(?=\b(?:policy|premium|sum insured|from|to|expiry|start|chassis|engine|nominee)\b)/i)[0]
    .trim();

  if (fieldType === "currency") {
    return firstMatch(raw, [/([0-9][0-9,]*(?:\.\d{1,2})?)/]);
  }
  if (fieldType === "date") {
    return firstMatch(raw, FALLBACK_PATTERNS.date);
  }
  return raw;
}

function fallbackForField(text, field) {
  const key = field.key.toLowerCase();
  const label = field.label.toLowerCase();

  if (key.includes("policynumber") || label.includes("policy number")) return firstMatch(text, FALLBACK_PATTERNS.policyNumber);
  if (key.includes("insuredname") || label.includes("insured name")) return firstMatch(text, FALLBACK_PATTERNS.insuredName);
  if (key.includes("policystartdate") || label.includes("policy start")) return periodMatch(text, "start");
  if (key.includes("policyenddate") || label.includes("policy end")) return periodMatch(text, "end");
  if (key.includes("risklocation") || label.includes("risk location") || label.includes("premises")) return firstMatch(text, FALLBACK_PATTERNS.riskLocation);
  if (key.includes("businessofinsured")) return firstMatch(text, FALLBACK_PATTERNS.businessOfInsured);
  if (key.includes("issuedat")) return firstMatch(text, FALLBACK_PATTERNS.issuedAt);
  if (key.includes("brokername")) return firstMatch(text, FALLBACK_PATTERNS.brokerName);
  if (key.includes("premium") || label.includes("premium")) return firstMatch(text, FALLBACK_PATTERNS.premium);
  if (key.includes("contentssuminsured")) return firstMatch(text, [FALLBACK_PATTERNS.sectionAmount[0]]);
  if (key.includes("burglarysuminsured")) return firstMatch(text, [FALLBACK_PATTERNS.sectionAmount[1]]);
  if (key.includes("fidelitysuminsured")) return firstMatch(text, [FALLBACK_PATTERNS.sectionAmount[2]]);
  if (key.includes("suminsured") || label.includes("sum insured")) return firstMatch(text, FALLBACK_PATTERNS.sumInsured);
  if (key.includes("vehiclenumber") || label.includes("vehicle number")) return firstMatch(text, FALLBACK_PATTERNS.vehicleNumber);
  if (key.includes("gst")) return firstMatch(text, FALLBACK_PATTERNS.gstNumber);
  if (key.includes("mobile") || key.includes("contact")) return firstMatch(text, FALLBACK_PATTERNS.mobileNumber);
  if (key.includes("email")) return firstMatch(text, FALLBACK_PATTERNS.email);
  if (field.fieldType === "date" || key.includes("date")) return firstMatch(text, FALLBACK_PATTERNS.date);

  return "";
}

function periodMatch(text, side) {
  const match = text.match(FALLBACK_PATTERNS.policyPeriod[0]);
  if (!match) return "";
  return side === "start" ? match[1] || "" : match[2] || "";
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function normalizeFieldValue(value, fieldType) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (fieldType === "currency" || fieldType === "number") {
    return text.replace(/[^0-9.,-]/g, "");
  }
  return text;
}

function clean(text) {
  return String(text || "")
    .replace(/\r/g, " ")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
