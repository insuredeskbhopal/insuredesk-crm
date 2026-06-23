const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("../../../../master/insurance-companies.cjs");
const { sliceText } = require("../../utils/text.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { normalizeAmount } = require("../../utils/amounts.cjs");
const { normalizeFuelType } = require("../../utils/motor.cjs");

// Start of isGoDigitMotor (Lines 6780-6794)
function isGoDigitMotor(text) {
  if (
    /\bTHE\s+NEW\s+INDIA\s+ASSURANCE\s+CO\.?\s+LTD\.?\b/i.test(text) ||
    /\bNew\s+India\s+Assurance\b/i.test(text)
  ) {
    return false;
  }

  const hasGoDigitCompanyMarker =
    /Go\s+Digit/i.test(text) || /godigit\.com/i.test(text) || /hello@godigit\.com/i.test(text);

  if (!hasGoDigitCompanyMarker) return false;

  const signals = [/Digit\s+Private[- ]Car/i, /IRDAN158/i, /Own\s+Damage\s+Policy/i];
  let matches = 0;
  for (const pattern of signals) {
    if (pattern.test(text)) {
      matches++;
    }
  }
  return matches >= 1;
}

// Start of normalizeGoDigitDate (Lines 6796-6830)
function normalizeGoDigitDate(dateStr) {
  if (!dateStr) return "";
  const cleaned = dateStr.replace(/[^a-zA-Z0-9-]/g, "").trim();

  // YYYY-MM-DD format
  const ymdMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
  }

  // DD-MonthName-YYYY format (e.g. 30-May-2026)
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    let day = parts[0].trim().padStart(2, "0");
    let monthName = parts[1].trim().toUpperCase();
    let year = parts[2].trim();
    const months = {
      JAN: "01",
      FEB: "02",
      MAR: "03",
      APR: "04",
      MAY: "05",
      JUN: "06",
      JUL: "07",
      AUG: "08",
      SEP: "09",
      OCT: "10",
      NOV: "11",
      DEC: "12",
    };
    const month = months[monthName] || monthName;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

// Start of extractGoDigitMotor (Lines 6832-7042)
function extractGoDigitMotor(text, _sourceFile = "") {
  if (!isGoDigitMotor(text)) return { documentDetected: false };

  const companyName = normalizeCompanyFromMaster(
    matchGroup(text, /(Go\s+Digit\s+General\s+Insurance\s+Ltd\.)/i) || "Go Digit General Insurance Ltd.",
  );

  // Insured Name
  const nameMatch = text.match(/Name\s*([A-Za-z\s]+?)\s*Vehicle\s+Registration/i);
  const insuredName = nameMatch ? nameMatch[1].trim() : "";

  // Policy Number: IA followed by 9 digits
  const policyNumber = matchGroup(text, /\b(IA\d{9})\b/i);

  // Policy Type
  const policyType =
    matchGroup(text, /(Digit\s+Private[- ]Car\s+Stand-alone\s+Own\s+Damage\s+Policy)/i) ||
    "Digit Private Car Stand-alone Own Damage Policy";

  // Period of policy dates
  let policyStartDate = "";
  let policyEndDate = "";
  const footerDatesMatch = text.match(/(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})/);
  if (footerDatesMatch) {
    policyStartDate = normalizeGoDigitDate(footerDatesMatch[1]);
    policyEndDate = normalizeGoDigitDate(footerDatesMatch[2]);
  } else {
    const periodBlock = sliceText(text, /Period of Policy/i, /AddOn Cover/i) || text;
    const dates = [];
    const dateRegex = /\b(\d{1,2}-[A-Za-z]{3}-\d{4})\b/g;
    let m;
    while ((m = dateRegex.exec(periodBlock)) !== null) {
      dates.push(m[1]);
    }
    if (dates.length >= 2) {
      policyStartDate = normalizeGoDigitDate(dates[0]);
      policyEndDate = normalizeGoDigitDate(dates[1]);
    }
  }

  // Registration Number / Vehicle Number
  const regMatch = text.match(/Vehicle\s*Registration\s*No\.?\s*([A-Z0-9 \t-]+)/i);
  const registrationNumber = regMatch ? regMatch[1].replace(/\s+/g, "").toUpperCase() : "";

  // Make Model & Variant
  let makeModel = "";
  let vehicleMake = "";
  let vehicleModel = "";
  const footerVehicleMatch = text.match(
    /\b([A-Z]{2}\d{2}[A-Z0-9]{5,6})\s+([A-Z0-9\s-]+?)\s+\d{4}-\d{2}-\d{2}/i,
  );
  if (footerVehicleMatch) {
    makeModel = footerVehicleMatch[2].trim();
    const parts = makeModel.split(/\s+/);
    vehicleMake = parts[0] || "";
    vehicleModel = parts.slice(1).join(" ") || "";
  }

  let variant = "";
  const modelVariantMatch = text.match(
    /Model\/Vehicle\s+Variant[\s\S]*?Type\)\s*\r?\n?\s*([^\n]+?)(?=CNG\/LPG|$)/i,
  );
  if (modelVariantMatch) {
    const fullVal = modelVariantMatch[1].trim();
    const slashIdx = fullVal.indexOf("/");
    if (slashIdx !== -1) {
      variant = fullVal.substring(slashIdx + 1).trim();
    } else {
      variant = fullVal;
    }
  }

  // Manufacturing Year & Registration Date
  let manufacturingYear = "";
  let registrationDate = "";
  const yearMatch = text.match(/Year\s+of\s+Regn\/Year\s+of\s+Mfg\.?\s*([0-9-]+)\/([0-9-]+)/i);
  if (yearMatch) {
    const p1 = yearMatch[1].trim();
    const p2 = yearMatch[2].trim();
    if (/^\d{4}$/.test(p1)) {
      manufacturingYear = p1;
      registrationDate = p2;
    } else if (/^\d{4}$/.test(p2)) {
      manufacturingYear = p2;
      registrationDate = p1;
    } else {
      manufacturingYear = p1;
      registrationDate = p2;
    }
  }

  // Engine Number & Chassis Number
  const engineMatch = text.match(/Engine\s+No\.?\s*([A-Z0-9]+)/i);
  const engineNumber = engineMatch ? engineMatch[1].trim().toUpperCase() : "";

  const chassisMatch = text.match(/Chassis\s+No\.?\s*([A-Z0-9]+)/i);
  const chassisNumber = chassisMatch ? chassisMatch[1].trim().toUpperCase() : "";

  // Seating Capacity
  const seatingMatch = text.match(/Seating\s+Capacity\s*(\d+)/i);
  const seatingCapacity = seatingMatch ? seatingMatch[1] : "";

  // RTO Location
  const rtoMatch = text.match(/RTO\s+Location\s*\r?\n?\s*([A-Za-z\s,.-]+?)(?=\r?\n|$|Vehicle)/i);
  const rtoLocation = rtoMatch ? rtoMatch[1].trim() : "";

  // Fuel Type & Cubic Capacity
  const fuelType = normalizeFuelType(matchGroup(text, /Fuel\s+Type\s*([A-Za-z]+)/i));
  const ccMatch = text.match(/Cubic\s+Capacity\s*(\d+)/i);
  const cubicCapacity = ccMatch ? ccMatch[1].trim() : "";

  // IDVs
  const idv = normalizeAmount(
    matchGroup(text, /Total\s+IDV[\s\S]{0,20}?([0-9,]+\.\d{2})/i) ||
      matchGroup(text, /Vehicle\s+IDV[\s\S]{0,20}?([0-9,]+)/i),
  );
  const totalIdv = idv;

  // Premiums
  const lines = text.split("\n").map((l) => l.trim());
  const netPremiumIdx = lines.findIndex((l) => /^Net\s+Premium$/i.test(l));
  let netPremium = "";
  let totalPremium = "";
  let odPremium = "";
  let gstAmount = "";

  if (netPremiumIdx !== -1) {
    const decimalNumbers = [];
    for (let i = netPremiumIdx - 1; i >= 0 && decimalNumbers.length < 8; i--) {
      const line = lines[i];
      const match = line.match(/^([0-9,]+\.\d{2})$/);
      if (match) {
        decimalNumbers.push(match[1]);
      }
    }
    if (decimalNumbers.length >= 3) {
      netPremium = decimalNumbers[0];
      odPremium = decimalNumbers[1];
      totalPremium = decimalNumbers[2];
    }
    if (decimalNumbers.length >= 5) {
      gstAmount = decimalNumbers[4];
    }
  }

  // CGST & SGST
  const cgstMatch = text.match(/CGST\s*@\s*\d+%\s*=\s*(?:\([^0-9]*([0-9.]+)\)|([0-9.]+))/i);
  const cgst = cgstMatch ? normalizeAmount(cgstMatch[1] || cgstMatch[2]) : "";

  const sgstMatch = text.match(/SGST(?:\/UTGST)?\s*@\s*\d+%\s*=\s*(?:\([^0-9]*([0-9.]+)\)|([0-9.]+))/i);
  const sgst = sgstMatch ? normalizeAmount(sgstMatch[1] || sgstMatch[2]) : "";

  // TP + Driver + Owner Premium
  const tpDriverOwner = "0.00";

  // NCB Percentage
  let ncbPercentage = "";
  const ncbMatch = text.match(/NCB\s*%\s*\(Current\s+Policy\)[\s\S]{0,500}?(\d+)\s*%/i);
  if (ncbMatch) {
    ncbPercentage = ncbMatch[1] + "%";
  }

  // Cover Type
  const policyCoverType = "Own Damage";

  // Others for completeness
  const gstinMatch = text.match(/GST\s+Reg\s+No\s+([A-Z0-9]+)/i);
  const gstin = gstinMatch ? gstinMatch[1].trim() : "";
  const customerMobile = matchGroup(text, /Mobile\s*\r?\n?\s*([0-9Xx*]+)/i);
  const customerEmail = matchGroup(
    text,
    /Email\s*\r?\n?\s*([a-zA-Z0-9*._%+-]+@[a-zA-Z0-9*.-]+\.[a-zA-Z]{2,})/i,
  );

  return {
    documentDetected: true,
    companyName,
    policyNumber,
    insuredName,
    policyType,
    policyStartDate,
    policyEndDate,
    registrationNumber,
    vehicleMake,
    vehicleModel,
    makeModel,
    variant,
    engineNumber,
    chassisNumber,
    fuelType,
    cubicCapacity,
    manufacturingYear,
    registrationDate,
    seatingCapacity,
    idv,
    totalIdv,
    totalPremium,
    netPremium,
    odPremium,
    tpDriverOwner,
    gstAmount,
    cgst,
    sgst,
    rtoLocation,
    customerMobile,
    customerEmail,
    gstin,
    ncbPercentage,
    policyCoverType,
  };
}

module.exports = {
  isGoDigitMotor,
  normalizeGoDigitDate,
  extractGoDigitMotor
};
