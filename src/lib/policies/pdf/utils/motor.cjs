const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("../../../master/insurance-companies.cjs");
const { extractByLabels, matchGroup, escapeRegExp, normalizeHdfcTypedValue } = require("./regex.cjs");
const { normalizeAmount } = require("./amounts.cjs");
const { sliceText, cleanMakeModel, cleanMotorTableMakeModel, cleanHdfcValue } = require("./text.cjs");

// Start of harmonizeMotorCoreFields (Lines 1829-1839)
function harmonizeMotorCoreFields(data = {}) {
  if (!data.vehicleNumber && data.registrationNumber) data.vehicleNumber = data.registrationNumber;
  if (!data.registrationNumber && data.vehicleNumber) data.registrationNumber = data.vehicleNumber;

  const idv = data.idv || data.totalIdv || data.sumInsured;
  if (idv) {
    if (!data.idv) data.idv = idv;
    if (!data.totalIdv) data.totalIdv = idv;
    if (!data.sumInsured) data.sumInsured = idv;
  }
}

// Start of shouldKeepExtractedMotorVariant (Lines 1841-1854)
function shouldKeepExtractedMotorVariant(data = {}, policyUnderstanding = {}, policySchema = {}) {
  const haystack = [
    data.insuranceCompany,
    data.companyName,
    data.sourceFile,
    policyUnderstanding.company,
    policyUnderstanding.insurer,
    policySchema.name,
  ]
    .filter(Boolean)
    .join(" ");

  return /\bnew\s+india\b|\bTATA\s*AIG\b|\bICICI\s+Lombard\b|\bBajaj\s+(?:General|Allianz)\b/i.test(haystack);
}

// Start of shouldKeepExtractedMotorPartyFields (Lines 1856-1858)
function shouldKeepExtractedMotorPartyFields(data = {}) {
  const company = [data.insuranceCompany, data.companyName].filter(Boolean).join(" ");
  return (
    /\bTATA\s*AIG\b/i.test(company) ||
    /Generali\s+Central|Future\s+Generali/i.test(company)
  );
}

// Start of shouldKeepExtractedMotorFinancer (Lines 1860-1865)
function shouldKeepExtractedMotorFinancer(data = {}) {
  if (!data.financerName) return false;
  if (/^(?:NA|N\/A|NIL|NONE)(?:\b|Nominees?$)/i.test(data.financerName)) return false;
  if (/Nominees?$/i.test(data.financerName)) return false;
  // Note: no trailing \b after 'Hypothecat' so 'Hypothecation' is matched correctly
  return /Hypothecat|Hire\s+Purchase|Lease\s+Agreement|Financier/i.test(data.sourceText || "");
}

// Start of normalizeInsuranceCompanyName (Lines 1867-1869)
function normalizeInsuranceCompanyName(value = "", text = "") {
  return normalizeCompanyFromMaster(value, text);
}

// Start of isVerifiedCompanyDocumentFormat (Lines 1871-1879)
function isVerifiedCompanyDocumentFormat(documentFormat = "", text = "") {
  if (!documentFormat || documentFormat === "GENERIC_POLICY_V1") return false;
  if (/HDFC_ERGO/i.test(documentFormat)) return /HDFC\s+ERGO/i.test(text);
  if (/TATA_AIG/i.test(documentFormat)) return /TATA\s*AIG|tataaig\.com/i.test(text);
  if (/GENERALI/i.test(documentFormat)) return /Generali\s+Central|Future\s+Generali/i.test(text);
  if (/IFFCO_TOKIO/i.test(documentFormat)) return /IFFCO[-\s]?TOKIO/i.test(text);
  if (/NEW_INDIA/i.test(documentFormat)) return /\bNew\s+India\s+Assurance\b/i.test(text);
  return true;
}

// Start of isMotorExtraction (Lines 1881-1903)
function isMotorExtraction(data, understanding) {
  if (/Warehouse/i.test(data.documentCategory || data.documentFormat || data.sourceDocumentType || "")) {
    return false;
  }

  const haystack = [
    data.documentCategory,
    data.policyType,
    data.vehicleNumber,
    data.registrationNumber,
    data.engineNumber,
    data.chassisNumber,
    data.makeModel,
    understanding?.documentCategory,
    understanding?.policyType,
  ]
    .filter(Boolean)
    .join(" ");

  return /\b(motor|private\s+car|two\s+wheeler|commercial\s+vehicle|vehicle|chassis|engine)\b/i.test(
    haystack,
  );
}

// Start of extractPaymentCollection (Lines 3001-3006)
function extractPaymentCollection(text) {
  return {
    dueCollection: extractByLabels(text, ["Due Collection", "Due Amount", "Amount Due"], "amount"),
    collectedAmount: extractByLabels(text, ["Collected Amount", "Amount Collected"], "amount"),
  };
}

// Start of extractInsuredGstin (Lines 3232-3243)
function extractInsuredGstin(text) {
  const gstMatches = Array.from(text.matchAll(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/g));
  if (!gstMatches.length) return "";

  for (const match of gstMatches) {
    const before = text.slice(Math.max(0, match.index - 120), match.index);
    if (!/HDFC\s+ERGO|insurer|insurance\s+company/i.test(before)) {
      return match[0];
    }
  }
  return gstMatches[0][0];
}

