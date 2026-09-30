const iciciLombardMotor = require("./icici-lombard/motor.cjs");
const iciciLombardWc = require("./icici-lombard/wc.cjs");
const iciciLombardPublicLiability = require("./icici-lombard/public-liability.cjs");
const iciciLombardFire = require("./icici-lombard/fire.cjs");
const tataAigWarehouse = require("./tata-aig/warehouse.cjs");
const iciciLombardHealth = require("./icici-lombard/health.cjs");
const hdfcErgoHealth = require("./hdfc-ergo/health.cjs");
const hdfcErgoMotor = require("./hdfc-ergo/motor.cjs");
const unitedIndiaHealth = require("./united-india/health.cjs");
const tataAigHealth = require("./tata-aig/health.cjs");
const careHealthHealth = require("./care-health/health.cjs");
const iffcoTokioMotor = require("./iffco-tokio/motor.cjs");
const tataAigMotor = require("./tata-aig/motor.cjs");
const libertyMotor = require("./liberty/motor.cjs");
const goDigitMotor = require("./go-digit/motor.cjs");
const newIndiaMotor = require("./new-india/motor.cjs");
const bajajAllianzMotor = require("./bajaj-allianz/motor.cjs");
const royalSundaramMotor = require("./royal-sundaram/motor.cjs");
const futureGeneraliMotor = require("./future-generali/motor.cjs");
const unitedIndiaWarehouse = require("./united-india/warehouse.cjs");
const unitedIndiaBurglary = require("./united-india/burglary.cjs");
const unitedIndiaFire = require("./united-india/fire.cjs");
const unitedIndiaFidelity = require("./united-india/fidelity.cjs");
const iffcoTokioNonMotor = require("./iffco-tokio/non-motor.cjs");
const hdfcErgoWc = require("./hdfc-ergo/wc.cjs");
const iciciLombardFidelity = require("./icici-lombard/fidelity.cjs");
const iciciLombardCpm = require("./icici-lombard/cpm.cjs");
const iciciLombardMarine = require("./icici-lombard/marine.cjs");
const iciciLombardGpa = require("./icici-lombard/gpa.cjs");
const newIndiaNonMotor = require("./new-india/non-motor.cjs");
const bajajAllianzFire = require("./bajaj-allianz/fire.cjs");
const tataAigFire = require("./tata-aig/fire.cjs");
const shriramMotor = require("./shriram/motor.cjs");
const bajajAllianzHealth = require("./bajaj-allianz/health.cjs");

const trainers = [
  iciciLombardMotor,
  iciciLombardFire,
  iciciLombardWc,
  iciciLombardPublicLiability,
  iciciLombardFidelity,
  iciciLombardCpm,
  iciciLombardMarine,
  iciciLombardGpa,
  tataAigWarehouse,
  tataAigFire,
  iciciLombardHealth,
  hdfcErgoHealth,
  hdfcErgoMotor,
  hdfcErgoWc,
  unitedIndiaHealth,
  unitedIndiaWarehouse,
  unitedIndiaBurglary,
  unitedIndiaFire,
  unitedIndiaFidelity,
  tataAigHealth,
  careHealthHealth,
  iffcoTokioMotor,
  iffcoTokioNonMotor,
  tataAigMotor,
  libertyMotor,
  goDigitMotor,
  newIndiaMotor,
  newIndiaNonMotor,
  bajajAllianzMotor,
  bajajAllianzFire,
  bajajAllianzHealth,
  royalSundaramMotor,
  futureGeneraliMotor,
  shriramMotor,
];
const protectedScopeFields = [
  "sourceFile",
  "insuranceCompany",
  "companyName",
  "documentCategory",
  "documentFormat",
  "sourceDocumentType",
];

function normalizeInsurer(value = "") {
  const insurer = String(value).trim();
  const known = [
    [/ICICI\s+Lombard/i, "icici-lombard"],
    [/TATA\s*AIG/i, "tata-aig"],
    [/IFFCO\s*[- ]?\s*Tokio/i, "iffco-tokio"],
    [/Bajaj\s*(?:Allianz|General)/i, "bajaj-allianz"],
    [/United\s+India/i, "united-india"],
    [/New\s+India/i, "new-india"],
    [/HDFC\s*ERGO/i, "hdfc-ergo"],
    [/Care\s*Health|Religare/i, "care-health"],
    [/(?:Future\s+)?Generali|Generali\s+Central/i, "future-generali"],
    [/Royal\s+Sundaram/i, "royal-sundaram"],
    [/Shriram/i, "shriram"],
    [/Liberty/i, "liberty"],
    [/(?:Go\s+)?Digit/i, "go-digit"],
  ];
  return known.find(([pattern]) => pattern.test(insurer))?.[1] || slug(insurer);
}

