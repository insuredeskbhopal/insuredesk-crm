function compactIdentifier(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeText(value) {
  return String(value || "").trim().toUpperCase();
}

const MONTH_INDEX = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function formatDateParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function excelDateToString(value) {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(Math.floor(value - 25569) * 86400000).toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const numericDmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (numericDmy) return formatDateParts(numericDmy[3], numericDmy[2], numericDmy[1]);

  const namedDmy = text.match(/^(\d{1,2})[\s/-]([a-z]{3,9})[\s/-](\d{4})$/i);
  const namedMonth = namedDmy ? MONTH_INDEX[namedDmy[2].slice(0, 3).toLowerCase()] : null;
  if (namedDmy && namedMonth) return formatDateParts(namedDmy[3], namedMonth, namedDmy[1]);

  const parsed = new Date(text);
  if (Number.isNaN(parsed.valueOf())) return text;
  return formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

function buildRenewalImportKey(payload = {}) {
  const expiryDate = String(payload.expiryDate || "").trim();
  const policyNumber = compactIdentifier(payload.policyNumber);
  if (policyNumber) return `policy:${policyNumber}|expiry:${expiryDate}`;

  const vehicleNumber = compactIdentifier(payload.vehicleNumber || payload.registrationNumber);
  const policyType = normalizeText(payload.policyType);
  if (vehicleNumber) return `vehicle:${vehicleNumber}|expiry:${expiryDate}|type:${policyType}`;

  const insuredName = compactIdentifier(payload.insuredName);
  const mobile = compactIdentifier(payload.contactNumber || payload.customerMobile);
  return `customer:${insuredName}|mobile:${mobile}|expiry:${expiryDate}|type:${policyType}`;
}

module.exports = { buildRenewalImportKey, excelDateToString };
