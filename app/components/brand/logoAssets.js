export const INSURER_LOGOS = [
  {
    name: "HDFC ERGO",
    src: "/logo/hdfc-ergo-general-insurance.svg",
    aliases: ["hdfc ergo", "hdfc ergo general insurance"],
  },
  {
    name: "ICICI Lombard",
    src: "/logo/icici-lombard-general-insurance.svg",
    aliases: ["icici lombard"],
  },
  {
    name: "IFFCO Tokio",
    src: "/logo/iffco-tokio-general-insurance.svg",
    aliases: ["iffco tokio", "iffco-tokio"],
  },
  {
    name: "TATA AIG",
    src: "/logo/tata-aig-general-insurance.png",
    aliases: ["tata aig", "tata-aig"],
  },
  {
    name: "New India Assurance",
    src: "/logo/new-india-assurance.svg",
    aliases: ["new india", "the new india assurance"],
  },
  {
    name: "United India Insurance",
    src: "/logo/united-india-insurance-company.svg",
    aliases: ["united india"],
  },
  {
    name: "Bajaj Allianz",
    src: "/logo/bajaj-allianz-general-insurance.svg",
    aliases: ["bajaj allianz"],
  },
  {
    name: "Royal Sundaram",
    src: "/logo/royal-sundaram-general-insurance.png",
    aliases: ["royal sundaram", "royal-sundaram"],
  },
  {
    name: "Future Generali",
    src: "/logo/future-generali-logo.png",
    aliases: ["future generali", "generali central", "generali"],
  },
];

export function getInsurerLogo(companyName = "") {
  const normalized = String(companyName || "").toLowerCase();
  if (!normalized) return null;
  return INSURER_LOGOS.find((logo) => logo.aliases.some((alias) => normalized.includes(alias))) || null;
}
