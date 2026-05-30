export const INSURER_LOGOS = [
  {
    name: "HDFC ERGO",
    src: "/logo/hdfc-ergo-general-insurance.svg",
    aliases: ["hdfc ergo", "hdfc ergo general insurance"]
  },
  {
    name: "ICICI Lombard",
    src: "/logo/icici-lombard-general-insurance.svg",
    aliases: ["icici lombard"]
  },
  {
    name: "IFFCO Tokio",
    src: "/logo/iffco-tokio-general-insurance.svg",
    aliases: ["iffco tokio", "iffco-tokio"]
  },
  {
    name: "New India Assurance",
    src: "/logo/new-india-assurance.svg",
    aliases: ["new india", "the new india assurance"]
  },
  {
    name: "National Insurance",
    src: "/logo/national-insurance-company.svg",
    aliases: ["national insurance"]
  },
  {
    name: "Oriental Insurance",
    src: "/logo/oriental-insurance-company.svg",
    aliases: ["oriental insurance", "the oriental insurance"]
  },
  {
    name: "United India Insurance",
    src: "/logo/united-india-insurance-company.svg",
    aliases: ["united india"]
  },
  {
    name: "Bajaj Allianz",
    src: "/logo/bajaj-allianz-general-insurance.svg",
    aliases: ["bajaj allianz"]
  },
  {
    name: "SBI General Insurance",
    src: "/logo/sbi-general-insurance.png",
    aliases: ["sbi general"],
    className: "sbi-general-logo"
  },
  {
    name: "Future Generali",
    src: "/logo/future-generali-logo.png",
    aliases: ["future generali", "generali central", "generali"]
  },
  {
    name: "Reliance General Insurance",
    src: "/logo/reliance-general-insurance.svg",
    aliases: ["reliance general"]
  }
];

export function getInsurerLogo(companyName = "") {
  const normalized = String(companyName || "").toLowerCase();
  if (!normalized) return null;
  return INSURER_LOGOS.find((logo) =>
    logo.aliases.some((alias) => normalized.includes(alias))
  ) || null;
}
