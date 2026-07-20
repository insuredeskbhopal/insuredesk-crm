const INVALID_CUSTOMER_NAMES = new Set([
  "valued customer",
  "dear customer",
  "customer",
  "insured",
  "policy holder",
  "policyholder",
  "policyholder name",
  "applicant",
  "client",
  "unknown",
  "na",
  "n/a",
  "nil",
  "none",
  "*",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCustomerName(value) {
  const name = String(value || "").replace(/\s+/g, " ").trim();
  if (!name) return "";
  const comparison = name.toLowerCase().replace(/[.,:;!?]+$/g, "").trim();
  return INVALID_CUSTOMER_NAMES.has(comparison) || UUID_PATTERN.test(name) || !/\p{L}/u.test(name) ? "" : name;
}

export function resolvePolicyCustomerName(...sources) {
  for (const source of sources) {
    if (!source) continue;
    if (typeof source === "string") {
      const name = normalizeCustomerName(source);
      if (name) return name;
      continue;
    }

    for (const key of [
      "contactPerson",
      "contactPersonName",
      "customerName",
      "insuredName",
      "Contact person name",
      "Contact Person Name",
      "Contact Person",
      "Insured Name",
    ]) {
      const name = normalizeCustomerName(source[key]);
      if (name) return name;
    }
  }
  return "";
}

export function buildPolicyCustomerNameFields(...sources) {
  const name = resolvePolicyCustomerName(...sources);
  return {
    contactPersonName: name || null,
    renewalRecipientName: name || null,
  };
}