function normalizeCategory(value = "") {
  const category = String(value).trim();
  const known = [
    [/Motor/i, "motor"],
    [/Warehouse/i, "warehouse"],
    [/Fire|Bharat\s+Sookshma|Griha|MSME\s+Suraksha/i, "fire"],
    [/Health/i, "health"],
    [/Marine/i, "marine"],
    [/Burglary/i, "burglary"],
    [/Fidelity/i, "fidelity"],
    [/Public\s+Liability/i, "public-liability"],
    [/Workm(?:e|a)n(?:'s)?\s+Compensation|Employee(?:'s)?\s+Compensation/i, "workmen-compensation"],
  ];
  return known.find(([pattern]) => pattern.test(category))?.[1] || slug(category);
}

function slug(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isIciciLombardFire(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/ICICI\s+Lombard/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Total\s+IDV/i.test(text)) return false;
  return (
    /\b1030\/|\b1015\//.test(text) ||
    /MSME\s+Suraksha\s+Kavach\s+Package\s+Policy|Bharat\s+Sookshma\s+Udyam|Standard\s+Fire\s+and\s+Special\s+Perils/i.test(text)
  );
}

function isIciciLombardWc(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/ICICI\s+Lombard/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Total\s+IDV/i.test(text)) return false;
  if (/\b1030\/|\b1015\//.test(text)) return false;
  return (
    /\b4010\//.test(text) ||
    /IRDAN115CP0017V02201920|EMPLOYEE'?S\s+COMPENSATION\s+INSURANCE/i.test(text)
  );
}

function isIciciLombardPublicLiability(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/ICICI\s+Lombard/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Total\s+IDV/i.test(text)) return false;
  if (/\b1030\/|\b1015\//.test(text)) return false;
  return (
    /Public\s+Liability\s+Insurance\s*\(Industrial\s+Risks\)|IRDAN115CP0015V01201920|Product\s+Code:\s*4008/i.test(text) ||
    (/\b10008\d{7}\b/.test(text) && /Aggregate\s+One\s+Year\s*\(AOY\)/i.test(text))
  );
}

function isIciciLombardHealth(result = {}, context = {}) {
  const insurer = result.insuranceCompany || result.companyName || "";
  if (insurer && !/ICICI\s+Lombard/i.test(insurer)) return false;

  const text = String(context.text || result.sourceText || "");
  if (!/ICICI\s+Lombard/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Goods\s+Carrying|Commercial\s+Vehicle/i.test(text)) return false;
  if (/EMPLOYEE'?S\s+COMPENSATION|Public\s+Liability|MSME\s+Suraksha/i.test(text)) return false;

  return (
    /ELEVATE|ICIHLIP|Complete\s+Health|Health\s+Shield/i.test(text) ||
    (/\bPolicyholder\s+Details\b/i.test(text) && /\bInsured\s+Details\b/i.test(text))
  );
}

function isHdfcErgoHealth(result = {}, context = {}) {
  const insurer = result.insuranceCompany || result.companyName || "";
  if (insurer && !/HDFC\s*ERGO/i.test(insurer)) return false;

  const text = String(context.text || result.sourceText || "");
  if (!/HDFC\s*ERGO/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Total\s+IDV|Cubic\s+Capacity|Engine\s+No|Employees?\s+Compensation|WORKM(?:E|A)N'?S\s+COMPENSATION|\b3114\d{15}\b/i.test(text)) return false;

  return (
    /\bOptima\s+Secure\b/i.test(text) ||
    /\bOptima\s+Restore\b/i.test(text) ||
    /\bmy\s*:\s*health\b/i.test(text) ||
    /\bHealth\s*Suraksha\b/i.test(text) ||
    /\bEnergy\s*\(/i.test(text) ||
    /\bHDFHLIP\d{5}[A-Z]\d{6}\b/i.test(text) ||
    /Health\s+insurance\s+policy\s+reference\s+no/i.test(text) ||
    (/Policy\s+Schedule/i.test(text) && /Health/i.test(text) && /Sum\s+Insured/i.test(text))
  );
}

function isUnitedIndiaHealth(result = {}, context = {}) {
  const insurer = result.insuranceCompany || result.companyName || "";
  if (insurer && !/United\s+India/i.test(insurer)) return false;

  const text = String(context.text || result.sourceText || "");
  const header = text.slice(0, 4000);
  if (!/UNITED\s+INDIA\s+INSURANCE/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Goods\s+Carrying|Commercial\s+Vehicle|Registration\s+No/i.test(header)) return false;

  return /INDIVIDUAL\s+HEALTH\s+INSURANCE|HEALTH\s+POLICY\s+SCHEDULE|UIIHLIP/i.test(header);
}

function isTataAigHealth(result = {}, context = {}) {
  const insurer = result.insuranceCompany || result.companyName || "";
  if (insurer && !/TATA\s*AIG/i.test(insurer)) return false;

  const text = String(context.text || result.sourceText || "");
  if (!/TATA\s*AIG/i.test(text)) return false;
  if (/Auto\s*Secure|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle/i.test(text)) return false;

  return /Medicare|Health\s*AdvantEdge|TATHLIP|Health\s*Card|80\s*D\s*Certi/i.test(text);
}

function isUnitedIndiaFire(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/UNITED\s+INDIA\s+INSURANCE/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying/i.test(text)) return false;
  return /STANDARD\s+FIRE\s+AND\s+SPECIAL\s+PERILS\s+POLICY|FIRE\s+POLICY/i.test(text);
}

function isUnitedIndiaFidelity(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/UNITED\s+INDIA\s+INSURANCE/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying/i.test(text)) return false;
  return /FIDELITY\s*[-–]\s*GROUP\s+UNNAMED\s+POLICY|FIDELITY\s+GUARANTEE/i.test(text);
}

function isIffcoTokioNonMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/IFFCO\s*[- ]?\s*TOKIO/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Goods\s+Carrying\s+Commercial|Passenger\s+Carrying/i.test(text)) return false;
  return /Trade\s+Protector|FLEXI\s+PROPERTY\s+PROTECTOR|BURGLARY\s+AND\s+HOUSE\s+BREAKING|Contractors\s+Plant\s+and\s+Machinery/i.test(text);
}

