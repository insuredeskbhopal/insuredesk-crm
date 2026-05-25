const pdf = require("pdf-parse");

async function extractPolicyFromPdf(buffer, sourceFile = "") {
  const parsed = await pdf(buffer);
  return extractPolicyFromText(parsed.text || "", sourceFile);
}

function extractPolicyFromText(text, sourceFile = "") {
  const sourceText = cleanText(text || "");
  
  const insuredName = extractInsuredName(sourceText);
  const policyNumber = extractPolicyNumber(sourceText);
  const policyType =
    matchGroup(sourceText, /(MSME Suraksha Kavach Package Policy\s*-\s*Advance)/i) ||
    matchGroup(sourceText, /(Private Car Package Policy)/i) ||
    matchGroup(sourceText, /(Private Car Liability Only Policy)/i) ||
    matchGroup(sourceText, /(Two Wheeler Package Policy)/i) ||
    matchGroup(sourceText, /(Two Wheeler Liability Only Policy)/i) ||
    matchGroup(sourceText, /(Commercial Vehicle Package Policy)/i) ||
    matchGroup(sourceText, /(Commercial Vehicle Liability Only Policy)/i) ||
    matchGroup(sourceText, /(Two Wheeler Policy)/i) ||
    matchGroup(sourceText, /(Policy Schedule.*?)(?:Name of the Insured|Mailing Address)/i);
  const issuedAt = matchGroup(sourceText, /Issued at\s*([A-Z][A-Z\s]+?)(?:Premises to be Insured|Premium|Hypothecation|Intermediary Details|$)/i);
  const startDate =
    matchGroup(sourceText, /Period of cover\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /From:\s*\d{2}:\d{2}\s*Hours of\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /Period of Insurance\s*From:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /From:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /(?:Start|Commencement)\s*Date\s*[:.-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ||
    matchGroup(sourceText, /Period\s+of\s+Insurance\s*from\s*:?\s*(?:00:00\s+hours\s+of\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  const expiryDate =
    matchGroup(sourceText, /Period of cover\s*\d{2}\/\d{2}\/\d{4}[^\n]+?\bto\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /To:\s*Midnight of\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /To:\s*Midnight\s+On\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /To:\s*(?:Midnight\s+(?:On|of)\s*)?(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(sourceText, /(?:Expiry|End)\s*Date\s*[:.-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i) ||
    matchGroup(sourceText, /(?:midnight\s+of\s+)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:midnight|23:59)/i);
  const duration = buildDuration(startDate, expiryDate);
  const riskLocation =
    matchGroup(sourceText, /Premises to be Insured\s*([\s\S]+?)\s*Premium\s*\(`/i) ||
    matchGroup(sourceText, /Risk Location\s*[–-]?\s*:\s*([\s\S]+?)\s*Description of Block/i);
  const businessDescription =
    matchGroup(sourceText, /Business of the Insured\s*([\s\S]+?)\s*Issued at/i) ||
    matchGroup(sourceText, /Description of Block\s*:?\s*([\s\S]+?)\s*Perils Covered/i);
  
  const idv = extractIDV(sourceText);
  const premium = extractPremium(sourceText);
  const sumInsured =
    normalizeAmount(matchGroup(sourceText, /MSME Suraksha Kavach\s*-\s*Contents\s*(?:Fire Basic Covers\s*)?\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i)) ||
    normalizeAmount(matchGroup(sourceText, /1\s*MSME Suraksha Kavach\s*-\s*Contents\s*\(`\)\s*([0-9,]+\.\d{2})/i)) ||
    normalizeAmount(matchGroup(sourceText, /MSME Suraksha Kavach\s*-\s*Contents[\s\S]{0,60}?\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i)) ||
    idv;

  const district = extractLocationPart(sourceText, riskLocation, "district");
  const tehsil = extractLocationPart(sourceText, riskLocation, "tehsil");
  const contactNumber =
    matchGroup(sourceText, /Agency\/Broker Mobile No\s*\S*\s*([6-9]\d{9})/i) ||
    matchGroup(sourceText, /Agency\/Broker CodeAgency\/Broker NameAgency\/Broker Mobile NoAgency\/Broker Email-ID\s*\d+\s*[A-Z0-9]*\s*([6-9]\d{9})/i) ||
    matchGroup(sourceText, /Agency\/Broker Mobile No.*?([6-9]\d{9})/i) ||
    matchGroup(sourceText, /\b([6-9]\d{9})\b/);
  const contactPerson =
    matchGroup(sourceText, /PROP\.?\s+([A-Z][A-Z\s]+?)(?:,|\s+KHASRA|\s+VILLAGE)/i) ||
    matchGroup(sourceText, /Contact person name\s*[:-]?\s*([A-Z][A-Z\s]+)/i);
  const insuranceCompany =
    matchGroup(sourceText, /(ICICI Lombard General Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(ICICI Lombard General Insurance Company Ltd)/i) ||
    matchGroup(sourceText, /(HDFC ERGO General Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(HDFC ERGO General Insurance Company Ltd)/i) ||
    matchGroup(sourceText, /(TATA AIG General Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(TATA AIG General Insurance Company Ltd)/i) ||
    matchGroup(sourceText, /(The New India Assurance Company Limited)/i) ||
    matchGroup(sourceText, /(IFFCO[- ]TOKIO General Insurance Co\.?\s*Ltd)/i) ||
    matchGroup(sourceText, /(IFFCO[- ]?TOKIO GENERAL INSURANCE[A-Z .]*)/i) ||
    matchGroup(sourceText, /(Bajaj Allianz General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Bajaj Allianz General Insurance Company? Ltd)/i) ||
    matchGroup(sourceText, /(SBI General Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(United India Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(Oriental Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(The Oriental Insurance Company? Ltd)/i) ||
    matchGroup(sourceText, /(National Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(Reliance General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Kotak Mahindra General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Future Generali India Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Cholamandalam MS General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Royal Sundaram General Insurance Co\.?\s*Limited)/i) ||
    matchGroup(sourceText, /(Shriram General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Acko General Insurance Limited)/i) ||
    matchGroup(sourceText, /(Go Digit General Insurance Limited)/i) ||
    matchGroup(sourceText, /(Navi General Insurance Limited)/i) ||
    matchGroup(sourceText, /(Liberty General Insurance Limited)/i) ||
    matchGroup(sourceText, /(Magma HDI General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Universal Sompo General Insurance Company? Limited)/i) ||
    matchGroup(sourceText, /(Raheja QBE General Insurance Company? Limited)/i);
  const pptMpwlc = matchGroup(sourceText, /\b(MPWLC)\b/i);
  const occupancy = businessDescription;
  const validIn = issuedAt;
  const groupName = deriveGroupName(sourceText, sourceFile, insuredName, pptMpwlc);
  const vehicleNumber =
    matchGroup(sourceText, /\bVehicle (?:Registration )?No(?:\.|:)?\s*([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})/i) ||
    matchGroup(sourceText, /\bRegistration No(?:\.|:)?\s*([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})/i) ||
    matchGroup(sourceText, /\bRegistration Mark[^\n]*\n[^A-Z]*([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})/i) ||
    matchGroup(sourceText, /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})(?=\d{4}\b)/i) ||
    matchGroup(sourceText, /\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})\b/i);
  const registrationNumber =
    matchGroup(sourceText, /\bRegistration Number(?:\.|:)?\s*([A-Z0-9-]+)/i) ||
    vehicleNumber;
  
  const makeModel = extractMakeModel(sourceText);
  const variant =
    matchGroup(sourceText, /\bVariant(?:\.|:)?\s*([A-Z0-9 /&().,-]{1,60})/i);
  const manufacturingYear = extractMfgYear(sourceText);
  const registrationDate =
    matchGroup(sourceText, /\bRegistration Date(?:\.|:)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  
  const engineNumber = extractEngineNumber(sourceText);
  const chassisNumber = extractChassisNumber(sourceText);
  const fuelType =
    matchGroup(sourceText, /\bFuel Type(?:\.|:)?\s*([A-Z ]{3,40})/i) ||
    inferFuelType(sourceText, makeModel);
  const cubicCapacity =
    matchGroup(sourceText, /Cubic capacity[\s\S]{0,100}?\b(\d{3,4})\s*cc/i) ||
    matchGroup(sourceText, /\b(?:CC|Cubic Capacity)(?:\.|:)?\s*([0-9. ]{2,20})/i) ||
    matchGroup(sourceText, /\bCC\s*\n?\s*(\d{2,4})/i) ||
    matchGroup(sourceText, /\b(\d{2,4})(?:Package|Liability|Comprehensive|Third\s*Party)/i);
  const seatingCapacity = extractSeatingCapacity(sourceText);
  const grossVehicleWeight =
    matchGroup(sourceText, /\b(?:GVW|Gross Vehicle Weight)(?:\.|:)?\s*([0-9., ]{2,20})/i);
  
  const ncb =
    matchGroup(sourceText, /\bNCB[^\n]*?(\d{1,2}%)/i) ||
    matchGroup(sourceText, /\bNCB(?:\.|:)?\s*([0-9]{1,2}%)/i) ||
    matchGroup(sourceText, /\bNo Claim Bonus(?:\.|:)?\s*([0-9]{1,2}%)/i) ||
    matchNCB(sourceText);
  const policyCoverType =
    matchGroup(sourceText, /\b(Package Policy|Liability Only Policy|Comprehensive Policy|Third Party Policy)\b/i);
  const rtoLocation =
    matchGroup(sourceText, /\bRTO(?: Location)?(?:\.|:)?\s*([A-Z0-9/&().,\-\s]{2,80})/i);
  
  const nomineeName = extractNominee(sourceText);
  const financerName = extractFinancer(sourceText);

  return {
    sourceFile: sourceFile || "Untitled.pdf",
    sourceText,
    status: "saved",
    srNo: "",
    insuredName,
    contactNumber,
    contactPerson,
    groupName,
    policyNumber,
    policyType,
    sumInsured,
    premium,
    startDate,
    expiryDate,
    duration,
    riskLocation,
    district,
    tehsil,
    insuranceCompany,
    description: businessDescription,
    pptMpwlc,
    occupancy,
    validIn,
    vehicleNumber,
    registrationNumber,
    makeModel,
    variant,
    manufacturingYear,
    registrationDate,
    engineNumber,
    chassisNumber,
    fuelType,
    cubicCapacity,
    seatingCapacity,
    grossVehicleWeight,
    idv,
    ncb,
    policyCoverType,
    rtoLocation,
    nomineeName,
    financerName
  };
}

function cleanText(text) {
  return text
    .replace(/\r/g, " ")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function cleanMakeModel(text) {
  const patterns = [
    /(?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL ENFIELD|KTM|HARLEY|JAWA|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)\s+[A-Z0-9][A-Z0-9 /.,-]{2,60}/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) {
      return match[0]
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\s*(?:Registration|Chassis|Engine|Seating|Vehicle|Side Car|Accessories).*$/i, "")
        .trim();
    }
  }
  return "";
}

function matchNCB(text) {
  const m = text.match(/No Claim Bonus\s*(?:Discount)?\s*\(?\s*(\d{1,2})\s*%\s*\)?/i);
  if (m?.[1]) return m[1] + "%";
  return "";
}

function inferFuelType(text, makeModel) {
  const combined = (text + " " + (makeModel || "")).toLowerCase();
  if (/\bdiesel\b/.test(combined)) return "Diesel";
  if (/\belectric\b|\bev\b|\bbev\b/.test(combined)) return "Electric";
  if (/\bcng\b/.test(combined)) return "CNG";
  if (/\blpg\b/.test(combined)) return "LPG";
  if (/\bpetrol\b|\bgasoline\b|\bdts-?fi\b|\bfi\b/.test(combined)) return "Petrol";
  return "";
}

function matchGroup(text, pattern) {
  const match = text.match(pattern);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function normalizeAmount(value) {
  if (!value) return "";
  const cleaned = value.replace(/\s+/g, "");
  return cleaned.includes(".") ? cleaned : `${cleaned}.00`;
}

function buildDuration(startDate, expiryDate) {
  if (!startDate || !expiryDate) return "";
  const [sd, sm, sy] = startDate.split("/").map(Number);
  const [ed, em, ey] = expiryDate.split("/").map(Number);
  if (!sd || !sm || !sy || !ed || !em || !ey) return "";
  let months = (ey - sy) * 12 + (em - sm);
  if (months <= 0) months = 1;
  return `${months} month${months === 1 ? "" : "s"}`;
}

function extractLocationPart(text, riskLocation, kind) {
  const haystack = `${riskLocation || ""} ${text}`;
  if (kind === "district") {
    return (
      matchGroup(haystack, /DIST(?:RICT|ICT)\s+([A-Z][A-Z\s]+)/i) ||
      matchGroup(haystack, /MADHYA PRADESH[-\s]+([A-Z][A-Z\s]+)[-\s]+\d{6}/i)
    );
  }

  return matchGroup(haystack, /TEHSIL\s+([A-Z][A-Z\s]+)/i);
}

function deriveGroupName(text, sourceFile, insuredName, pptMpwlc) {
  if (pptMpwlc) return pptMpwlc;

  const filenameGroup = matchGroup(sourceFile, /\b([A-Z]{3,})\b/i);
  if (filenameGroup && ["PDF", "POLICY"].indexOf(filenameGroup.toUpperCase()) === -1) {
    return filenameGroup.toUpperCase();
  }

  return matchGroup(insuredName || text, /\b([A-Z]{3,})\b/i);
}

// Robust IFFCO-TOKIO and general PDF extraction helpers

function extractInsuredName(text) {
  const patterns = [
    /Name of the Insured\s*([\s\S]+?)(?=\s*(?:Policy No|Policy\s*#|Address|Phone|Customer|$))/i,
    /following insured:\s*([\s\S]+?)(?=\s*PROP)/i,
    /Insured(?:'s)? Name\s*[:.-]?\s*([\s\S]+?)(?=\s*(?:Policy No|Policy\s*#|Address|Phone|Invoice|Date|GSTIN|Customer|$))/i,
    /Name of Insured\s*[:.-]?\s*([\s\S]+?)(?=\s*(?:Policy No|Policy\s*#|Address|Phone|Invoice|Date|GSTIN|Customer|$))/i
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

function extractPolicyNumber(text) {
  const patterns = [
    /[Pp][Oo][Ll][Ii][Cc][Yy]\s*#\s*:?\s*([A-Z0-9/-]+[A-Z0-9])/,
    /[Pp][Oo][Ll][Ii][Cc][Yy]\s*(?:[Nn][Oo]|[Nn][Uu][Mm][Bb][Ee][Rr]|[Ss][Cc][Hh][Ee][Dd][Uu][Ll][Ee]\s*[Nn][Oo]|[Ss][Cc][Hh][Ee][Dd][Uu][Ll][Ee]\s*[Nn][Uu][Mm][Bb][Ee][Rr])?\s*[:.-]?\s*([A-Z0-9/.-]{6,})/,
    /[Cc][Ee][Rr][Tt][Ii][Ff][Ii][Cc][Aa][Tt][Ee]\s*(?:[Nn][Oo]|[Nn][Uu][Mm][Bb][Ee][Rr])?\s*[:.-]?\s*([A-Z0-9/.-]{6,})/,
    /attached\s*herewith\s*([A-Z0-9/.-]{10,})\s*which\s*has\s*been\s*issued/
  ];
  
  for (const pattern of patterns) {
    const flags = pattern.flags ? pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g" : "g";
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

function extractPremium(text) {
  // Try Net Premium Table first (specifically IFFCO-TOKIO)
  const tableMatch1 = text.match(/Net Premium Rs\.(?:[^\n]*\n)+?\s*([\d.]+)/i);
  if (tableMatch1?.[1]) {
    const numbers = tableMatch1[1].match(/\d+\.\d{2}/g);
    if (numbers && numbers.length > 0) {
      return numbers[numbers.length - 1];
    }
  }

  // Try Premium Bifurcation Table
  const tableMatch2 = text.match(/Premium Bifurcation(?:[^\n]*\n)+?\s*([\d.]+)/i);
  if (tableMatch2?.[1]) {
    const numbers = tableMatch2[1].match(/\d+\.\d{2}/g);
    if (numbers && numbers.length > 0) {
      return numbers[numbers.length - 1];
    }
  }

  // Try Amount Received
  const amountRec = text.match(/Amount\s+Received\s*([0-9,.]+)/i);
  if (amountRec?.[1]) {
    return amountRec[1].trim();
  }

  // Fallbacks
  const fallbacks = [
    /Total Premium inclusive Tax\s*\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i,
    /Total Premium inclusive Tax\s*\(\s*`\s*\)\s*([0-9,]+)/i,
    /Premium\s*\(\s*`\s*\)\s*\(Including GST\)\s*\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i,
    /Premium\s*\(`\)\s*\(Including GST\)\(`\)\s*([0-9,]+\.\d{2})/i,
    /Total Premium\s*\(Rs\.?\)\s*([0-9,]+\.\d{2})/i,
    /Section 1[^\n]*Rs\.?\s*([0-9,]+\.\d{2})/i,
    /(?:Net Premium in Rs|Net Premium)\s*(?:Rs\.?)?\s*([0-9,]+(?:\.\d{2})?)/i,
    /Net Premium\s*(?:Rs\.?)?\s*([0-9,]+\.\d{2})/i,
    /(?:Total|Gross)\s*Premium[^\d]{0,30}([0-9,]+\.\d{2})/i,
    /Premium\s*(?:Amount)?\s*(?:Rs\.?|INR)?\s*([0-9,]+\.\d{2})/i
  ];
  for (const pattern of fallbacks) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeAmount(match[1]);
  }
  return "0.00";
}

function extractIDV(text) {
  // New India Assurance IDV patterns
  const NIA_idvMatch1 = text.match(/individual covers\s*\(OD\)\s*in\s*RS\s*[:.-]?\s*([0-9,]+)/i);
  if (NIA_idvMatch1?.[1]) {
    return normalizeAmount(NIA_idvMatch1[1]);
  }
  const NIA_idvMatch2 = text.match(/(?:INSURED DECLARED VALUE|Insured Declared Value)[^\n]*\n[^\n]*\n\s*([1-9]\d{4,8})/i);
  if (NIA_idvMatch2?.[1]) {
    return normalizeAmount(NIA_idvMatch2[1]);
  }

  const inlinePatterns = [
    /\bIDV(?:\.|:)?\s*([0-9,]+\.\d{2})/i,
    /\bInsured Declared Value(?:\.|:)?\s*([0-9,]+\.\d{2})/i,
    /IDV in Rs\.?\s*\n?[^0-9]*([0-9,]+\.\d{2})/i,
    /\bIDV(?:\.|:)?\s*(?:Rs\.?\s*)?([0-9,]+)/i
  ];
  for (const pattern of inlinePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeAmount(match[1]);
  }

  const coveragePattern = /(?:Package|Comprehensive|Liability|Third\s*Party)\s*([0-9,]+\.\d{2})/i;
  const matchCoverage = text.match(coveragePattern);
  if (matchCoverage?.[1]) return normalizeAmount(matchCoverage[1]);

  return "";
}

function extractMakeModel(text) {
  const manufacturerPattern = /Make of Vehicle\s*\n?\s*(?:\d+(?:\.\d+)?\s*)?(?:Package|Comprehensive|Liability|Third Party)?\s*(?:[0-9,.]+\s*)?(?:[^\n]*\n)*?\s*((?:BAJAJ|HONDA|HERO|TVS|YAMAHA|SUZUKI|ROYAL ENFIELD|KTM|HARLEY|JAWA|BENELLI|APRILIA|KAWASAKI|BMW|DUCATI|TRIUMPH|MAHINDRA|MARUTI|HYUNDAI|TATA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)[A-Z0-9 /&.,-]+)/i;
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
      /\bMake(?:\s*\/\s*Model)?(?:\.|:)?\s*([A-Z0-9/&()., -]{3,80})/i
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

function extractMfgYear(text) {
  const patterns = [
    /\bMfg(?:\.|:)? Year(?:\.|:)?\s*(\d{4})/i,
    /\bManufacturing Year(?:\.|:)?\s*(\d{4})/i,
    /\b[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}(\d{4})\b/i,
    /Year of Manuf\.?\s*\n?[^\d\n]*(\d{4})/i,
    /\bYear\s*(?:of)?\s*(?:Manufacture|Manufacturing|Manuf)(?:\.|:)?\s*(\d{4})/i
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

function extractEngineNumber(text) {
  // New India Assurance pattern
  const NIA_EngineMatch = text.match(/(?:Chassis no\.\/Engine Number|Chassis No)\s*[A-Z0-9]{17}\s*\/\s*([A-Z0-9\n ]{3,30}?)(?=\s*(?:Make|Chassis|Registration|Model|Fuel|Year|$))/i);
  if (NIA_EngineMatch?.[1]) {
    return NIA_EngineMatch[1].replace(/[\r\n\s]+/g, "").trim();
  }

  const inlinePatterns = [
    /\bEngine\s*(?:No|Number)(?:\.|:)?\s*:\s*([A-Z0-9]{5,40})/i,
    /\bEngine\s*(?:No|Number)(?:\.|:)?\s*-\s*([A-Z0-9]{5,40})/i,
    /\bEngine\s*(?:No|Number)(?:\.|:)?[ \t]+([A-Z0-9]{5,40})/i
  ];
  for (const pattern of inlinePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const index = text.search(/Engine\s*(?:No|Number)\b/i);
  if (index !== -1) {
    const sub = text.substring(index, index + 300);
    const lines = sub.split("\n").map(l => l.trim()).filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cleaned = line.replace(/^[-:.\s]+/, "").trim();
      if (
        cleaned.length >= 6 &&
        /\d/.test(cleaned) &&
        /[A-Z]/i.test(cleaned) &&
        !/seating|capacity|chassis|registration|make|model|year|body/i.test(cleaned)
      ) {
        return cleaned;
      }
    }
  }

  return "";
}

function extractChassisNumber(text) {
  // New India Assurance pattern
  const NIA_ChassisMatch = text.match(/(?:Chassis no\.\/Engine Number|Chassis No)\s*([A-Z0-9]{17})/i);
  if (NIA_ChassisMatch?.[1]) {
    return NIA_ChassisMatch[1].trim();
  }

  const inlinePatterns = [
    /\bChassis\s*(?:No|Number)(?:\.|:)?\s*:\s*([A-Z0-9]{10,25})/i,
    /\bChassis\s*(?:No|Number)(?:\.|:)?\s*-\s*([A-Z0-9]{10,25})/i,
    /\bChassis\s*(?:No|Number)(?:\.|:)?[ \t]+([A-Z0-9]{10,25})/i
  ];
  for (const pattern of inlinePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const index = text.search(/Chassis\s*(?:No|Number)\b/i);
  if (index !== -1) {
    const sub = text.substring(index, index + 300);
    const lines = sub.split("\n").map(l => l.trim()).filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cleaned = line.replace(/^[-:.\s]+/, "").trim();
      if (
        cleaned.length >= 10 &&
        cleaned.length <= 25 &&
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

function extractSeatingCapacity(text) {
  const index = text.search(/Seating\s*Capacity/i);
  if (index !== -1) {
    const sub = text.substring(index, index + 300);
    const lines = sub.split("\n").map(l => l.trim()).filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^(\d{1,2})/);
      if (m) {
        return m[1];
      }
    }
  }

  const patterns = [
    /\bSeating Capacity(?:\.|:)?\s*([0-9]{1,3})/i,
    /Seating\s*Capacity[^\d\n]*?(\d{1,3})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractNominee(text) {
  const nomineePattern = /\bNominees?\b(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,60})/i;
  const match = text.match(nomineePattern);
  if (match?.[1]) {
    const val = match[1].replace(/,\s*$/, "").trim();
    if (!/is a minor|relationship/i.test(val)) return val;
  }

  const fallbackPatterns = [
    /\bNominee Name(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,120})/i,
    /\bNominee(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,120})/i
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

function extractFinancer(text) {
  const patterns = [
    /\bHypothecated\/Lease Agreement with[ \t]*([A-Z0-9/&()., -]{2,80})/i,
    /\bHypothecated with[ \t]*([A-Z0-9/&()., -]{2,80})/i,
    /\bFinancier(?: Name)?(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,160})/i,
    /\bHypothecation(?:\.|:)?[ \t]*([A-Z0-9/&()., -]{3,160})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

module.exports = {
  extractPolicyFromPdf,
  extractPolicyFromText
};
