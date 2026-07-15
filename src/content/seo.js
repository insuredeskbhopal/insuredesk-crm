import { MARKETING_PAGES } from "./marketing";

export const SITE_URL = "https://bimaheadquarter.com";
export const SITE_NAME = "Bima Headquarter";
export const SITE_TITLE = "Bima Headquarter | Trusted Insurance Consultancy in India";
export const SITE_DESCRIPTION =
  "Bima Headquarter is a trusted insurance consultancy helping individuals and businesses across India with Motor, Health, Life, Commercial, Fire, Marine and Claims Assistance.";

export const BRAND_KEYWORDS = [
  "Bima Headquarter",
  "BimaHeadquarter",
  "bimaheadquarter",
  "Bima Headquarter insurance consultancy",
  "Bima Headquarter Bhopal",
  "Bima Headquarter by InsureDesk",
  "InsureDesk IMF Pvt. Ltd.",
  "InsureDesk",
];

export const CORE_SERVICE_KEYWORDS = [
  "insurance consultant",
  "insurance advisor",
  "insurance consulting India",
  "insurance consultant Bhopal",
  "insurance advisor Bhopal",
  "insurance claim assistance",
  "insurance claim support",
  "policy renewal assistance",
  "risk advisory services",
  "commercial insurance consultant",
];

export const INSURANCE_TYPE_KEYWORDS = [
  "motor insurance",
  "car insurance",
  "bike insurance",
  "commercial vehicle insurance",
  "fleet insurance",
  "health insurance",
  "family health insurance",
  "group health insurance",
  "life insurance",
  "term insurance",
  "fire insurance",
  "warehouse insurance",
  "godown insurance",
  "stock insurance",
  "marine insurance",
  "transit insurance",
  "business insurance",
  "commercial insurance",
];

export const CLAIM_ISSUE_KEYWORDS = [
  "insurance claim rejected",
  "claim settlement delayed",
  "claim documents required",
  "insurance company not responding",
  "cashless claim denied",
  "health insurance claim rejected",
  "motor claim rejected",
  "fire insurance claim assistance",
  "warehouse fire claim support",
  "marine cargo claim assistance",
  "commercial insurance claim help",
  "claim settlement consultant",
  "claim documentation assistance",
  "rejected claim review",
  "insurance dispute assistance",
  "car insurance claim rejected",
];

export const PERSONA_KEYWORDS = [
  "insurance for warehouse owner",
  "insurance for transporter",
  "insurance for fleet owner",
  "insurance for business owner",
  "insurance for shop owner",
  "insurance for factory owner",
  "insurance for MSME",
  "insurance for startup",
  "insurance for family",
  "insurance for parents",
];

export const INDUSTRY_KEYWORDS = [
  "warehouse stock insurance",
  "cold storage insurance",
  "rice mill insurance",
  "logistics insurance",
  "transport business insurance",
  "fleet risk insurance",
  "cargo transit insurance",
  "retail shop insurance",
  "office package policy",
  "MSME insurance",
  "factory insurance",
  "manufacturing insurance",
  "godown stock protection",
];

export const QUESTION_KEYWORDS = [
  "which insurance is best for warehouse",
  "how to file insurance claim",
  "what documents are required for insurance claim",
  "why insurance claim is rejected",
  "how to renew expired policy",
  "can rejected insurance claim be reopened",
  "how to choose health insurance",
  "how much warehouse insurance is required",
  "what is fire insurance for warehouse",
  "what is marine cargo insurance",
  "how to claim commercial vehicle insurance",
  "insurance claim rejected what to do",
];

export const LOCATION_KEYWORDS = [
  "insurance consultant near me",
  "insurance advisor near me",
  "claim assistance near me",
  "insurance office Bhopal",
  "insurance consultant Madhya Pradesh",
  "insurance advisor Madhya Pradesh",
  "claim assistance Bhopal",
  "policy renewal Bhopal",
  "warehouse insurance Bhopal",
  "commercial insurance Bhopal",
  "motor insurance Bhopal",
  "health insurance Bhopal",
  "insurance consultant Indore",
  "insurance consultant Jabalpur",
  "insurance consultant Gwalior",
  "insurance consultant Delhi",
  "insurance consultant Mumbai",
];

export const INSURER_KEYWORDS = [
  "ICICI Lombard claim assistance",
  "HDFC ERGO claim assistance",
  "Tata AIG claim assistance",
  "IFFCO Tokio claim assistance",
  "New India Assurance claim support",
  "Bajaj Allianz claim assistance",
  "Royal Sundaram claim assistance",
  "Future Generali claim assistance",
  "Go Digit claim support",
  "United India claim assistance",
  "Oriental Insurance claim assistance",
  "National Insurance claim assistance",
];

export const COMMERCIAL_INTENT_KEYWORDS = [
  "best insurance consultant",
  "best insurance advisor",
  "compare insurance policy",
  "affordable insurance premium",
  "lowest premium insurance",
  "best warehouse insurance policy",
  "best health insurance consultant",
  "best motor insurance consultant",
  "business insurance quotation",
  "commercial insurance quotation",
  "insurance premium comparison",
  "expert insurance claim consultant",
];

export const LONG_TAIL_KEYWORDS = [
  "warehouse fire insurance claim assistance in India",
  "commercial vehicle insurance renewal support",
  "health insurance cashless claim denied help",
  "business insurance consultant for MSME in India",
  "marine cargo insurance claim documentation support",
  "fire insurance policy for warehouse stock",
  "claim assistance for policy bought from another agent",
  "insurance consultant for family and business protection",
  "corporate insurance advisory and claim support",
  "professional claim assistance for commercial losses",
];

export const SITE_KEYWORDS = [
  ...new Set([
    ...BRAND_KEYWORDS,
    ...CORE_SERVICE_KEYWORDS,
    ...INSURANCE_TYPE_KEYWORDS,
    ...CLAIM_ISSUE_KEYWORDS,
    ...PERSONA_KEYWORDS,
    ...INDUSTRY_KEYWORDS,
    ...QUESTION_KEYWORDS,
    ...LOCATION_KEYWORDS,
    ...INSURER_KEYWORDS,
    ...COMMERCIAL_INTENT_KEYWORDS,
    ...LONG_TAIL_KEYWORDS,
  ]),
];

export const PUBLIC_ROUTES = [
  {
    path: "/",
    priority: 1,
    changeFrequency: "weekly",
  },
  ...MARKETING_PAGES.map(({ path, priority, changeFrequency }) => ({
    path,
    priority,
    changeFrequency,
  })),
];

export const PUBLIC_ROUTE_PATHS = PUBLIC_ROUTES.map((route) => route.path);
