import insuranceCompanyMaster from "../master/insurance-companies.cjs";

const {
  INSURANCE_COMPANY_MASTER,
  normalizeCompanyToken,
  normalizeInsuranceCompanyName,
} = insuranceCompanyMaster;

const RENEWAL_SHORT_ALIASES = new Map(
  [
    ["Future", "Generali Central Insurance Company Limited"],
    ["HDFC", "HDFC ERGO General Insurance Company Limited"],
    ["ICICI", "ICICI Lombard General Insurance Company Limited"],
    ["IFFCO", "IFFCO Tokio General Insurance Company Limited"],
    ["Reliance", "Reliance General Insurance Company Limited"],
    ["Reliance General", "Reliance General Insurance Company Limited"],
    ["Shriram", "Shriram General Insurance Company Limited"],
    ["Shriram General", "Shriram General Insurance Company Limited"],
    ["Shriram General Insurance Company Limited", "Shriram General Insurance Company Limited"],
    ["UNITED", "United India Insurance Company Limited"],
    ["UNITED INDIA", "United India Insurance Company Limited"],
  ].map(([alias, company]) => [normalizeCompanyToken(alias), company]),
);

export function normalizeRenewalInsuranceCompany(value = "") {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  return RENEWAL_SHORT_ALIASES.get(normalizeCompanyToken(raw)) || normalizeInsuranceCompanyName(raw) || raw;
}

const COMPANY_DISPLAY_SHORT_NAMES = new Map([
  ["IFFCO Tokio General Insurance Company Limited", "IFFCO Tokio"],
  ["The New India Assurance Company Limited", "New India"],
  ["Go Digit General Insurance Limited", "Digit"],
  ["ICICI Lombard General Insurance Company Limited", "ICICI Lombard"],
  ["Tata AIG General Insurance Company Limited", "Tata AIG"],
  ["Bajaj Allianz General Insurance Company Limited", "Bajaj Allianz"],
  ["HDFC ERGO General Insurance Company Limited", "HDFC ERGO"],
  ["Royal Sundaram General Insurance Company Limited", "Royal Sundaram"],
  ["United India Insurance Company Limited", "United India"],
  ["National Insurance Company Limited", "National Insurance"],
  ["The Oriental Insurance Company Limited", "Oriental Insurance"],
  ["Reliance General Insurance Company Limited", "Reliance General"],
  ["Shriram General Insurance Company Limited", "Shriram General"],
  ["SBI General Insurance Company Limited", "SBI General"],
  ["Cholamandalam MS General Insurance Company Limited", "Chola MS"],
  ["Universal Sompo General Insurance Company Limited", "Universal Sompo"],
  ["Star Health and Allied Insurance Company Limited", "Star Health"],
  ["Niva Bupa Health Insurance Company Limited", "Niva Bupa"],
  ["Care Health Insurance Limited", "Care Health"],
  ["Magma HDI General Insurance Company Limited", "Magma HDI"],
  ["Generali Central Insurance Company Limited", "Future Generali"],
  ["Future Generali India Insurance Company Limited", "Future Generali"],
  ["Liberty General Insurance Limited", "Liberty"],
  ["Kotak Mahindra General Insurance Company Limited", "Kotak General"],
  ["Raheja QBE General Insurance Company Limited", "Raheja QBE"],
  ["Zuno General Insurance Limited", "Zuno"],
]);

export function getShortCompanyDisplay(value = "") {
  const canonical = normalizeRenewalInsuranceCompany(value);
  if (!canonical) return String(value || "").trim();

  if (COMPANY_DISPLAY_SHORT_NAMES.has(canonical)) {
    return COMPANY_DISPLAY_SHORT_NAMES.get(canonical);
  }

  const cleaned = canonical
    .replace(
      /\b(General\s+Insurance\s+(?:Company\s+)?Limited|General\s+Insurance\s+Co\.?\s*Ltd\.?|Insurance\s+Company\s+Limited|Insurance\s+Co\.?\s*Ltd\.?|Company\s+Limited|Co\.?\s*Ltd\.?|Limited|Ltd\.?)\b/gi,
      "",
    )
    .replace(/^The\s+/i, "")
    .trim();

  return cleaned || canonical;
}

export function getRenewalCompanyFilterTerms(value = "All") {
  if (!value || value === "All") return "";

  const canonical = normalizeRenewalInsuranceCompany(value);
  const masterCompany = INSURANCE_COMPANY_MASTER.find((company) => company.name === canonical);
  const shortAliases = [...RENEWAL_SHORT_ALIASES.entries()]
    .filter(([, company]) => company === canonical)
    .map(([alias]) => alias);

  return [...new Set([canonical, ...(masterCompany?.aliases || []), ...shortAliases])].join("|||");
}

export function withRenewalCompanyDisplay(policy = {}) {
  const canonical = normalizeRenewalInsuranceCompany(policy.insuranceCompany || policy.selectedCompany);
  const shortName = getShortCompanyDisplay(canonical);

  return {
    ...policy,
    canonicalInsuranceCompany: canonical,
    displayInsuranceCompany: shortName,
    insuranceCompany: shortName || canonical,
    ...(policy.renewedInsuranceCompany
      ? {
          renewedCanonicalInsuranceCompany: normalizeRenewalInsuranceCompany(policy.renewedInsuranceCompany),
          renewedInsuranceCompany: getShortCompanyDisplay(policy.renewedInsuranceCompany) || policy.renewedInsuranceCompany,
        }
      : {}),
  };
}

export function consolidateRenewalCompanyStats(rows = [], companyKey = "company") {
  const grouped = new Map();

  for (const row of rows) {
    const company = normalizeRenewalInsuranceCompany(row?.[companyKey]) || "Other";
    const key = normalizeCompanyToken(company) || "other";
    const aggregate = grouped.get(key) || { [companyKey]: company };

    for (const [field, value] of Object.entries(row || {})) {
      if (field !== companyKey && typeof value === "number" && Number.isFinite(value)) {
        aggregate[field] = Number(aggregate[field] || 0) + value;
      } else if (field !== companyKey && !(field in aggregate)) {
        aggregate[field] = value;
      }
    }
    grouped.set(key, aggregate);
  }

  return [...grouped.values()];
}