// Start of extractGstAmount (Lines 3245-3265)
function extractGstAmount(text) {
  const totalLine = text.match(/GST\s*18%[\s\S]{0,140}?\n\s*([0-9,]+(?:\.\d{1,2})?)/i);
  if (totalLine?.[1]) return normalizeAmount(totalLine[1]);

  const taxLine = text.match(
    /Central Tax\s*9%\s*\(`\s*([0-9,]+(?:\.\d{1,2})?)\s*\)\s*\+\s*State Tax\s*9%\s*\(`\s*([0-9,]+(?:\.\d{1,2})?)/i,
  );
  if (taxLine?.[1] || taxLine?.[2]) {
    const total =
      Number(String(taxLine[1] || "0").replace(/,/g, "")) +
      Number(String(taxLine[2] || "0").replace(/,/g, ""));
    return normalizeAmount(String(total));
  }

  const central = normalizeAmount(extractByLabels(text, ["Central Tax"], "amount"));
  const state = normalizeAmount(extractByLabels(text, ["State Tax"], "amount"));
  const centralNumber = Number(String(central || "").replace(/,/g, ""));
  const stateNumber = Number(String(state || "").replace(/,/g, ""));
  if (centralNumber || stateNumber) return normalizeAmount(String(centralNumber + stateNumber));
  return extractByLabels(text, ["GST 18%", "GST Amount", "GST"], "amount");
}

// Start of extractCscContact (Lines 3267-3275)
function extractCscContact(text) {
  const cscIndex = text.search(/CSC\s+(?:Name|Code|Contact)|INSUREDESK\s+IMF/i);
  if (cscIndex === -1) return "";
  const block = text.slice(cscIndex, cscIndex + 600);
  return (
    extractByLabels(block, ["Contact No", "CSC Contact", "Contact Number"], "phone") ||
    matchGroup(block, /\b([6-9]\d{9})\b/)
  );
}

// Start of matchNCB (Lines 3332-3336)
function matchNCB(text) {
  const m = text.match(/No Claim (?:Bonus|Discount)\s*(?:Discount)?\s*\(?\s*(\d{1,2})\s*%\s*\)?/i);
  if (m?.[1]) return m[1] + "%";
  return "";
}

// Start of inferFuelTypeFromVehicleDescription (Lines 3727-3735)
function inferFuelTypeFromVehicleDescription(value = "") {
  const text = String(value || "").toLowerCase();
  if (/\bdiesel\b|\bcrdi\b|\bdci\b|\btdi\b|\bddis\b|\b d\b|\bd\s*(?:at|mt|amt)\b/.test(text)) return "Diesel";
  if (/\bpetrol\b|\bdts-?fi\b|\b vxi\b|\b lxi\b|\b zxi\b/.test(text)) return "Petrol";
  if (/\bcng\b/.test(text)) return "CNG";
  if (/\belectric\b|\bev\b|\bbev\b/.test(text)) return "Electric";
  if (/\blpg\b/.test(text)) return "LPG";
  return "";
}

// Start of inferFuelType (Lines 3737-3747)
function inferFuelType(text, makeModel) {
  const combined = (text + " " + (makeModel || "")).toLowerCase();
  const vehicleFuel = inferFuelTypeFromVehicleDescription(makeModel);
  if (vehicleFuel) return vehicleFuel;
  if (/\bdiesel\b/.test(combined)) return "Diesel";
  if (/\belectric\b|\bev\b|\bbev\b/.test(combined)) return "Electric";
  if (/\bcng\b/.test(combined)) return "CNG";
  if (/\blpg\b/.test(combined)) return "LPG";
  if (/\bpetrol\b|\bgasoline\b|\bdts-?fi\b|\bfi\b/.test(combined)) return "Petrol";
  return "";
}

// Start of extractInsuredName (Lines 3905-3925)
function extractInsuredName(text) {
  const patterns = [
    /(?:^|\n)\s*([A-Z][A-Z .&'-]{2,120}?)\s*Policy\s*#\s*:?/i,
    /(?:^|\n)\s*([A-Z][A-Z .&'-]{2,120}?)\s+Policy\s*#\s*:?/i,
    /Insured's\s+name\s*[:.-]?\s*([\s\S]+?)(?=\s*(?:Unique\s+Invoice|Invoice|Policy No|Address|Phone|Customer|$))/i,
    /Name of the Insured\s*([\s\S]+?)(?=\s*(?:Policy No|Policy\s*#|Address|Phone|Customer|$))/i,
    /following insured:\s*([\s\S]+?)(?=\s*PROP)/i,
    /Insured(?:'s)? Name\s*[:.-]?\s*([\s\S]+?)(?=\s*(?:Policy No|Policy\s*#|Address|Phone|Invoice|Date|GSTIN|Customer|$))/i,
    /Name of Insured\s*[:.-]?\s*([\s\S]+?)(?=\s*(?:Policy No|Policy\s*#|Address|Phone|Invoice|Date|GSTIN|Customer|$))/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      let val = match[1].replace(/\s+/g, " ").trim();
      val = val.replace(/\s*(?:Policy|Address|Phone|Invoice|Date|GSTIN|Customer).*$/i, "");
      if (val.length >= 2) return val;
    }
  }
  return "";
}

// Start of extractPolicyNumber (Lines 3927-3954)
function extractPolicyNumber(text) {
  const p400PolicyNumber = matchGroup(text, /\bP400\s+Policy\s*#\s*:?\s*([A-Z0-9/-]{6,})/i);
  if (p400PolicyNumber) return p400PolicyNumber;

  const patterns = [
    /[Pp][Oo][Ll][Ii][Cc][Yy]\s*#\s*:?\s*([A-Z0-9/-]+[A-Z0-9])/,
    /[Pp][Oo][Ll][Ii][Cc][Yy]\s*(?:[Nn][Oo]|[Nn][Uu][Mm][Bb][Ee][Rr]|[Ss][Cc][Hh][Ee][Dd][Uu][Ll][Ee]\s*[Nn][Oo]|[Ss][Cc][Hh][Ee][Dd][Uu][Ll][Ee]\s*[Nn][Uu][Mm][Bb][Ee][Rr])?\s*[:.-]?\s*([A-Z0-9/.-]{6,})/,
    /[Cc][Ee][Rr][Tt][Ii][Ff][Ii][Cc][Aa][Tt][Ee]\s*(?:[Nn][Oo]|[Nn][Uu][Mm][Bb][Ee][Rr])?\s*[:.-]?\s*([A-Z0-9/.-]{6,})/,
    /attached\s*herewith\s*([A-Z0-9/.-]{10,})\s*which\s*has\s*been\s*issued/,
  ];

  for (const pattern of patterns) {
    const flags = pattern.flags ? (pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g") : "g";
    const matches = text.matchAll(new RegExp(pattern.source, flags));
    for (const match of matches) {
      const val = match[1]?.trim();
      if (val && /\d/.test(val) && !/previous/i.test(val) && !/insurer/i.test(val)) {
        return val;
      }
    }
  }

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

// Start of normalizeRegistrationDisplay (Lines 3989-3993)
function normalizeRegistrationDisplay(value = "") {
  const text = String(value || "").trim();
  if (/^new vehicle$/i.test(text)) return "New Vehicle";
  return text.replace(/\s+/g, "-").replace(/-+/g, "-").toUpperCase().trim();
}

// Start of cleanVehicleCode (Lines 4227-4236)
function cleanVehicleCode(value = "") {
  return String(value || "")
    .replace(
      /(?:MAKE|TYPE\s*OF\s*FUEL|TYPE\s*OF\s*BODY|CUBIC\s*CAPACITY|SEATING\s*CAPACITY|REGISTRATION|YEAR\s*OF\s*MANUFACTURE|NAME\s*OF\s*REGISTRATION\s*AUTHORITY).*$/i,
      "",
    )
    .replace(/[^\w]/g, "")
    .toUpperCase()
    .trim();
}

// Start of extractNewIndiaDenseIdv (Lines 4693-4719)
function extractNewIndiaDenseIdv(text) {
  const block = sliceText(
    text,
    /INSURED\s+DECLARED\s+VALUE/i,
    /(?:SCHEDULE\s+OF\s+PREMIUM|ENHANCED\s+COVER|Cover\s+Description|Page\s+\d+\s+of)/i,
  );
  if (!block) return "";

  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const digits = line.replace(/\D/g, "");
    if (digits.length < 10 || !/[1-9]/.test(digits)) continue;

    for (let width = Math.min(9, Math.floor(digits.length / 2)); width >= 5; width--) {
      const suffix = digits.slice(-width);
      const prefix = digits.slice(0, -width);
      if (/^0+$/.test(suffix)) continue;
      if (prefix.startsWith(suffix) || prefix.endsWith(suffix)) {
        return normalizeAmount(suffix);
      }
    }
  }
  return "";
}

// Start of extractMakeModel (Lines 4769-4805)
function extractMakeModel(text) {
  const manufacturerPattern =
    /Make of Vehicle\s*\n?\s*(?:\d+(?:\.\d+)?\s*)?(?:Package|Comprehensive|Liability|Third Party)?\s*(?:[0-9,.]+\s*)?(?:[^\n]*\n)*?\s*((?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL ENFIELD|KTM|HARLEY|JAWA|BENELLI|APRILIA|KAWASAKI|BMW|DUCATI|TRIUMPH|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)[A-Z0-9 /&.,-]+)/i;
  const m1 = text.match(manufacturerPattern);
  let makeModel = "";
  if (m1?.[1]) {
    makeModel = m1[1].replace(/\s+/g, " ").trim();
  } else {
    makeModel = cleanMakeModel(text);
  }

  if (!makeModel) {
    const labelPatterns = [
      /\bVehicle Make Model(?:\.|:)?\s*([A-Z0-9/&()., -]{3,80})/i,
      /\bMake(?:\s*\/\s*Model)?\s*[:.-]\s*([A-Z0-9/&()., -]{3,80})/i,
      /\bMake(?:\s*\/\s*Model)?(?:\.|:)?\s*([A-Z0-9/&()., -]{3,80})/i,
    ];
    for (const pattern of labelPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        makeModel = match[1].replace(/\s+/g, " ").trim();
        break;
      }
    }
  }

  if (makeModel && makeModel.endsWith("-")) {
    const escaped = makeModel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped + "\\s*\\n\\s*([A-Za-z0-9]+)", "i");
    const matchSuffix = text.match(pattern);
    if (matchSuffix?.[1]) {
      makeModel += matchSuffix[1];
    }
  }

  return makeModel;
}

// Start of extractMfgYear (Lines 4807-4825)
function extractMfgYear(text) {
  const patterns = [
    /\bMfg(?:\.|:)? Year(?:\.|:)?\s*(\d{4})/i,
    /\bManufacturing Year(?:\.|:)?\s*(\d{4})/i,
    /\b[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}(\d{4})\b/i,
    /Year of Manuf\.?\s*\n?[^\d\n]*(\d{4})/i,
    /\bYear\s*(?:of)?\s*(?:Manufacture|Manufacturing|Manuf)(?:\.|:)?\s*(\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const year = parseInt(match[1], 10);
      if (year >= 1980 && year <= 2030) {
        return match[1];
      }
    }
  }
  return "";
}

// Start of extractMotorVehicleTable (Lines 4827-4888)
function extractMotorVehicleTable(text, context = {}) {
  const block = extractMotorVehicleBlock(text);
  if (!block) {
    return {
      registrationNumber: "",
      manufacturingYear: "",
      cubicCapacity: "",
      policyCoverType: "",
      makeModel: "",
      engineNumber: "",
      chassisNumber: "",
      seatingCapacity: "",
      fuelType: "",
      idv: "",
    };
  }

  const iffcoCompressed = extractIffcoCompressedVehicleTable(block);
  if (iffcoCompressed.registrationNumber) return iffcoCompressed;

  const iffcoPrivateCar = extractIffcoDensePrivateCarVehicleTable(block);
  if (iffcoPrivateCar.registrationNumber) return iffcoPrivateCar;

  const compact = block.replace(/\s+/g, " ");
  const dense = compact.replace(/\s/g, "");
  const registrationNumber = extractMotorRegistrationNumber(block);
  const registrationYear = registrationNumber
    ? matchGroup(
        compact,
        new RegExp(`${escapeRegExp(registrationNumber).replace(/[-\\s]/g, "[-\\\\s]?")}\\s*(\\d{4})`, "i"),
      )
    : "";
  const coverMatch =
    dense.match(
      /\b(\d{2,4})(Package|Comprehensive|LiabilityOnly|Liability|ThirdParty|TP|OwnDamage)([0-9]{3,10}(?:\.\d{1,2})?)/i,
    ) || dense.match(/\b(\d{2,4})(Package|Comprehensive|LiabilityOnly|Liability|ThirdParty|TP|OwnDamage)\b/i);
  const policyCoverType = coverMatch?.[2]
    ? normalizeCoverType(coverMatch[2])
    : extractPolicyCoverType(block, context.policyType || "");
  const cubicCapacity =
    coverMatch?.[1] ||
    extractMotorLabelValue(block, ["Cubic Capacity", "Cubic Capacity /Watts", "CC"], "number");
  const makeModel = extractMotorMakeModel(block) || extractMakeModel(block) || cleanMakeModel(block);

  return {
    registrationNumber,
    manufacturingYear: normalizeManufacturingYear(registrationYear) || extractMfgYear(block),
    cubicCapacity,
    policyCoverType,
    makeModel,
    engineNumber: extractEngineNumber(block),
    chassisNumber: extractChassisNumber(block),
    fuelType: "",
    idv: "",
    seatingCapacity: extractSeatingFromVehicleBlock(block, {
      ...context,
      makeModel,
      policyCoverType,
      cubicCapacity,
    }),
  };
}

// Start of extractIffcoCompressedVehicleTable (Lines 4890-5047)
function extractIffcoCompressedVehicleTable(block) {
  if (!/Registration\s+Mark/i.test(block) || !/IFFCO|Insured\s+Motor\s+Vehicle\s+Details/i.test(block)) {
    return { registrationNumber: "" };
  }

  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const regIndex = lines.findIndex((line) => /^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(19\d{2}|20\d{2})$/i.test(line));
  if (regIndex === -1) return { registrationNumber: "" };

  const regMatch = lines[regIndex].match(/^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(19\d{2}|20\d{2})$/i);
  const specLine = lines
    .slice(regIndex + 1, regIndex + 5)
    .find((line) =>
      /^\d{3,5}(?:Package|Comprehensive|Liability|Third\s*Party|Stand\s*Alone\s*OD)/i.test(
        line.replace(/\s+/g, ""),
      ),
    );
  const specMatch = specLine
    ?.replace(/\s+/g, "")
    .match(/^(\d{3,5})(Package|Comprehensive|Liability|ThirdParty|StandAloneOD)([0-9,]+(?:\.\d{1,2})?)?/i);
  if (!regMatch || !specMatch) return { registrationNumber: "" };

  const registrationNumber = regMatch[1].toUpperCase();
  const manufacturingYear = regMatch[2];
  const cubicCapacity = specMatch[1];
  const policyCoverType = normalizeCoverType(specMatch[2]);
  const idv = normalizeAmount(specMatch[3] || "");

  let engineNumber = "";
  let makeModel = "";
  let chassisNumber = "";
  let seatingCapacity = "";
  const chassisLabelIndex = lines.findIndex((line) => /^Chassis\s+No\.?$/i.test(line));

  const beforeReg = lines.slice(Math.max(0, regIndex - 5), regIndex).reverse();
  const vehicleBeforeReg = beforeReg.find((line) =>
    /^(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL\s+ENFIELD|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\b/i.test(
      line,
    ),
  );
  if (vehicleBeforeReg) {
    const compactVehicle = vehicleBeforeReg.replace(/\s+/g, " ").trim();
    const engineMatch = compactVehicle.match(/([A-Z]{2,8}[A-Z0-9]{6,20})$/i);
    if (engineMatch && isPlausibleEngineNumber(engineMatch[1])) {
      engineNumber = engineMatch[1].toUpperCase();
      makeModel = cleanMotorTableMakeModel(compactVehicle.slice(0, -engineMatch[1].length));
    } else {
      makeModel = cleanMotorTableMakeModel(compactVehicle);
    }
  }

  if (!makeModel) {
    const afterSpec = lines.slice(regIndex + 1, Math.min(lines.length, regIndex + 10));
    const makeChassisLine = afterSpec.find(
      (line) =>
        /^(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL\s+ENFIELD|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\b/i.test(
          line,
        ) && /[A-Z0-9]{17}$/i.test(line),
    );
    const makeChassisMatch = makeChassisLine?.match(/^(.+?)([A-Z0-9]{17})$/i);
    if (makeChassisMatch) {
      makeModel = cleanMotorTableMakeModel(makeChassisMatch[1]);
      chassisNumber = makeChassisMatch[2].toUpperCase();
    }
  }

  if (!makeModel && chassisLabelIndex !== -1) {
    const makeLineIndex = lines.findIndex(
      (line, index) =>
        index > chassisLabelIndex &&
        index < chassisLabelIndex + 8 &&
        /^(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL\s+ENFIELD|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\b/i.test(
          line,
        ),
    );
    if (makeLineIndex !== -1) {
      let makeLine = lines[makeLineIndex];
      let engineOffset = 1;
      const suffix = lines[makeLineIndex + 1]?.trim();
      if (
        /-$/.test(makeLine) &&
        /^[A-Za-z0-9]{1,8}$/.test(suffix || "") &&
        !isPlausibleEngineNumber(suffix)
      ) {
        makeLine += suffix;
        engineOffset = 2;
      }
      makeModel = cleanMotorTableMakeModel(makeLine);
      const possibleEngine = lines[makeLineIndex + engineOffset]
        ?.replace(/^[-:.\s]+/, "")
        .trim()
        .toUpperCase();
      const possibleChassis = lines[makeLineIndex + engineOffset + 1]?.trim().toUpperCase();
      if (!engineNumber && isPlausibleEngineNumber(possibleEngine)) engineNumber = possibleEngine;
      if (!chassisNumber && /^[A-Z0-9]{10,25}$/i.test(possibleChassis || "")) chassisNumber = possibleChassis;
    }
  }

  const engineLine = lines
    .slice(Math.max(0, regIndex - 5), Math.min(lines.length, regIndex + 8))
    .map((line) =>
      line
        .replace(/^[-:.\s]+/, "")
        .trim()
        .toUpperCase(),
    )
    .find((line) => isPlausibleEngineNumber(line));
  if (!engineNumber && engineLine) engineNumber = engineLine;

  if (chassisLabelIndex !== -1) {
    for (let i = chassisLabelIndex + 1; i < Math.min(lines.length, chassisLabelIndex + 6); i++) {
      const line = lines[i];
      if (!seatingCapacity && /^([1-9]|[1-7]\d|80)$/.test(line)) {
        seatingCapacity = line;
        continue;
      }
      if (chassisNumber) continue;
      if (
        /^(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL\s+ENFIELD|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\b/i.test(
          line,
        )
      )
        continue;
      if (isPlausibleEngineNumber(line) && /^[A-Z0-9]{10,25}$/i.test(lines[i + 1] || "")) continue;
      const chassisMatch = line.match(/\b([A-Z0-9]{10,25})\b/i);
      if (chassisMatch) {
        chassisNumber = chassisMatch[1].toUpperCase();
        break;
      }
    }
  }

  const totalValueLine = lines.find((line) => /^[0-9,.]+0\.000\.000\.00/i.test(line));
  const totalIdv = totalValueLine
    ? normalizeAmount((totalValueLine.match(/([1-9][0-9]{4,9}\.\d{2})(?=[0-9,.]*[0-9]+\.\d{2}$)/) || [])[1])
    : idv;

  return {
    registrationNumber,
    manufacturingYear,
    cubicCapacity,
    policyCoverType,
    makeModel,
    engineNumber,
    chassisNumber,
    fuelType: inferFuelTypeFromVehicleDescription(makeModel),
    idv: totalIdv || idv,
    seatingCapacity: normalizeSeatingCapacity(seatingCapacity, {
      policyCoverType,
      makeModel,
      cubicCapacity,
      text: block,
    }),
  };
}

// Start of extractIffcoDensePrivateCarVehicleTable (Lines 5049-5127)
function extractIffcoDensePrivateCarVehicleTable(block) {
  const standaloneOd = extractIffcoStandaloneOdVehicleTable(block);
  if (standaloneOd.registrationNumber) return standaloneOd;

  if (
    !/Registration\s+Mark/i.test(block) ||
    !/Type\s+of\s+bodyMake\s+of\s+VehicleCCCoverageIDV/i.test(block)
  ) {
    return { registrationNumber: "" };
  }

  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const rowIndex = lines.findIndex((line) => /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}\d{4}/i.test(line));
  if (rowIndex === -1) return { registrationNumber: "" };

  const rowMatch = lines[rowIndex].match(/^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(\d{4})(.*)$/i);
  if (!rowMatch) return { registrationNumber: "" };

  const registrationNumber = rowMatch[1].toUpperCase();
  const manufacturingYear = normalizeManufacturingYear(rowMatch[2]);
  const makeParts = [rowMatch[3]];
  let specIndex = -1;

  for (let i = rowIndex + 1; i < Math.min(lines.length, rowIndex + 8); i++) {
    if (/^\d{3,4}(?:Package|Comprehensive|Liability|Third\s*Party)/i.test(lines[i])) {
      specIndex = i;
      break;
    }
    makeParts.push(lines[i]);
  }

  if (specIndex === -1) return { registrationNumber: "" };

  const specMatch = lines[specIndex].match(
    /^(\d{3,4})(Package|Comprehensive|Liability|Third\s*Party)([0-9,]+(?:\.\d{1,2})?)?/i,
  );
  const cubicCapacity = specMatch?.[1] || "";
  const policyCoverType = normalizeCoverType(specMatch?.[2] || "");
  let idv = specMatch?.[3] || "";
  if (idv && lines[specIndex + 1] && /^\d{1,3}$/.test(lines[specIndex + 1])) {
    idv += lines[specIndex + 1];
  }

  const vehicleCodeLines = [];
  for (let i = specIndex + 1; i < Math.min(lines.length, specIndex + 8); i++) {
    const line = lines[i];
    if (/^\d{1,2}$/.test(line) && vehicleCodeLines.length) break;
    if (/^[A-Z0-9]{6,25}$/i.test(line) && !/^\d+$/.test(line)) {
      vehicleCodeLines.push(line.toUpperCase());
    }
  }
  const combinedVehicleCode = vehicleCodeLines.join("");
  const chassisNumber = combinedVehicleCode.length >= 17 ? combinedVehicleCode.slice(-17) : "";
  const engineNumber = chassisNumber ? combinedVehicleCode.slice(0, -17) : "";
  const seatingCapacity =
    lines.slice(specIndex + 1, specIndex + 10).find((line) => /^(?:[1-9]|[1-7]\d|80)$/.test(line)) || "";
  const makeModel = cleanMotorTableMakeModel(makeParts.join(" "));

  return {
    registrationNumber,
    manufacturingYear,
    cubicCapacity,
    policyCoverType,
    makeModel,
    engineNumber: isPlausibleEngineNumber(engineNumber) ? engineNumber : "",
    chassisNumber,
    fuelType: inferFuelTypeFromVehicleDescription(makeModel),
    idv: normalizeAmount(idv),
    seatingCapacity: normalizeSeatingCapacity(seatingCapacity, {
      policyCoverType,
      makeModel,
      cubicCapacity,
      text: block,
    }),
  };
}

// Start of extractIffcoStandaloneOdVehicleTable (Lines 5129-5209)
function extractIffcoStandaloneOdVehicleTable(block) {
  if (!/Registration\s+Mark/i.test(block) || !/Stand\s*Alone\s*OD/i.test(block)) {
    return { registrationNumber: "" };
  }

  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const rowIndex = lines.findIndex((line) => /^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(\d{4})$/i.test(line));
  if (rowIndex === -1) return { registrationNumber: "" };

  const rowMatch = lines[rowIndex].match(/^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(\d{4})$/i);
  const specLine = lines.find((line) =>
    /^(\d{3,4})StandAloneOD[0-9,]+(?:\.\d{1,2})?$/i.test(line.replace(/\s+/g, "")),
  );
  const specMatch = specLine?.replace(/\s+/g, "").match(/^(\d{3,4})StandAloneOD([0-9,]+(?:\.\d{1,2})?)$/i);
  if (!rowMatch || !specMatch) return { registrationNumber: "" };

  const engineLine = lines
    .map((line) =>
      line
        .replace(/^[-:.\s]+/, "")
        .trim()
        .toUpperCase(),
    )
    .find((line) => isPlausibleEngineNumber(line));

  let seatingCapacity = "";
  const chassisLabelIndex = lines.findIndex((line) => /^Chassis\s+No\.?$/i.test(line));
  if (chassisLabelIndex !== -1) {
    for (let i = chassisLabelIndex + 1; i < Math.min(lines.length, chassisLabelIndex + 5); i++) {
      if (/^(?:[1-9]|10)$/.test(lines[i])) {
        seatingCapacity = lines[i];
        break;
      }
    }
  }

  let makeModel = "";
  let chassisNumber = "";
  for (const line of lines) {
    const chassisMatch = line.match(/([A-Z0-9]{17})$/i);
    if (!chassisMatch) continue;

    const prefix = line
      .slice(0, line.length - chassisMatch[1].length)
      .replace(/\s+/g, " ")
      .trim();
    if (
      !prefix ||
      !/^(?:ASHOK LEYLAND|MARUTI SUZUKI|ROYAL ENFIELD|MAHINDRA|HYUNDAI|BAJAJ|HONDA|HERO|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA|TVS|YAMAHA|SUZUKI)\b/i.test(
        prefix,
      )
    ) {
      continue;
    }

    makeModel = cleanMotorTableMakeModel(prefix);
    chassisNumber = chassisMatch[1].toUpperCase();
    break;
  }

  return {
    registrationNumber: rowMatch[1].toUpperCase(),
    manufacturingYear: normalizeManufacturingYear(rowMatch[2]),
    cubicCapacity: specMatch[1],
    policyCoverType: "Own Damage",
    makeModel,
    engineNumber: engineLine || "",
    chassisNumber,
    fuelType: inferFuelTypeFromVehicleDescription(makeModel),
    idv: normalizeAmount(specMatch[2]),
    seatingCapacity: normalizeSeatingCapacity(seatingCapacity, {
      policyCoverType: "Own Damage",
      makeModel,
      cubicCapacity: specMatch[1],
      text: block,
    }),
  };
}

// Start of extractMotorVehicleBlock (Lines 5211-5235)
function extractMotorVehicleBlock(text) {
  const startPatterns = [
    /Insured\s+Motor\s+Vehicle\s+Details/i,
    /INSURED\s+MOTOR\s+VEHICLE\s+DETAILS\s+AND\s+PREMIUM\s+(?:COMPUTATION|CALCULATION)/i,
    /\bVEHICLE\s+DETAILS\b/i,
    /Vehicle\s+Details\s*&?\s*Premium/i,
    /Registration\s+Mark\s*&?\s*No\.?/i,
    /Vehicle\s+Registration\s+(?:Details|No)/i,
  ];
  let start = -1;
  for (const pattern of startPatterns) {
    const index = text.search(pattern);
    if (index !== -1 && (start === -1 || index < start)) start = index;
  }
  if (start === -1) return "";

  const tail = text.slice(start);
  const endMatch = tail
    .slice(120)
    .search(
      /(?:VehicleSide\s+Car|A\.\s*Own\s+Damage|Premium\s+Details|Co-Insurance|Nominees?|Limit\s+of\s+Liability|Previous\s+Policy|GST\s+Details)/i,
    );
  const end = endMatch === -1 ? Math.min(tail.length, 1400) : Math.min(tail.length, endMatch + 120);
  return tail.slice(0, end);
}

// Start of extractMotorRegistrationNumber (Lines 5237-5268)
function extractMotorRegistrationNumber(text) {
  const labelled = extractMotorLabelValue(
    text,
    [
      "Registration Number",
      "Registration No",
      "Registration no",
      "Regn No",
      "Regn. No",
      "Registration Mark",
      "Vehicle Registration No",
      "Vehicle No",
    ],
    "registration",
  );
  const normalizedLabelled = labelled
    ? matchGroup(
        labelled,
        /\b((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))\b/i,
      )
    : "";
  if (normalizedLabelled) return normalizedLabelled;
  const newIndiaLabelled = matchGroup(
    text,
    /\b(?:Registration\s*(?:No|Number|Mark)|Regn\.?\s*No|Vehicle\s*(?:No|Number))\b[\s,.:;-]*(?:is\s*)?((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))\b/i,
  );
  if (newIndiaLabelled) return newIndiaLabelled;
  return matchGroup(
    text,
    /\b((?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4}))\b/i,
  );
}

// Start of extractMotorLabelValue (Lines 5270-5296)
function extractMotorLabelValue(text, labels, type = "text") {
  const stopWords =
    "(?:Policy|Period|RTO|Issuance|Chassis|Engine|Make|Model|Variant|Year|Type|Colour|Cubic|Seating|Seats|Customer|Invoice|Name|Registration|Geographical|Cover|IDV|Premium)";
  for (const label of labels) {
    const escaped = escapeRegExp(label).replace(/\\ /g, "\\s+");
    const patterns = [
      new RegExp(`${escaped}\\s*(?:[:.-])?\\s*([^\\n]{1,180})`, "i"),
      new RegExp(`${escaped}\\s*\\n\\s*([^\\n]{1,180})`, "i"),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match?.[1]) continue;
      let value = cleanHdfcValue(match[1]);
      value = value.split(new RegExp(`(?=${stopWords}\\b)`, "i"))[0].trim();
      const normalized = normalizeHdfcTypedValue(value, type);
      if (
        type === "registration" &&
        !/\b(?:[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}|[A-Z]{2}[-\s]\d{1,2}[-\s]\d{4})\b/i.test(
          normalized,
        )
      )
        continue;
      if (normalized) return normalized;
    }
  }
  return "";
}

// Start of extractMotorMakeModel (Lines 5298-5321)
function extractMotorMakeModel(text) {
  const labelled = extractMotorLabelValue(
    text,
    ["Make / Model", "Make/Model of Vehicle", "Vehicle Make Model", "Model"],
    "vehicleText",
  );
  if (labelled && !/^(?:of\s+Vehicle|Vehicle)$/i.test(labelled)) return labelled;

  const makeIndex = text.search(/\bMake(?:\s*\/\s*Model|\s*\/Model\s+of\s+Vehicle| of Vehicle|$)/i);
  if (makeIndex === -1) return "";
  const block = text.slice(makeIndex, makeIndex + 500);
  const makeMatch = block.match(
    /\b(?:ASHOK\s+LEYLAND|ASHOK\s+LEYL|BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL ENFIELD|KTM|HARLEY|JAWA|BENELLI|APRILIA|KAWASAKI|BMW|DUCATI|TRIUMPH|MAHINDRA|MARUTI(?: SUZUKI)?|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)[A-Z0-9 /&.,-]{2,100}/i,
  );
  if (!makeMatch?.[0]) return "";
  let makeModel = cleanHdfcValue(makeMatch[0])
    .replace(/\s*(?:Engine|Chassis|Year|Cubic|Seating|Capacity|Premium|Variant).*$/i, "")
    .trim();
  if (makeModel.endsWith("-")) {
    const afterMatch = block.slice(makeMatch.index + makeMatch[0].length).match(/^\s*([A-Z0-9]{1,12})\b/i);
    if (afterMatch?.[1]) makeModel += afterMatch[1];
  }
  return makeModel;
}

// Start of splitGenericMakeModel (Lines 5323-5369)
function splitGenericMakeModel(makeModel = "") {
  const cleaned = cleanHdfcValue(makeModel);
  if (!cleaned) return { make: "", model: "" };

  const slashParts = cleaned
    .split("/")
    .map((part) => cleanHdfcValue(part))
    .filter(Boolean);
  if (slashParts.length >= 2) {
    return {
      make: slashParts[0],
      model: slashParts.slice(1).join(" / "),
    };
  }

  const knownMakes = [
    "ASHOK LEYLAND",
    "ASHOK LEYL",
    "MARUTI SUZUKI",
    "ROYAL ENFIELD",
    "MAHINDRA",
    "HYUNDAI",
    "BAJAJ",
    "HONDA",
    "HERO",
    "TATA",
    "TOYOTA",
    "FORD",
    "RENAULT",
    "NISSAN",
    "VOLKSWAGEN",
    "KIA",
    "MG",
    "SKODA",
    "TVS",
    "YAMAHA",
    "SUZUKI",
  ];
  const upper = cleaned.toUpperCase();
  const make = knownMakes.find((candidate) => upper === candidate || upper.startsWith(`${candidate} `));
  if (!make) return { make: "", model: "" };

  return {
    make,
    model: cleanHdfcValue(cleaned.slice(make.length)),
  };
}

// Start of extractSeatingFromVehicleBlock (Lines 5371-5434)
function extractSeatingFromVehicleBlock(block, context = {}) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates = [];

  for (const match of block.matchAll(
    /\b(?:Seating\s*Capacity|Seating|Seats?|Carrying\s+Capacity)\b[ \t:.-]*(\d{1,2})(?!\d)/gi,
  )) {
    candidates.push({ value: match[1], score: 70, source: match[0] });
  }

  for (const match of block.matchAll(
    /\bSeating\s*capacity(?:\s+including\s+Driver)?\s*(?:\n|\s)*(\d{1,2})(?=\D|$)/gi,
  )) {
    candidates.push({ value: match[1], score: 92, source: match[0] });
  }

  for (const match of block.matchAll(/\bSeats\s*(\d{1,2})(?=\D|$)/gi)) {
    candidates.push({ value: match[1], score: 88, source: match[0] });
  }

  const chassisLabelIndex = lines.findIndex((line) => /\bChassis\s*(?:No|Number)\b/i.test(line));
  if (chassisLabelIndex !== -1) {
    for (let i = chassisLabelIndex + 1; i < Math.min(lines.length, chassisLabelIndex + 5); i++) {
      const value = lines[i].match(/^(\d{1,2})$/)?.[1];
      if (value) candidates.push({ value, score: 95, source: `after Chassis No: ${lines[i]}` });
    }
  }

  const seatingLabelIndex = lines.findIndex((line, index) => {
    const joined = `${line} ${lines[index + 1] || ""}`;
    return /\bSeating\s*Capacity\b/i.test(joined) || /\bSeats?\b/i.test(line);
  });
  if (seatingLabelIndex !== -1) {
    for (let i = seatingLabelIndex + 1; i < Math.min(lines.length, seatingLabelIndex + 14); i++) {
      const line = lines[i];
      const exact = line.match(/^(\d{1,2})$/)?.[1];
      if (exact) candidates.push({ value: exact, score: 90, source: `near Seating Capacity: ${line}` });

      const labelled = line.match(/(?:capacity|seats?)\D{0,20}(\d{1,2})(?!\d)/i)?.[1];
      if (labelled) candidates.push({ value: labelled, score: 78, source: line });
    }
  }

  const compact = block.replace(/\s+/g, "");
  const denseSpec = compact.match(
    /\b(19\d{2}|20\d{2})(\d{2,4})(?:[A-Z]{3,20})(\d{1,2})(?=\d{3,8}(?:\.\d{1,2})?\b)/i,
  );
  if (denseSpec?.[3]) {
    candidates.push({ value: denseSpec[3], score: 82, source: denseSpec[0] });
  }

  const best = candidates
    .map((candidate) => ({
      ...candidate,
      normalized: normalizeSeatingCapacity(candidate.value, { ...context, text: block }),
    }))
    .filter((candidate) => candidate.normalized)
    .sort((a, b) => b.score - a.score)[0];

  return best?.normalized || "";
}

// Start of extractEngineNumber (Lines 5436-5491)
function extractEngineNumber(text) {
  const engineBeforeChassis = text.match(/(?:^|\n)\s*([A-Z0-9]{6,16})\s*\n\s*[A-Z0-9]{17}\s*(?:\n|$)/im);
  if (engineBeforeChassis?.[1] && isPlausibleEngineNumber(engineBeforeChassis[1])) {
    return engineBeforeChassis[1].trim().toUpperCase();
  }

  // New India Assurance pattern
  const newIndiaChassisEngine = text.match(
    /Chassis\s*no\.?\s*\/\s*Engine\s*(?:no\.?|Number)\s*:?\s*([A-Z0-9]{10,25})\s*\/\s*([A-Z0-9\n ]{5,30}?)(?=\s*(?:Type|Make|Registration|Model|Fuel|Year|$))/i,
  );
  if (newIndiaChassisEngine?.[2]) {
    const engine = newIndiaChassisEngine[2]
      .replace(/[\r\n\s]+/g, "")
      .trim()
      .toUpperCase();
    if (isPlausibleEngineNumber(engine) || /^\d{5,25}$/.test(engine)) return engine;
  }

  const NIA_EngineMatch = text.match(
    /(?:Chassis no\.\/Engine Number|Chassis No)\s*[A-Z0-9]{17}\s*\/\s*([A-Z0-9\n ]{3,30}?)(?=\s*(?:Make|Chassis|Registration|Model|Fuel|Year|$))/i,
  );
  if (NIA_EngineMatch?.[1]) {
    return NIA_EngineMatch[1].replace(/[\r\n\s]+/g, "").trim();
  }

  const inlinePatterns = [
    /\bEngine\s*(?:No|Number)(?:\.|:)?\s*:\s*([A-Z0-9]{5,40})/i,
    /\bEngine\s*(?:No|Number)(?:\.|:)?\s*-\s*([A-Z0-9]{5,40})/i,
    /\bEngine\s*(?:No|Number)(?:\.|:)?[ \t]+([A-Z0-9]{5,40})/i,
  ];
  for (const pattern of inlinePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const index = text.search(/Engine\s*(?:No|Number)\b/i);
  if (index !== -1) {
    const sub = text.substring(index, index + 300);
    const lines = sub
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cleaned = line.replace(/^[-:.\s]+/, "").trim();
      if (
        isPlausibleEngineNumber(cleaned) &&
        !/seating|capacity|chassis|registration|make|model|year|body/i.test(cleaned)
      ) {
        return cleaned;
      }
    }
  }

  return "";
}

// Start of isPlausibleEngineNumber (Lines 5493-5509)
function isPlausibleEngineNumber(value = "") {
  const cleaned = String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
  if (cleaned.length < 6 || cleaned.length > 25) return false;
  if (!/\d/.test(cleaned) || !/[A-Z]/.test(cleaned)) return false;
  if (/\b[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}(?:19\d{2}|20\d{2})?\b/i.test(cleaned)) return false;
  if (
    /^(?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|KIA|MG|SKODA)\b/i.test(
      value,
    )
  )
    return false;
  if (/(?:PACKAGE|COMPREHENSIVE|LIABILITY|PREMIUM)/i.test(value)) return false;
  return true;
}

// Start of extractChassisNumber (Lines 5511-5571)
function extractChassisNumber(text) {
  const chassisAfterEngine = text.match(/(?:^|\n)\s*[A-Z0-9]{6,16}\s*\n\s*([A-Z0-9]{17})\s*(?:\n|$)/im);
  if (chassisAfterEngine?.[1]) {
    return chassisAfterEngine[1].trim().toUpperCase();
  }

  // New India Assurance pattern
  const newIndiaChassisEngine = text.match(
    /Chassis\s*no\.?\s*\/\s*Engine\s*(?:no\.?|Number)\s*:?\s*([A-Z0-9]{10,25})\s*\/\s*([A-Z0-9\n ]{5,30}?)(?=\s*(?:Type|Make|Registration|Model|Fuel|Year|$))/i,
  );
  if (newIndiaChassisEngine?.[1]) {
    return newIndiaChassisEngine[1].trim().toUpperCase();
  }

  const NIA_ChassisMatch = text.match(/(?:Chassis no\.\/Engine Number|Chassis No)\s*([A-Z0-9]{17})/i);
  if (NIA_ChassisMatch?.[1]) {
    return NIA_ChassisMatch[1].trim();
  }

  const inlinePatterns = [
    /\bChassis\s*(?:No|Number)(?:\.|:)?\s*:\s*([A-Z0-9]{10,25})/i,
    /\bChassis\s*(?:No|Number)(?:\.|:)?\s*-\s*([A-Z0-9]{10,25})/i,
    /\bChassis\s*(?:No|Number)(?:\.|:)?[ \t]+([A-Z0-9]{10,25})/i,
  ];
  for (const pattern of inlinePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const index = text.search(/Chassis\s*(?:No|Number)\b/i);
  if (index !== -1) {
    const sub = text.substring(index, index + 300);
    const lines = sub
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cleaned = line.replace(/^[-:.\s]+/, "").trim();
      if (
        cleaned.length === 17 &&
        /\d/.test(cleaned) &&
        /[A-Z]/i.test(cleaned) &&
        !/\s/.test(cleaned) &&
        !/seating|capacity|engine|registration|make|model|year|body|accessories/i.test(cleaned)
      ) {
        return cleaned;
      }
    }
  }

  const vinMatch = text.match(/\b([A-Z0-9]{17})\b/i);
  if (vinMatch?.[1]) {
    const cleaned = vinMatch[1].trim();
    if (/\d/.test(cleaned) && !/HEEE|FFF|DJE|GBF|ENL|KOH|JOK|EFN|APB/i.test(cleaned)) {
      return cleaned;
    }
  }

  return "";
}

// Start of extractSeatingCapacity (Lines 5573-5606)
function extractSeatingCapacity(text, context = {}) {
  const tableValue = extractSeatingFromVehicleBlock(extractMotorVehicleBlock(text), context);
  if (tableValue) return tableValue;

  const index = text.search(/Seating\s*Capacity/i);
  if (index !== -1) {
    const sub = text.substring(index, index + 300);
    const lines = sub
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^(\d{1,2})/);
      if (m) {
        const normalized = normalizeSeatingCapacity(m[1], { ...context, text });
        if (normalized) return normalized;
      }
    }
  }

  const patterns = [
    /\bSeating Capacity(?:\.|:)?[ \t]*([0-9]{1,3})(?!\d)/i,
    /Seating\s*Capacity[^\d\n]*?(\d{1,3})(?!\d)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const normalized = normalizeSeatingCapacity(match[1], { ...context, text });
      if (normalized) return normalized;
    }
  }
  return "";
}

// Start of normalizeSeatingCapacity (Lines 5608-5617)
function normalizeSeatingCapacity(value, context = {}) {
  const number = parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(number) || number < 1 || number > 80) return "";

  const vehicleType = inferMotorVehicleType(context);
  if (vehicleType === "two_wheeler" && number > 3) return "";
  if (vehicleType === "private_car" && number > 10) return "";
  if ((vehicleType === "goods" || vehicleType === "tractor") && number > 6) return "";
  return String(number);
}

// Start of inferMotorVehicleType (Lines 5619-5637)
function inferMotorVehicleType(context = {}) {
  const haystack = [context.policyType, context.policyCoverType, context.makeModel, context.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(two\s*wheeler|bike|motor\s*cycle|motorcycle|scooter|moped|activa|pulsar|splendor|apache|jupiter|shine|discover|access)\b/.test(
      haystack,
    )
  ) {
    return "two_wheeler";
  }
  if (/\b(bus|passenger\s+carrying|school\s+bus)\b/.test(haystack)) return "passenger";
  if (/\b(goods\s+carrying|gcv|truck|lorry|pickup|dumper)\b/.test(haystack)) return "goods";
  if (/\b(tractor)\b/.test(haystack)) return "tractor";
  if (/\b(private\s+car|motor\s+car|taxi|cab|sedan|hatchback|suv)\b/.test(haystack)) return "private_car";
  return "unknown";
}

// Start of isMotorCoverTypeContext (Lines 5639-5654)
function isMotorCoverTypeContext(context = {}) {
  if (context.hdfcErgoMotor?.documentDetected || context.generaliMotor?.documentDetected) return true;
  if (/\bMOTOR\b/i.test(context.policyUnderstanding?.documentCategory || "")) return true;
  if (/\bMOTOR\b/i.test(context.policyUnderstanding?.documentFormat || "")) return true;
  if (
    /\b(private\s+car|two\s*wheeler|commercial\s+vehicle|motor\s+(?:protect|policy|insurance)|vehicle\s+package|vehicle\s+liability)\b/i.test(
      context.policyType || "",
    )
  )
    return true;

  const table = context.motorVehicleTable || {};
  return Boolean(
    table.registrationNumber || table.engineNumber || table.chassisNumber || table.seatingCapacity,
  );
}

// Start of schemaSupportsCoverType (Lines 5656-5662)
function schemaSupportsCoverType(schema = {}) {
  return (schema.fields || []).some((field) => {
    const name = String(field.field || "").toLowerCase();
    if (name === "policycovertype" || name === "covertype") return true;
    return (field.aliases || []).some((alias) => /\bcover\s+type\b/i.test(String(alias || "")));
  });
}

// Start of extractPolicyCoverType (Lines 5664-5693)
function extractPolicyCoverType(text, policyType = "") {
  // Detect TP+OD (Comprehensive) by premium breakdown pattern FIRST (most reliable)
  const hasOwnDamagePremium = /\bOwn\s*Damage\s*Premium/i.test(text);
  const hasThirdPartyPremium = /\b(Third\s*Party|Liability)\s*Premium/i.test(text);
  if (hasOwnDamagePremium && hasThirdPartyPremium) return "Comprehensive";
  if (hasOwnDamagePremium && !hasThirdPartyPremium) return "Own Damage";
  if (hasThirdPartyPremium && !hasOwnDamagePremium) return "Third Party";

  const haystack = `${policyType || ""} ${text || ""}`;
  const exact =
    matchGroup(
      haystack,
      /\b(Package Policy|Liability Only Policy|Comprehensive Policy|Third Party Policy|Own Damage Policy)\b/i,
    ) || matchGroup(haystack, /\b(Private Car Package|Two Wheeler Package|Commercial Vehicle Package)\b/i);
  if (exact) return normalizeCoverType(exact);

  const vehicleBlock = extractMotorVehicleBlock(text) || text;
  const compact = vehicleBlock.replace(/\s+/g, "");
  const denseCover = matchGroup(
    compact,
    /\d{2,4}(Package|Comprehensive|LiabilityOnly|Liability|ThirdParty|TP|OwnDamage)\d/i,
  );
  if (denseCover) return normalizeCoverType(denseCover);

  if (/\bpackage\b/i.test(haystack)) return "Package";
  if (/\bcomprehensive\b/i.test(haystack)) return "Comprehensive";
  if (/\b(liability\s*only|third\s*party|tp)\b/i.test(haystack)) return "Third Party";
  if (/\bown\s*damage\b/i.test(haystack)) return "Own Damage";
  return "";
}

// Start of normalizeCoverType (Lines 5695-5707)
function normalizeCoverType(value) {
  const text = String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!text) return "";
  if (/package/.test(text)) return "Package";
  if (/comprehensive/.test(text)) return "Comprehensive";
  if (/liability|third party|\btp\b/.test(text)) return "Third Party";
  if (/own damage|stand alone od|standalone od/.test(text)) return "Own Damage";
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

// Start of normalizeManufacturingYear (Lines 5709-5713)
function normalizeManufacturingYear(value) {
  const year = parseInt(String(value || "").trim(), 10);
  if (year >= 1980 && year <= 2035) return String(year);
  return "";
}

// Start of extractNominee (Lines 5715-5735)
function extractNominee(text) {
  const nomineePattern = /\bNominees?\b(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,60})/i;
  const match = text.match(nomineePattern);
  if (match?.[1]) {
    const val = match[1].replace(/,\s*$/, "").trim();
    if (!/is a minor|relationship/i.test(val)) return val;
  }

  const fallbackPatterns = [
    /\bNominee Name(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,120})/i,
    /\bNominee(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,120})/i,
  ];
  for (const pattern of fallbackPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const val = match[1].trim();
      if (!/is a minor|relationship/i.test(val)) return val;
    }
  }
  return "";
}

// Start of extractFinancer (Lines 5737-5749)
function extractFinancer(text) {
  const patterns = [
    /\bHypothecated\/Lease Agreement with[ \t]*([A-Z0-9/&()., -]{2,80})/i,
    /\bHypothecated with[ \t]*([A-Z0-9/&()., -]{2,80})/i,
    /\bFinancier(?: Name)?(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,160})/i,
    /\bHypothecation(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,160})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

// Start of normalizeFuelType (Lines 6466-6476)
function normalizeFuelType(fuel) {
  const f = String(fuel || "")
    .trim()
    .toUpperCase();
  if (/PETROL|GASOLINE/.test(f)) return "PETROL";
  if (/DIESEL/.test(f)) return "DIESEL";
  if (/CNG/.test(f)) return "CNG";
  if (/ELECTRIC|EV|BEV/.test(f)) return "EV";
  if (/HYBRID/.test(f)) return "HYBRID";
  return f;
}

module.exports = {
  harmonizeMotorCoreFields,
  shouldKeepExtractedMotorVariant,
  shouldKeepExtractedMotorPartyFields,
  shouldKeepExtractedMotorFinancer,
  normalizeInsuranceCompanyName,
  isVerifiedCompanyDocumentFormat,
  isMotorExtraction,
  extractPaymentCollection,
  extractInsuredGstin,
  extractGstAmount,
  extractCscContact,
  matchNCB,
  inferFuelTypeFromVehicleDescription,
  inferFuelType,
  extractInsuredName,
  extractPolicyNumber,
  normalizeRegistrationDisplay,
  cleanVehicleCode,
  extractNewIndiaDenseIdv,
  extractMakeModel,
  extractMfgYear,
  extractMotorVehicleTable,
  extractIffcoCompressedVehicleTable,
  extractIffcoDensePrivateCarVehicleTable,
  extractIffcoStandaloneOdVehicleTable,
  extractMotorVehicleBlock,
  extractMotorRegistrationNumber,
  extractMotorLabelValue,
  extractMotorMakeModel,
  splitGenericMakeModel,
  extractSeatingFromVehicleBlock,
  extractEngineNumber,
  isPlausibleEngineNumber,
  extractChassisNumber,
  extractSeatingCapacity,
  normalizeSeatingCapacity,
  inferMotorVehicleType,
  isMotorCoverTypeContext,
  schemaSupportsCoverType,
  extractPolicyCoverType,
  normalizeCoverType,
  normalizeManufacturingYear,
  extractNominee,
  extractFinancer,
  normalizeFuelType
};