function isHdfcErgoWc(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/HDFC\s*ERGO/i.test(text)) return false;
  return (
    /Employees?\s+Compensation\s+Insurance|Workm(?:e|a)n'?s\s+Compensation/i.test(text.slice(0, 3000)) ||
    /\b3114\d{15}\b/.test(text)
  );
}

function isIciciLombardFidelity(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (/PRIVATE\s+CAR\s+CERTIFICATE|TWO\s+WHEELER\s+CERTIFICATE|COMMERCIAL\s+VEHICLE\s+CERTIFICATE/i.test(text)) return false;
  if (!/ICICI\s+Lombard/i.test(text)) return false;
  return /FIDELITY|Misc\s*03|\b4003\//i.test(text);
}

function isIciciLombardCpm(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/ICICI\s+Lombard/i.test(text)) return false;
  return /Engg\s*06|Contractors?\s+Plant\s+and\s+Machinery|\b5006\//i.test(text);
}

function isIciciLombardMarine(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/ICICI\s+Lombard/i.test(text)) return false;
  return /Marine\s*01|Marine\s+Cargo|Marine\s+Insurance|\b2001\//i.test(text);
}

function isIciciLombardGpa(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/ICICI\s+Lombard/i.test(text)) return false;
  return /Group\s+Personal\s+Accident|\b4005\//i.test(text);
}

function isNewIndiaNonMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/THE\s+NEW\s+INDIA\s+ASSURANCE/i.test(text)) return false;
  return /Bharat\s+Flexi\s+Griha\s+Raksha|Griha\s+Raksha|PACKAGE\s+INSURANCE\s+POLICY/i.test(text);
}

function isBajajAllianzFire(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/BAJAJ\s*(?:ALLIANZ|GENERAL)/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Passenger\s+Carrying|Motor\s+Package|Motor\s+Policy|Drive\s*Smart/i.test(text)) return false;
  if (/\b(?:Engine\s+No|Chassis\s+No|Registration\s+No|Vehicle\s+Make|Vehicle\s+Model)\b/i.test(text)) return false;
  return /SHOP\s+NON\s+HAZARDOUS/i.test(text) || /OG-\d{2}-\d{4}-4056-\d{8}/i.test(text);
}

function isShriramMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/Shriram\s+General\s+Insurance/i.test(text)) return false;
  return /Certificate\s*cum\s*Policy\s*Schedule|UIN\s*No\.?IRDAN137/i.test(text);
}

function isTataAigFire(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  if (!/TATA\s*AIG/i.test(text)) return false;
  if (/Auto\s*Secure|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Passenger\s+Carrying|Motor\s+Package|Motor\s+Policy/i.test(text)) return false;
  if (/\b(?:Engine\s+No|Chassis\s+No|Registration\s+No|Vehicle\s+Make|Vehicle\s+Model)\b/i.test(text)) return false;
  if (/MPWLC|Warehouse|\bENDORSEMENT\b|change\s+in\s+sum\s+insured/i.test(text)) return false;
  return /Fuel\s+Station|Petrol\s*\/\s*Diesel|5160857616|RACHNA\s+FUELS/i.test(text);
}

function isCareHealth(result = {}, context = {}) {
  const insurer = result.insuranceCompany || result.companyName || "";
  if (insurer && !/Care\s*Health|Religare/i.test(insurer)) return false;

  const text = String(context.text || result.sourceText || "");
  return /Care\s*Health|careinsurance\.com|Religare/i.test(text);
}

