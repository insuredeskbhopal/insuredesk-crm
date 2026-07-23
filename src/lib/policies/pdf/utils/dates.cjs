const { matchGroup } = require("./regex.cjs");

const monthMap = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
};

function parseDurationDate(value) {
  if (!value) return null;
  const str = String(value).trim();

  // 1. DD/MM/YYYY or DD-MM-YYYY
  const numericMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]);
    let year = Number(numericMatch[3]);
    if (year < 100) year += 2000;
    return new Date(year, month - 1, day);
  }

  // 2. DD-MMM-YYYY or DD/MMM/YYYY (e.g. 14-Jul-2026)
  const namedMatch = str.match(/^(\d{1,2})[/-]([A-Za-z]{3})[/-](\d{2,4})$/);
  if (namedMatch) {
    const day = Number(namedMatch[1]);
    const monthStr = namedMatch[2].toUpperCase();
    const month = monthMap[monthStr];
    let year = Number(namedMatch[3]);
    if (year < 100) year += 2000;
    if (month) return new Date(year, month - 1, day);
  }

  // 3. YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  // 4. Embedded date search fallback
  const embeddedSlash = matchGroup(str, /(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (embeddedSlash) {
    const [day, month, rawYear] = embeddedSlash.split("/").map(Number);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    return new Date(year, month - 1, day);
  }

  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Build policy duration always calculated as per start date and end/expiry date
function buildDuration(startDate, expiryDate) {
  const d1 = parseDurationDate(startDate);
  const d2 = parseDurationDate(expiryDate);
  if (!d1 || !d2 || d2 <= d1) return "";

  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const effectiveDays = diffDays >= 30 ? diffDays + 1 : diffDays;

  const months = Math.round(effectiveDays / 30.4375);
  if (months < 1) return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
  if (months >= 12 && months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} month${months === 1 ? "" : "s"}`;
}

// Start of normalizeWarehouseDate
function normalizeWarehouseDate(value = "") {
  const text = String(value || "").trim();
  const numeric = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (numeric) {
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    return `${numeric[1].padStart(2, "0")}/${numeric[2].padStart(2, "0")}/${year}`;
  }

  const named = text.match(/^(\d{1,2})-([A-Z]{3})-(\d{2,4})$/i);
  if (named) {
    const monthStr = named[2].toUpperCase();
    const monthNum = monthMap[monthStr] ? String(monthMap[monthStr]).padStart(2, "0") : "01";
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    return `${named[1].padStart(2, "0")}/${monthNum}/${year}`;
  }

  return text;
}

module.exports = {
  buildDuration,
  normalizeWarehouseDate,
};
