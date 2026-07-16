const INSURANCE_COMPANY_MASTER = [
  {
    name: "Bajaj Allianz General Insurance Company Limited",
    aliases: [
      "Bajaj Allianz",
      "Bajaj Allianz General Insurance",
      "Bajaj Allianz General Insurance Company Ltd",
      "Bajaj General Insurance Limited",
    ],
    active: true,
  },
  {
    name: "Generali Central Insurance Company Limited",
    aliases: [
      "Future Generali India Insurance Company Limited",
      "Future Generali",
      "Future Generali India Insurance",
      "Future Generali India Insurance Company Ltd",
      "Generali Central",
      "Generali Central Insurance",
      "Generali Central India Insurance",
      "Generali",
    ],
    active: true,
  },
  {
    name: "Go Digit General Insurance Limited",
    aliases: [
      "Go Digit",
      "Go Digit General Insurance Ltd.",
      "Go Digit General Insurance Ltd",
      "Go Digit General Insurance",
      "Digit General Insurance",
      "Digit",
    ],
    active: true,
  },
  {
    name: "HDFC ERGO General Insurance Company Limited",
    aliases: [
      "HDFC ERGO",
      "HDFC Ergo General Insurance",
      "HDFC ERGO General Insurance",
      "HDFC ERGO General Insurance Company Ltd",
    ],
    active: true,
  },
  {
    name: "ICICI Lombard General Insurance Company Limited",
    aliases: [
      "ICICI Lombard",
      "ICICI Lombard General Insurance Co. Ltd.",
      "ICICI Lombard General Insurance Co Ltd",
      "ICICI Lombard General Insurance",
      "ICICI Lombard General Insurance Company Ltd",
    ],
    active: true,
  },
  {
    name: "IFFCO Tokio General Insurance Company Limited",
    aliases: [
      "IFFCO Tokio",
      "IFFCO-TOKIO",
      "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
      "IFFCO TOKIO GENERAL INSURANCE CO. LTD",
      "IFFCO Tokio General Insurance",
      "IFFCO-TOKIO General Insurance Co. Ltd",
      "IFFCO TOKIO GEN INSU. CO. LTD.",
    ],
    active: true,
  },
  {
    name: "Royal Sundaram General Insurance Company Limited",
    aliases: [
      "Royal Sundaram",
      "Royal Sundaram General Insurance",
      "Royal Sundaram General Insurance Co. Limited",
      "Royal Sundaram General Insurance Company Ltd",
    ],
    active: true,
  },
  {
    name: "Tata AIG General Insurance Company Limited",
    aliases: ["TATA AIG", "Tata AIG", "Tata AIG General Insurance", "TATA AIG General Insurance Company Ltd"],
    active: true,
  },
  {
    name: "The New India Assurance Company Limited",
    aliases: [
      "NEW INDIA",
      "New India",
      "New India Assurance",
      "THE NEW INDIA ASSURANCE CO. LTD.",
      "The New India Assurance Co. Ltd.",
      "The New India Assurance Company Ltd",
    ],
    active: true,
  },
  {
    name: "United India Insurance Company Limited",
    aliases: [
      "United India Insurance",
      "United India Insurance Co. Ltd.",
      "United India Insurance Company Ltd",
      "UIIC",
    ],
    active: true,
  },
  {
    name: "Liberty General Insurance Limited",
    aliases: [
      "Liberty",
      "Liberty General Insurance",
      "Liberty General Insurance Ltd",
      "Liberty General Insurance Co. Ltd",
    ],
    active: true,
  },
];

function normalizeCompanyToken(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bco\b/g, "company")
    .replace(/\bltd\b/g, "limited")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function valuesForCompany(company) {
  return [company.name, ...(company.aliases || [])];
}

const COMPANY_LOOKUP = new Map();
for (const company of INSURANCE_COMPANY_MASTER) {
  for (const value of valuesForCompany(company)) {
    COMPANY_LOOKUP.set(normalizeCompanyToken(value), company.name);
  }
}

function normalizeInsuranceCompanyName(value = "", fallbackText = "") {
  const direct = normalizeCompanyToken(value);
  if (COMPANY_LOOKUP.has(direct)) return COMPANY_LOOKUP.get(direct);

  const haystack = normalizeCompanyToken([value, fallbackText].filter(Boolean).join(" "));
  if (!haystack) return String(value || "").trim();

  const candidates = [...COMPANY_LOOKUP.entries()]
    .filter(([alias]) => alias && haystack.includes(alias))
    .sort((a, b) => b[0].length - a[0].length);

  return candidates[0]?.[1] || String(value || "").trim();
}

function isKnownInsuranceCompany(value = "") {
  const normalized = normalizeCompanyToken(value);
  return COMPANY_LOOKUP.has(normalized);
}

function getInsuranceCompanyNames() {
  return INSURANCE_COMPANY_MASTER.filter((company) => company.active).map((company) => company.name);
}

module.exports = {
  INSURANCE_COMPANY_MASTER,
  getInsuranceCompanyNames,
  isKnownInsuranceCompany,
  normalizeCompanyToken,
  normalizeInsuranceCompanyName,
};
