
const { cleanHdfcValue } = require("./text.cjs");
const { normalizeAmount } = require("./amounts.cjs");

// Start of extractByLabels (Lines 3021-3027)
function extractByLabels(text, labels, type = "text") {
  for (const label of labels) {
    const value = extractNearLabel(text, label, type);
    if (value) return value;
  }
  return "";
}

// Start of extractNearLabel (Lines 3029-3045)
function extractNearLabel(text, label, type) {
  const escaped = escapeRegExp(label).replace(/\\ /g, "\\s+");
  const patterns = [
    new RegExp(`${escaped}\\s*(?:[:\\-]|\\.)?\\s*([^\\n]{1,180})`, "i"),
    new RegExp(`${escaped}\\s*\\n\\s*([^\\n]{1,180})`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = cleanHdfcValue(match[1]);
      const normalized = normalizeHdfcTypedValue(value, type);
      if (normalized) return normalized;
    }
  }
  return "";
}

// Start of normalizeHdfcTypedValue (Lines 3047-3096)
function normalizeHdfcTypedValue(value, type) {
  const text = cleanHdfcValue(value);
  if (!text) return "";

  if (type === "amount") {
    return normalizeAmount(matchGroup(text, /([0-9][0-9,]*(?:\.\d{1,2})?)/) || text);
  }
  if (type === "number") {
    return matchGroup(text, /([0-9]+(?:\.\d+)?)/) || "";
  }
  if (type === "year") {
    return matchGroup(text, /\b(19\d{2}|20\d{2})\b/) || "";
  }
  if (type === "date") {
    return matchGroup(text, /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/) || text;
  }
  if (type === "email") {
    return matchGroup(text, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i) || text;
  }
  if (type === "phone") {
    return matchGroup(text, /([6-9Xx*][0-9Xx*]{7,14})/) || text;
  }
  if (type === "pan") {
    return matchGroup(text, /\b([A-Z]{5}\d{4}[A-Z])\b/i) || text;
  }
  if (type === "percent") {
    const percent = matchGroup(text, /(\d{1,2}\s*%)/);
    return percent ? percent.replace(/\s+/g, "") : "";
  }
  if (type === "registration") {
    return (
      matchGroup(
        text,
        /\b((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))\b/i,
      ) || text
    );
  }
  if (type === "identifier") {
    return text
      .split(/\s{2,}|(?=\b(?:Policy|Proposal|Invoice|Customer|From|To|Make|Model|RTO|GSTIN)\b)/i)[0]
      .trim();
  }
  if (type === "shortText" || type === "vehicleText") {
    return text
      .split(/\s{3,}|(?=\b(?:Model|Registration|RTO|Chassis|Engine|Cubic|Seats|Year|Body|Total)\b)/i)[0]
      .trim();
  }

  return text;
}

// Start of matchGroup (Lines 3749-3752)
function matchGroup(text, pattern, groupIndex = 1) {
  const match = text.match(pattern);
  return match?.[groupIndex]?.replace(/\s+/g, " ").trim() || "";
}

// Start of escapeRegExp (Lines 3754-3756)
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  extractByLabels,
  extractNearLabel,
  normalizeHdfcTypedValue,
  matchGroup,
  escapeRegExp
};
