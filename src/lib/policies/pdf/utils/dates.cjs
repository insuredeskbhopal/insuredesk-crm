
const { matchGroup } = require("./regex.cjs");

// Start of buildDuration (Lines 3784-3813)
function buildDuration(startDate, expiryDate) {
  if (!startDate || !expiryDate) return "";

  const parseDurationDate = (value) => {
    const text = String(value || "");
    const slashDate = matchGroup(text, /(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (slashDate) {
      const [day, month, year] = slashDate.split("/").map(Number);
      return { day, month, year: year < 100 ? 2000 + year : year };
    }

    const isoMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        day: Number(isoMatch[3]),
      };
    }

    return {};
  };

  const { day: sd, month: sm, year: sy } = parseDurationDate(startDate);
  const { day: ed, month: em, year: ey } = parseDurationDate(expiryDate);
  if (!sd || !sm || !sy || !ed || !em || !ey) return "";
  let months = (ey - sy) * 12 + (em - sm);
  if (months <= 0) months = 1;
  return `${months} month${months === 1 ? "" : "s"}`;
}

// Start of normalizeWarehouseDate (Lines 7543-7572)
function normalizeWarehouseDate(value = "") {
  const text = String(value || "").trim();
  const numeric = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (numeric) {
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    return `${numeric[1].padStart(2, "0")}/${numeric[2].padStart(2, "0")}/${year}`;
  }

  const monthMap = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };
  const named = text.match(/^(\d{1,2})-([A-Z]{3})-(\d{2,4})$/i);
  if (named) {
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    return `${named[1].padStart(2, "0")}/${monthMap[named[2].toUpperCase()] || named[2]}/${year}`;
  }

  return text;
}

// Start of parseRobustDate (Lines 7746-7756)
function parseRobustDate(str) {
  if (!str) return "";
  const match = str.match(/(\d{1,2})[/\s-]?(\d{1,2})[/\s-]?(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3];
    return `${day}/${month}/${year}`;
  }
  return str;
}

module.exports = {
  buildDuration,
  normalizeWarehouseDate,
  parseRobustDate
};
