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
    ["UNITED", "United India Insurance Company Limited"],
  ].map(([alias, company]) => [normalizeCompanyToken(alias), company]),
);

export function normalizeRenewalInsuranceCompany(value = "") {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  return RENEWAL_SHORT_ALIASES.get(normalizeCompanyToken(raw)) || normalizeInsuranceCompanyName(raw) || raw;
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
  return {
    ...policy,
    insuranceCompany: normalizeRenewalInsuranceCompany(policy.insuranceCompany || policy.selectedCompany),
    ...(policy.renewedInsuranceCompany
      ? { renewedInsuranceCompany: normalizeRenewalInsuranceCompany(policy.renewedInsuranceCompany) }
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
