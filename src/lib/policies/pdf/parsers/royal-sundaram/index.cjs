const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("../../../../master/insurance-companies.cjs");
const { cleanHdfcValue } = require("../../utils/text.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { normalizeAmount, sumAmounts } = require("../../utils/amounts.cjs");
const { extractPolicyCoverType, normalizeFuelType } = require("../../utils/motor.cjs");

// Start of extractRoyalSundaramMotor (Lines 2581-2678)
function extractRoyalSundaramMotor(text, _sourceFile = "") {
  if (!isRoyalSundaramMotor(text)) return { documentDetected: false };

  const policyType = cleanHdfcValue(
    matchGroup(text, /(Goods Carrying Vehicle Policy\s*[-–—]\s*Liability only(?:\s*\[[^\]]+\])?)/i) ||
      matchGroup(text, /(Goods Carrying Vehicle Policy)/i),
  );
  const insuredName = cleanHdfcValue(
    matchGroup(
      text,
      /Invoice Date\s*:?\s*\d{1,2}\/\d{1,2}\/\d{4}\s*Address of insured:\s*Insured Name:\s*([^\n]+)/i,
    ) ||
      matchGroup(text, /Insured Name:\s*([^\n]+)/i) ||
      matchGroup(
        text,
        /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*\d{4}\s*([^\n]+)/i,
      ),
  );
  const policyNumber =
    matchGroup(text, /Certificate of Insurance and Policy No\.\s*([A-Z0-9/-]+)/i) ||
    matchGroup(text, /Policy Number\s*:?\s*([A-Z0-9/-]+)/i);
  const policyStartDate = matchGroup(text, /From\s*00:00\s*hours\s*on\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const policyEndDate = matchGroup(text, /To\s*Midnight\s*of\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const registrationNumber = matchGroup(text, /Registration Number\s*([A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4})/i);
  const vehicleModel = cleanHdfcValue(matchGroup(text, /Model Description\s*([^\n]+)/i));
  const vehicleMake = cleanHdfcValue(
    matchGroup(text, /Make of the Vehicle\s*([^\n]+?)(?=\s*Year of Manufacture|\n|$)/i),
  );
  const makeModel = [vehicleMake, vehicleModel].filter(Boolean).join(" ") || vehicleModel;
  const grossVehicleWeight = normalizeAmount(matchGroup(text, /Gross Vehicle Weight\(Kgs\)\s*([0-9,]+)/i));
  const engineNumber = matchGroup(text, /Engine Number\s*([A-Z0-9]{8,30})/i);
  const chassisNumber = matchGroup(text, /Chassis Number\s*([A-Z0-9]{8,30})/i);
  const bodyType = cleanHdfcValue(matchGroup(text, /Type of Body\s*([^\n]+)/i));
  const seatingCapacity = matchGroup(text, /Seating Capacity\s*\(including Driver\)\s*([0-9]+)/i);
  const fuelType = normalizeFuelType(matchGroup(text, /Fuel Type\s*([A-Za-z]+)/i));
  const manufacturingYear = matchGroup(text, /Year of Manufacture\s*(\d{4})/i);
  const registrationDate =
    matchGroup(
      text,
      /Name of Insured[\s\S]{0,240}?\d{1,2}\/\d{1,2}\/\d{4}India[A-Z ]+?(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ) || matchGroup(text, /Registration\s*Date[\s\S]{80,180}?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const totalPremium = normalizeAmount(
    matchGroup(text, /TOTAL PREMIUM\s*([0-9,]+\.\d{2})/i) ||
      matchGroup(text, /Total Premium \(in Rs\.\)\s*([0-9,]+)/i),
  );
  const basicThirdPartyLiability = normalizeAmount(
    matchGroup(text, /Basic premium including premium for TPPD\s*([0-9,]+\.\d{2})/i),
  );
  const netLiabilityPremium = normalizeAmount(
    matchGroup(text, /TOTAL LIABILITY PREMIUM \(B\)\s*([0-9,]+\.\d{2})/i),
  );
  const sgst = normalizeAmount(matchGroup(text, /ADD:SGST\s*([0-9,]+\.\d{2})/i));
  const cgst = normalizeAmount(matchGroup(text, /ADD:CGST\s*([0-9,]+\.\d{2})/i));
  const gstAmount = sumAmounts(sgst, cgst);
  const receiptNumber = matchGroup(text, /Receipt No\.\s*([A-Z0-9]+)/i);
  const receiptDate = matchGroup(text, /signed at [A-Za-z ]+ on (\d{1,2}\/\d{1,2}\/\d{4})/i);

  return {
    documentDetected: true,
    companyName: normalizeCompanyFromMaster("Royal Sundaram General Insurance Co. Limited"),
    policyType,
    policyNumber,
    insuredName,
    policyStartDate,
    policyEndDate,
    registrationNumber,
    vehicleMake,
    vehicleModel,
    makeModel,
    grossVehicleWeight,
    engineNumber,
    chassisNumber,
    bodyType,
    seatingCapacity,
    fuelType,
    manufacturingYear,
    registrationDate,
    totalPremium,
    policyCoverType: /Liability only/i.test(policyType)
      ? "Third Party"
      : extractPolicyCoverType(text, policyType),
    rtoLocation: matchGroup(
      text,
      /Registration\s*Authority\s*Registration\s*Date[\s\S]{0,120}?India([A-Z ]+?)\d{1,2}\/\d{1,2}\/\d{4}/i,
    ),
    contactNumber: matchGroup(text, /Contact:\s*([6-9]\d{9})/i) || matchGroup(text, /Mobile:\s*([^\n]+)/i),
    gstin: matchGroup(text, /GSTIN\s*:?\s*([A-Z0-9]{15})/i),
    panNumber: matchGroup(text, /PAN Number:\s*([A-Z0-9]+)/i),
    geographicalArea: matchGroup(text, /Name of Insured[\s\S]{0,200}?\b(India)\b/i),
    basicThirdPartyLiability,
    netLiabilityPremium,
    sgst,
    cgst,
    gstAmount,
    receiptNumber,
    receiptDate,
  };
}

// Start of isRoyalSundaramMotor (Lines 2680-2686)
function isRoyalSundaramMotor(text) {
  return (
    /Royal\s+Sundaram\s+General\s+Insurance/i.test(text) &&
    /Certificate\s*of\s*Insurance|CERTIFICATEOFINSURANCE/i.test(text) &&
    /Registration Number|Vehicle Details|Motor Vehicles Act/i.test(text)
  );
}

module.exports = {
  extractRoyalSundaramMotor,
  isRoyalSundaramMotor
};