function isBajajAllianzHealth(result = {}, context = {}) {
  const insurer = result.insuranceCompany || result.companyName || "";
  if (insurer && !/Bajaj\s*(?:Allianz|General)/i.test(insurer)) return false;

  const text = String(context.text || result.sourceText || "");
  if (!/Bajaj\s*(?:Allianz|General)/i.test(text)) return false;
  if (
    /Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Passenger\s+Carrying|Drive\s*Assure/i.test(
      text,
    )
  ) {
    return false;
  }
  if (/\b(?:Engine\s+No|Chassis\s+No|Registration\s+No|Vehicle\s+Make|Vehicle\s+Model)\b/i.test(text)) {
    return false;
  }
  return /BAJHLGP|Flexi\s+Health\s+Protect|Health\s*Guard|Extra\s*Care|Global\s*Health|Group\s+Policy\s+No|cat-\d/i.test(
    text,
  );
}

function isGoDigitMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  const header = text.slice(0, 3000);
  if (/TATA\s*AIG|tataaig\.com|customersupport@tataaig\.com/i.test(header)) return false;
  if (/HDFC\s*ERGO/i.test(header)) return false;
  if (/Bajaj\s*(?:Allianz|General)/i.test(header)) return false;
  if (/THE\s+NEW\s+INDIA\s+ASSURANCE|NEW\s+INDIA\s+ASSURANCE|newindia\.co\.in/i.test(header)) return false;
  if (/IFFCO\s*[- ]?\s*TOKIO/i.test(header)) return false;
  if (/ICICI\s+Lombard/i.test(header)) return false;
  if (/UNITED\s+INDIA\s+INSURANCE/i.test(header)) return false;
  if (/ROYAL\s+SUNDARAM/i.test(header)) return false;
  if (/FUTURE\s+GENERALI/i.test(header)) return false;
  return (
    /Go\s+Digit|godigit\.com|Digit\s+Two-Wheeler/i.test(header) &&
    /Motor|Two-Wheeler|Private\s+Car|Commercial\s+Vehicle/i.test(result.documentCategory || result.policyType || text)
  );
}

function isRoyalSundaramMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  const category = normalizeCategory(result.documentCategory || result.policyType);
  if (category && category !== "motor") return false;
  const insurer = result.insuranceCompany || result.companyName || "";
  if (insurer && !/Royal\s+Sundaram/i.test(insurer)) return false;
  const header = text.slice(0, 3000);
  const topLines = text.slice(0, 500);
  // Reject if New India is the primary company (appears at top, not just as previous insurer)
  if (/THE\s+NEW\s+INDIA\s+ASSURANCE/i.test(topLines)) return false;
  return (
    /Royal\s+Sundaram\s+General\s+Insurance|ROYAL\s+SUNDARAM\s+INSURANCE|Royal\s+Sundaram\s+Alliance/i.test(header) &&
    /Goods\s+Carrying\s+Vehicle|Commercial\s+Vehicle|Private\s+Car|Two\s+Wheeler|Motor\s+Vehicle|Certificate\s+of\s+Insurance/i.test(text)
  );
}

function isNewIndiaMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  const category = normalizeCategory(result.documentCategory);
  if (category && category !== "motor") return false;
  const insurer = result.insuranceCompany || result.companyName || "";
  if (insurer && /TATA\s*AIG|ICICI\s*Lombard|Bajaj|HDFC\s*ERGO|Shriram|Liberty|Digit|IFFCO|Generali|Royal\s+Sundaram/i.test(insurer)) {
    return false;
  }
  const header = text.slice(0, 3000);
  if (/Future\s+Generali|generalicentral|generali/i.test(header)) return false;
  if (/IFFCO\s*[- ]?\s*TOKIO/i.test(header)) return false;
  if (/Royal\s+Sundaram/i.test(text.slice(0, 500))) return false;
  return (
    /THE\s+NEW\s+INDIA\s+ASSURANCE|NEW\s+INDIA\s+ASSURANCE|newindia\.co\.in/i.test(text) &&
    /Motor|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle/i.test(result.documentCategory || result.policyType || text)
  );
}

function isIffcoTokioMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  const category = normalizeCategory(result.documentCategory || result.policyType);
  if (category && category !== "motor") return false;
  const header = text.slice(0, 3000);
  if (!/IFFCO\s*[- ]?\s*TOKIO|iffcotokio\.co\.in/i.test(header)) return false;
  if (/Future\s+Generali|generali|TATA\s*AIG|tataaig\.com|HDFC\s*ERGO|ICICI\s*Lombard|Bajaj\s*Allianz|Royal\s*Sundaram|Shriram|Go\s*Digit/i.test(header) && !/IFFCO-TOKIO\s+GENERAL\s+INSURANCE/i.test(header)) {
    return false;
  }
  return (
    /COMMERCIAL\s+VEHICLE|TWO\s+WHEELER|PRIVATE\s+CAR|Insured\s+Motor\s+Vehicle|Stand\s*Alone\s*OD|Own\s*Damage\s*only/i.test(text) ||
    /Motor/i.test(result.documentCategory || result.policyType || "")
  );
}

function isTataAigMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  const header = text.slice(0, 3000);
  const category = normalizeCategory(result.documentCategory || result.policyType);
  if (category && category !== "motor") return false;
  if (/ICICI\s*Lombard|icicilombard\.com/i.test(header)) return false;
  if (/HDFC\s*ERGO/i.test(header)) return false;
  if (/Bajaj\s*(?:Allianz|General)/i.test(header)) return false;
  if (/THE\s+NEW\s+INDIA\s+ASSURANCE|NEW\s+INDIA\s+ASSURANCE/i.test(header)) return false;
  return (
    /TATA\s*AIG|tataaig\.com|customersupport@tataaig\.com/i.test(header) &&
    /Auto\s*Secure|Private\s+Car\s+Package\s+Policy|Vehicle\s+Details|Chassis\s+No/i.test(text)
  );
}

function isIciciLombardMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  const header = text.slice(0, 3000);
  const category = normalizeCategory(result.documentCategory || result.policyType);
  if (category && category !== "motor") return false;
  if (!/ICICI\s*Lombard|icicilombard\.com/i.test(header)) return false;
  if (/ELEVATE|ICIHLIP|Complete\s+Health|Health\s+Shield/i.test(header)) return false;
  return (
    /Stand-Alone\s+Own\s+Damage|Own\s+Damage\s+Private\s+Car|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Motor\s+Vehicle|3001\/[A-Z0-9]+|IRDAN115/i.test(
      result.documentCategory || result.policyType || text,
    )
  );
}

function isHdfcErgoMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  const category = normalizeCategory(result.documentCategory || result.policyType);
  if (category && category !== "motor") return false;
  if (!/HDFC\s*ERGO/i.test(text)) return false;
  if (/Optima\s+Secure|Optima\s+Restore|my\s*:\s*health|Health\s*Suraksha/i.test(text)) return false;
  return (
    /Standalone\s+Motor\s+Own\s+Damage|Proposal\s+Form\s+cum\s+Transcript\s+Letter|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Vehicle\s+Details|Total\s+IDV|PMTB\d+/i.test(text)
  );
}

function isBajajAllianzMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  const category = normalizeCategory(result.documentCategory || result.policyType);
  if (category && category !== "motor") return false;
  if (!/Bajaj\s*(?:Allianz|General)/i.test(text)) return false;
  if (/BAJHLGP|Flexi\s+Health\s+Protect|Health\s*Guard|Extra\s*Care|Global\s*Health/i.test(text)) return false;
  return (
    /STANDALONE\s*OWN\s*DAMAGE|Two-Wheeler|Two\s+Wheeler|Private\s+Car|Commercial\s+Vehicle|Vehicle\s+Details|Drive\s+Assure|Certificate\s+of\s+Insurance|OG-\d{2}-\d{4}|Liability\s+Only\s+Policy\s+for\s+Commercial/i.test(text)
  );
}

function isFutureGeneraliMotor(result = {}, context = {}) {
  const text = String(context.text || result.sourceText || "");
  const header = text.slice(0, 3000);
  const category = normalizeCategory(result.documentCategory || result.policyType);
  if (category && category !== "motor") return false;
  if (/ICICI\s*Lombard|TATA\s*AIG|HDFC\s*ERGO|Bajaj\s*Allianz|THE\s+NEW\s+INDIA|IFFCO\s*[- ]?\s*TOKIO|Royal\s+Sundaram/i.test(header)) {
    return false;
  }
  return (
    /\b(?:Future\s+Generali|Generali\s+Central|generalicentral\.com)\b/i.test(header) &&
    /Motor\s+Secure|Motor\s+Protect|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Vehicle\s+Details|Chassis\s+No|132\/\d{2}\/\d{2}/i.test(text)
  );
}

