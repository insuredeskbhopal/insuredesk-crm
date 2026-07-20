function compactIdentifier(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function renewalPayload(record = {}) {
  return record.reviewedData || record.data || record;
}

function isBlankImportValue(value) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

const AMOUNT_FIELDS = new Set([
  "idv",
  "netPremium",
  "odPremium",
  "premium",
  "premiumIncludingGst",
  "sumInsured",
  "totalPremium",
]);

function comparableAmount(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

function importValuesEqual(field, currentValue, incomingValue) {
  if (AMOUNT_FIELDS.has(field)) {
    const currentAmount = comparableAmount(currentValue);
    const incomingAmount = comparableAmount(incomingValue);
    if (currentAmount !== null && incomingAmount !== null) return currentAmount === incomingAmount;
  }

  return (
    String(currentValue ?? "")
      .replace(/\s+/g, " ")
      .trim() ===
    String(incomingValue ?? "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function mergeRenewalImportData(current = {}, incoming = {}) {
  const merged = { ...current };
  const changedFields = [];

  for (const [field, value] of Object.entries(incoming)) {
    if (isBlankImportValue(value) || importValuesEqual(field, current[field], value)) continue;
    merged[field] = value;
    changedFields.push(field);
  }

  return { data: merged, changedFields };
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
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

function findRenewalImportMatch(incoming = {}, records = []) {
  const incomingKey = buildRenewalImportKey(incoming);
  const exactMatches = records.filter(
    (record) => buildRenewalImportKey(renewalPayload(record)) === incomingKey,
  );

  if (exactMatches.length === 1) {
    return { status: "matched", matchType: "exact", record: exactMatches[0] };
  }
  if (exactMatches.length > 1) {
    return { status: "ambiguous", matchType: "exact", records: exactMatches };
  }

  const policyNumber = compactIdentifier(incoming.policyNumber);
  if (policyNumber) {
    const incompleteDateMatches = records.filter((record) => {
      const existing = renewalPayload(record);
      return (
        compactIdentifier(existing.policyNumber) === policyNumber &&
        (!String(existing.expiryDate || "").trim() || !String(incoming.expiryDate || "").trim())
      );
    });

    if (incompleteDateMatches.length === 1) {
      return { status: "matched", matchType: "policy-missing-expiry", record: incompleteDateMatches[0] };
    }
    if (incompleteDateMatches.length > 1) {
      return {
        status: "ambiguous",
        matchType: "policy-missing-expiry",
        records: incompleteDateMatches,
      };
    }

    return { status: "new" };
  }

  const vehicleNumber = compactIdentifier(incoming.vehicleNumber || incoming.registrationNumber);
  const expiryDate = String(incoming.expiryDate || "").trim();
  if (vehicleNumber && expiryDate) {
    const vehicleMatches = records.filter((record) => {
      const existing = renewalPayload(record);
      return (
        compactIdentifier(existing.vehicleNumber || existing.registrationNumber) === vehicleNumber &&
        String(existing.expiryDate || "").trim() === expiryDate
      );
    });

    if (vehicleMatches.length === 1) {
      return { status: "matched", matchType: "vehicle-expiry", record: vehicleMatches[0] };
    }
    if (vehicleMatches.length > 1) {
      return { status: "ambiguous", matchType: "vehicle-expiry", records: vehicleMatches };
    }
  }

  return { status: "new" };
}

module.exports = {
  buildRenewalImportKey,
  excelDateToString,
  findRenewalImportMatch,
  mergeRenewalImportData,
};