function deriveTrainingScope(result = {}, context = {}) {
  if (isIciciLombardFire(result, context)) {
    return { insurer: "icici-lombard", category: "fire" };
  }
  if (isIciciLombardWc(result, context)) {
    return { insurer: "icici-lombard", category: "workmen-compensation" };
  }
  if (isIciciLombardPublicLiability(result, context)) {
    return { insurer: "icici-lombard", category: "public-liability" };
  }
  if (isIciciLombardFidelity(result, context)) {
    return { insurer: "icici-lombard", category: "fidelity" };
  }
  if (isIciciLombardCpm(result, context)) {
    return { insurer: "icici-lombard", category: "cpm" };
  }
  if (isIciciLombardMarine(result, context)) {
    return { insurer: "icici-lombard", category: "marine" };
  }
  if (isIciciLombardGpa(result, context)) {
    return { insurer: "icici-lombard", category: "gpa" };
  }
  if (isNewIndiaNonMotor(result, context)) {
    return { insurer: "new-india", category: "fire" };
  }
  if (isBajajAllianzFire(result, context)) {
    return { insurer: "bajaj-allianz", category: "fire" };
  }
  if (isTataAigFire(result, context)) {
    return { insurer: "tata-aig", category: "fire" };
  }
  if (isUnitedIndiaFire(result, context)) {
    return { insurer: "united-india", category: "fire" };
  }
  if (isUnitedIndiaFidelity(result, context)) {
    return { insurer: "united-india", category: "fidelity" };
  }
  if (isIffcoTokioNonMotor(result, context)) {
    return { insurer: "iffco-tokio", category: "fire" };
  }
  if (isHdfcErgoWc(result, context)) {
    return { insurer: "hdfc-ergo", category: "workmen-compensation" };
  }
  if (isIciciLombardHealth(result, context)) {
    return { insurer: "icici-lombard", category: "health" };
  }
  if (isIciciLombardMotor(result, context)) {
    return { insurer: "icici-lombard", category: "motor" };
  }
  if (isHdfcErgoHealth(result, context)) {
    return { insurer: "hdfc-ergo", category: "health" };
  }
  if (isHdfcErgoMotor(result, context)) {
    return { insurer: "hdfc-ergo", category: "motor" };
  }
  if (isBajajAllianzHealth(result, context)) {
    return { insurer: "bajaj-allianz", category: "health" };
  }
  if (isBajajAllianzMotor(result, context)) {
    return { insurer: "bajaj-allianz", category: "motor" };
  }
  if (isFutureGeneraliMotor(result, context)) {
    return { insurer: "future-generali", category: "motor" };
  }
  if (isIffcoTokioMotor(result, context)) {
    return { insurer: "iffco-tokio", category: "motor" };
  }
  if (isUnitedIndiaHealth(result, context)) {
    return { insurer: "united-india", category: "health" };
  }
  if (isTataAigHealth(result, context)) {
    return { insurer: "tata-aig", category: "health" };
  }
  if (isCareHealth(result, context)) {
    return { insurer: "care-health", category: "health" };
  }
  if (isRoyalSundaramMotor(result, context)) {
    return { insurer: "royal-sundaram", category: "motor" };
  }
  if (isNewIndiaMotor(result, context)) {
    return { insurer: "new-india", category: "motor" };
  }
  if (isShriramMotor(result, context)) {
    return { insurer: "shriram", category: "motor" };
  }

  const insurer = isTataAigMotor(result, context)
    ? "tata-aig"
    : isGoDigitMotor(result, context)
    ? "go-digit"
    : isNewIndiaMotor(result, context)
      ? "new-india"
      : isFutureGeneraliMotor(result, context)
        ? "future-generali"
        : normalizeInsurer(result.insuranceCompany || result.companyName);
  return {
    insurer,
    category: normalizeCategory(result.documentCategory),
  };
}

function establishTrainingIdentity(result = {}, context = {}) {
  if (isIciciLombardFire(result, context)) {
    return {
      ...result,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Fire Insurance",
      documentFormat: "ICICI_LOMBARD_FIRE_V1",
      sourceDocumentType: "ICICI_LOMBARD_FIRE_V1",
    };
  }
  if (isIciciLombardWc(result, context)) {
    return {
      ...result,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Workmen Compensation",
      documentFormat: "ICICI_LOMBARD_WC_V1",
      sourceDocumentType: "ICICI_LOMBARD_WC_V1",
    };
  }
  if (isIciciLombardPublicLiability(result, context)) {
    return {
      ...result,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Public Liability",
      documentFormat: "ICICI_LOMBARD_PLI_V1",
      sourceDocumentType: "ICICI_LOMBARD_PLI_V1",
    };
  }
  if (isIciciLombardFidelity(result, context)) {
    return {
      ...result,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Fidelity Insurance",
      documentFormat: "ICICI_LOMBARD_FIDELITY_V1",
      sourceDocumentType: "ICICI_LOMBARD_FIDELITY_V1",
    };
  }
  if (isIciciLombardCpm(result, context)) {
    return {
      ...result,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Contractors Plant & Machinery",
      documentFormat: "ICICI_LOMBARD_CPM_V1",
      sourceDocumentType: "ICICI_LOMBARD_CPM_V1",
    };
  }
  if (isIciciLombardMarine(result, context)) {
    return {
      ...result,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Marine Insurance",
      documentFormat: "ICICI_LOMBARD_MARINE_V1",
      sourceDocumentType: "ICICI_LOMBARD_MARINE_V1",
    };
  }
  if (isIciciLombardGpa(result, context)) {
    return {
      ...result,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Group Personal Accident",
      documentFormat: "ICICI_LOMBARD_GPA_V1",
      sourceDocumentType: "ICICI_LOMBARD_GPA_V1",
    };
  }
  if (isNewIndiaNonMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "The New India Assurance Company Limited",
      companyName: "The New India Assurance Company Limited",
      documentCategory: "Fire Insurance",
      documentFormat: "NEW_INDIA_NON_MOTOR_V1",
      sourceDocumentType: "NEW_INDIA_NON_MOTOR_V1",
    };
  }
  if (isBajajAllianzFire(result, context)) {
    return {
      ...result,
      insuranceCompany: "Bajaj Allianz General Insurance Company Limited",
      companyName: "Bajaj Allianz General Insurance Company Limited",
      documentCategory: "Fire Insurance",
      documentFormat: "BAJAJ_ALLIANZ_FIRE_V1",
      sourceDocumentType: "BAJAJ_ALLIANZ_FIRE_V1",
    };
  }
  if (isTataAigFire(result, context)) {
    return {
      ...result,
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      companyName: "Tata AIG General Insurance Company Limited",
      documentCategory: "Fire Insurance",
      documentFormat: "TATA_AIG_FIRE_V1",
      sourceDocumentType: "TATA_AIG_FIRE_V1",
    };
  }
  if (isUnitedIndiaFire(result, context)) {
    return {
      ...result,
      insuranceCompany: "United India Insurance Company Limited",
      companyName: "United India Insurance Company Limited",
      documentCategory: "Fire Insurance",
      documentFormat: "UNITED_INDIA_FIRE_V1",
      sourceDocumentType: "UNITED_INDIA_FIRE_V1",
    };
  }
  if (isUnitedIndiaFidelity(result, context)) {
    return {
      ...result,
      insuranceCompany: "United India Insurance Company Limited",
      companyName: "United India Insurance Company Limited",
      documentCategory: "Fidelity Insurance",
      documentFormat: "UNITED_INDIA_FIDELITY_V1",
      sourceDocumentType: "UNITED_INDIA_FIDELITY_V1",
    };
  }
  if (isIffcoTokioNonMotor(result, context)) {
    const text = String(context.text || result.sourceText || "");
    const category = /BURGLARY\s+AND\s+HOUSE\s+BREAKING|BURGLARY\s+FIRST\s+LOSS/i.test(text)
      ? "Burglary Insurance"
      : /Contractors\s+Plant\s+and\s+Machinery/i.test(text)
      ? "Contractors Plant & Machinery"
      : "Fire Insurance";
    return {
      ...result,
      insuranceCompany: "IFFCO Tokio General Insurance Company Limited",
      companyName: "IFFCO Tokio General Insurance Company Limited",
      documentCategory: category,
      documentFormat: "IFFCO_TOKIO_NON_MOTOR_V1",
      sourceDocumentType: "IFFCO_TOKIO_NON_MOTOR_V1",
    };
  }
  if (isHdfcErgoWc(result, context)) {
    return {
      ...result,
      insuranceCompany: "HDFC ERGO General Insurance Company Limited",
      companyName: "HDFC ERGO General Insurance Company Limited",
      documentCategory: "Workmen Compensation",
      documentFormat: "HDFC_ERGO_WC_V1",
      sourceDocumentType: "HDFC_ERGO_WC_V1",
    };
  }
  if (isIciciLombardHealth(result, context)) {
    return {
      ...result,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Health Insurance",
      documentFormat: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
      sourceDocumentType: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
    };
  }
  if (isIciciLombardMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      companyName: "ICICI Lombard General Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "ICICI_LOMBARD_MOTOR_V1",
      sourceDocumentType: "ICICI_LOMBARD_MOTOR_V1",
    };
  }
  if (isHdfcErgoHealth(result, context)) {
    return {
      ...result,
      insuranceCompany: "HDFC ERGO General Insurance Company Limited",
      companyName: "HDFC ERGO General Insurance Company Limited",
      documentCategory: "Health Insurance",
      documentFormat: "HDFC_ERGO_HEALTH_OPTIMA_SECURE_V1",
      sourceDocumentType: "HDFC_ERGO_HEALTH_OPTIMA_SECURE_V1",
    };
  }
  if (isUnitedIndiaHealth(result, context)) {
    return {
      ...result,
      insuranceCompany: "United India Insurance Company Limited",
      companyName: "United India Insurance Company Limited",
      documentCategory: "Health Insurance",
      documentFormat: "UNITED_INDIA_HEALTH_V1",
      sourceDocumentType: "UNITED_INDIA_HEALTH_V1",
    };
  }
  if (isTataAigHealth(result, context)) {
    return {
      ...result,
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      companyName: "Tata AIG General Insurance Company Limited",
      documentCategory: "Health Insurance",
      documentFormat: "TATA_AIG_HEALTH_V1",
      sourceDocumentType: "TATA_AIG_HEALTH_V1",
    };
  }
  if (isCareHealth(result, context)) {
    return {
      ...result,
      insuranceCompany: "Care Health Insurance Limited",
      companyName: "Care Health Insurance Limited",
      documentCategory: "Health Insurance",
      documentFormat: "CARE_HEALTH_V1",
      sourceDocumentType: "CARE_HEALTH_V1",
    };
  }
  if (isBajajAllianzHealth(result, context)) {
    return {
      ...result,
      insuranceCompany: "Bajaj Allianz General Insurance Company Limited",
      companyName: "Bajaj Allianz General Insurance Company Limited",
      documentCategory: "Health Insurance",
      documentFormat: "BAJAJ_ALLIANZ_HEALTH_V1",
      sourceDocumentType: "BAJAJ_ALLIANZ_HEALTH_V1",
    };
  }
  if (isGoDigitMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "Go Digit General Insurance Limited",
      companyName: "Go Digit General Insurance Limited",
    };
  }
  if (isTataAigMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "Tata AIG General Insurance Company Limited",
      companyName: "Tata AIG General Insurance Company Limited",
      documentCategory: "Motor Insurance",
    };
  }
  if (isRoyalSundaramMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "Royal Sundaram General Insurance Co. Limited",
      companyName: "Royal Sundaram General Insurance Co. Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "ROYAL_SUNDARAM_MOTOR_V2",
      sourceDocumentType: "ROYAL_SUNDARAM_MOTOR_V2",
    };
  }
  if (isShriramMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "Shriram General Insurance Company Limited",
      companyName: "Shriram General Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "SHRIRAM_MOTOR_V1",
      sourceDocumentType: "SHRIRAM_MOTOR_V1",
    };
  }
  if (isNewIndiaMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "The New India Assurance Company Limited",
      companyName: "The New India Assurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "NEW_INDIA_MOTOR_V1",
      sourceDocumentType: "NEW_INDIA_MOTOR_V1",
    };
  }
  if (isHdfcErgoMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "HDFC ERGO General Insurance Company Limited",
      companyName: "HDFC ERGO General Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "HDFC_ERGO_MOTOR_V1",
      sourceDocumentType: "HDFC_ERGO_MOTOR_V1",
    };
  }
  if (isBajajAllianzMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "Bajaj Allianz General Insurance Company Limited",
      companyName: "Bajaj Allianz General Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "BAJAJ_ALLIANZ_MOTOR_V1",
      sourceDocumentType: "BAJAJ_ALLIANZ_MOTOR_V1",
    };
  }
  if (isIffcoTokioMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "IFFCO Tokio General Insurance Company Limited",
      companyName: "IFFCO Tokio General Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "IFFCO_TOKIO_MOTOR_V1",
      sourceDocumentType: "IFFCO_TOKIO_MOTOR_V1",
    };
  }
  if (isFutureGeneraliMotor(result, context)) {
    return {
      ...result,
      insuranceCompany: "Future Generali India Insurance Company Limited",
      companyName: "Future Generali India Insurance Company Limited",
      documentCategory: "Motor Insurance",
      documentFormat: "FUTURE_GENERALI_MOTOR_V1",
      sourceDocumentType: "FUTURE_GENERALI_MOTOR_V1",
    };
  }
  return result;
}

function selectScopedTraining(result = {}, context = {}) {
  const scope = deriveTrainingScope(result, context);
  if (!scope.insurer || !scope.category) return [];
  return trainers.filter((trainer) => {
    if (trainer.scope.insurer !== scope.insurer || trainer.scope.category !== scope.category) return false;
    try {
      return !trainer.matches || trainer.matches({ result: clone(result), ...context });
    } catch {
      return false;
    }
  });
}

function clone(value) {
  return typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function protectScopeIdentity(candidate, original) {
  for (const field of protectedScopeFields) {
    if (Object.prototype.hasOwnProperty.call(original, field)) candidate[field] = original[field];
    else delete candidate[field];
  }
  return candidate;
}

function applyScopedTraining(result, context = {}) {
  if (!result || typeof result !== "object") return result;

  const scopedResult = establishTrainingIdentity(result, context);
  return selectScopedTraining(scopedResult, context).reduce((current, trainer) => {
    try {
      const working = clone(current);
      const patch = trainer.train({ result: working, ...context }) || {};
      const changes = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
      return protectScopeIdentity({ ...working, ...changes }, current);
    } catch (error) {
      return {
        ...current,
        extractionTrainingWarnings: [
          ...(current.extractionTrainingWarnings || []),
          `${trainer.scope.insurer}/${trainer.scope.category}: ${error?.message || String(error)}`,
        ],
      };
    }
  }, scopedResult);
}

module.exports = {
  trainers,
  deriveTrainingScope,
  selectScopedTraining,
  applyScopedTraining,
};
