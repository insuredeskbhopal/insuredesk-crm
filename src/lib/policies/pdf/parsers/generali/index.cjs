const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("../../../../master/insurance-companies.cjs");
const { sliceText, cleanHdfcValue } = require("../../utils/text.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { normalizeAmount } = require("../../utils/amounts.cjs");

// Start of extractGeneraliMotor (Lines 2807-2875)
function extractGeneraliMotor(text) {
  if (!isGeneraliMotor(text)) return { documentDetected: false };

  const invoiceBlock = sliceText(text, /Tax Invoice/i, /Motor Protect Private Car Package Policy/i) || text;
  const scheduleBlock =
    sliceText(text, /Motor Protect Private Car Package Policy/i, /INSURED'S DECLARED VALUE/i) || text;
  const premiumBlock = sliceText(text, /INSURED'S DECLARED VALUE/i, /Class of Vehicle/i) || text;
  const vehicle = extractGeneraliVehicle(scheduleBlock);

  return {
    documentDetected: true,
    companyName: normalizeCompanyFromMaster("Generali Central Insurance Company Limited"),
    policyType: cleanHdfcValue(
      matchGroup(text, /(MOTOR PROTECT PRIVATE CAR PACKAGE POLICY)/i) ||
        matchGroup(text, /(Motor Protect Private Car Package Policy)/i) ||
        matchGroup(text, /(PRIVATE CAR PACKAGE POLICY)/i),
    ),
    policyNumber: extractGeneraliPolicyNumber(text),
    invoiceNumber: matchGroup(text, /\b([A-Z0-9]{8,24})\s*:\s*Invoice Number/i),
    issuanceDate:
      matchGroup(text, /Date of Issue\s*\/\s*Invoice Date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
      matchGroup(text, /Date of Issue\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i),
    policyStartDate: extractGeneraliPeriod(text, "start"),
    policyEndDate: extractGeneraliPeriod(text, "end"),
    insuredName: extractGeneraliInsuredName(text),
    communicationAddress: extractGeneraliAddress(invoiceBlock),
    customerMobile: matchGroup(text, /Telephone\s*\(Mob,Off\)\s*:?\s*([0-9Xx*]{8,14})/i),
    customerEmail: matchGroup(text, /Email\s+Id\s*:?\s*([A-Z0-9*._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i),
    panNumber: matchGroup(text, /(?:^|\n)\s*PAN Number\s*:?\s*([A-Z]{5}\d{4}[A-Z])/i),
    vehicleMake: vehicle.make,
    vehicleModel: vehicle.model,
    registrationNumber: vehicle.registrationNumber,
    rto: vehicle.rto,
    chassisNumber: vehicle.chassisNumber,
    engineNumber: vehicle.engineNumber,
    cubicCapacity: vehicle.cubicCapacity,
    seatingCapacity: vehicle.seatingCapacity,
    manufacturingYear: vehicle.manufacturingYear,
    bodyType: vehicle.bodyType,
    totalIdv: extractGeneraliTotalIdv(premiumBlock),
    geographicalArea: matchGroup(text, /Geographical Area\s*:?\s*([A-Z][A-Z ]{2,40})/i),
    compulsoryDeductible: cleanGeneraliAmount(
      matchGroup(text, /Compulsory Deductible[\s\S]{0,100}?([0-9,]+\.\d{2})\s*\/-/i),
    ),
    basicOwnDamage: cleanGeneraliAmount(
      matchGroup(premiumBlock, /Basic Premium on Vehicle\s*([0-9,]+\.\d{1,2})/i),
    ),
    basicThirdPartyLiability: cleanGeneraliAmount(
      matchGroup(premiumBlock, /Basic Premium including Premium for TPPD\s*([0-9,]+\.\d{1,2})/i),
    ),
    netOwnDamagePremium: cleanGeneraliAmount(
      matchGroup(premiumBlock, /Total Own Damage Premium\s*\(A\)[^\d]*([0-9,]+\.\d{1,2})/i),
    ),
    netLiabilityPremium: cleanGeneraliAmount(
      matchGroup(premiumBlock, /Total Liability Premium\s*\(B\)\s*([0-9,]+\.\d{1,2})/i),
    ),
    totalPackagePremium: cleanGeneraliAmount(
      matchGroup(premiumBlock, /Total Annual Premium\s*\(A\+B\)\s*([0-9,]+\.\d{1,2})/i),
    ),
    gstAmount: cleanGeneraliAmount(matchGroup(premiumBlock, /Goods and Service Tax\s*([0-9,]+\.\d{1,2})/i)),
    totalPremium: extractGeneraliTotalPremium(text),
    previousPolicyNumber: matchGroup(text, /Previous Policy No\s*:?\s*([A-Z0-9/-]+)/i),
    ncbPercentage:
      matchGroup(text, /No Claim Discount\s*\((\d{1,2}%)/i) || matchGroup(text, /\bNCB[^\d]*(\d{1,2}%)/i),
    bankName: extractGeneraliFinancer(text),
    nomineeName: extractGeneraliNominee(text),
    financerName: extractGeneraliFinancer(text),
  };
}

// Start of isGeneraliMotor (Lines 2877-2886)
function isGeneraliMotor(text) {
  const hasCompany =
    /Generali\s+Central\s+Insurance\s+Company\s+Limited/i.test(text) ||
    /Future\s+Generali\s+India\s+Insurance\s+Company\s+Limited/i.test(text);
  const hasMotorSignal =
    /Motor Protect Private Car Package Policy/i.test(text) ||
    /PRIVATE\s+CAR\s+PACKAGE\s+POLICY/i.test(text) ||
    /INSURED MOTOR VEHICLE DETAILS/i.test(text);
  return hasCompany && hasMotorSignal;
}

// Start of extractGeneraliPolicyNumber (Lines 2888-2899)
function extractGeneraliPolicyNumber(text) {
  const patterns = [
    /Policy No\.?\s*:?\s*([0-9]{2,4}\/[0-9]{2}\/[0-9]{2}\/[0-9]{4}\/[A-Z]+\/[0-9]+)/i,
    /Policy Number\s*:?\s*([0-9]{2,4}\/[0-9]{2}\/[0-9]{2}\/[0-9]{4}\/[A-Z]+\/[0-9]+)/i,
    /Your Policy No\.?\s+is\s+([0-9]{2,4}\/[0-9]{2}\/[0-9]{2}\/[0-9]{4}\/[A-Z]+\/[0-9]+)/i,
  ];
  for (const pattern of patterns) {
    const value = matchGroup(text, pattern);
    if (value) return value;
  }
  return "";
}

// Start of extractGeneraliPeriod (Lines 2901-2907)
function extractGeneraliPeriod(text, side) {
  const match = text.match(
    /Period of Insurance\s*:?\s*From\s*(?:[0-9:]+\s*hours\s*of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})\s*To\s*(?:Midnight\s*of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (!match) return "";
  return side === "start" ? match[1] : match[2];
}

// Start of extractGeneraliInsuredName (Lines 2909-2920)
function extractGeneraliInsuredName(text) {
  const patterns = [
    /Name of\s*Insured\/Proposer\s*:?\s*([A-Z .]+?)(?:\s+GCI State Code|\s+Address:|\n)/i,
    /Name of Insured\/Proposer\s*:?\s*([A-Z .]+?)(?:\s+GCI State Code|\s+Address:|\n)/i,
    /Dear\s+([A-Z .]+?),/i,
  ];
  for (const pattern of patterns) {
    const value = cleanHdfcValue(matchGroup(text, pattern));
    if (value && !/insured details|registration/i.test(value)) return value;
  }
  return "";
}

// Start of extractGeneraliAddress (Lines 2922-2931)
function extractGeneraliAddress(text) {
  const match = text.match(
    /Address\s*:\s*([\s\S]+?)(?:GSTIN Number|GCI GSTIN Number|CKYC|Place of Supply|Telephone|Email Id)/i,
  );
  if (!match?.[1]) return "";
  return cleanHdfcValue(match[1].replace(/\n/g, " "))
    .replace(/\s*Pincode\s*:\s*/i, " Pincode: ")
    .replace(/\s*(?:State|City)\s*:\s*$/i, "")
    .trim();
}

// Start of extractGeneraliVehicle (Lines 2933-2968)
function extractGeneraliVehicle(text) {
  const data = {
    registrationNumber: "",
    rto: "",
    make: "",
    model: "",
    engineNumber: "",
    chassisNumber: "",
    manufacturingYear: "",
    cubicCapacity: "",
    bodyType: "",
    seatingCapacity: "",
  };

  const vehicleMatch = text.match(
    /\b([A-Z]{2}-\d{2}-[A-Z]{1,3}-\d{4}),\s*([A-Z ]+?)(MARUTI SUZUKI|MARUTI|HYUNDAI|HONDA|TATA|MAHINDRA|TOYOTA|FORD|RENAULT|NISSAN|VOLKSWAGEN|KIA|MG|SKODA)([\s\S]{0,120}?)\n\s*([A-Z0-9]{8,20})([A-Z0-9]{17})/i,
  );
  if (vehicleMatch) {
    data.registrationNumber = vehicleMatch[1].trim();
    data.rto = cleanHdfcValue(vehicleMatch[2]);
    data.make = cleanHdfcValue(vehicleMatch[3]);
    data.model = cleanHdfcValue(vehicleMatch[4].replace(/\n/g, " "));
    data.engineNumber = vehicleMatch[5].trim();
    data.chassisNumber = vehicleMatch[6].trim();
  }

  const specMatch = text.match(/Premium\s*\n\s*(\d{4})(\d{3,4})([A-Z ]+?)(\d)([0-9,]+\.\d{2})/i);
  if (specMatch) {
    data.manufacturingYear = specMatch[1];
    data.cubicCapacity = specMatch[2];
    data.bodyType = cleanHdfcValue(specMatch[3]);
    data.seatingCapacity = specMatch[4];
  }

  return data;
}

// Start of extractGeneraliTotalIdv (Lines 2970-2976)
function extractGeneraliTotalIdv(text) {
  const beforeYear = text.split(/Year\s*1\s*IDV/i)[0] || text;
  const amounts = Array.from(beforeYear.matchAll(/\b\d{1,3}(?:,\d{2,3})+\.\d{2}\b/g)).map(
    (match) => match[0],
  );
  return amounts.length ? cleanGeneraliAmount(amounts[amounts.length - 1]) : "";
}

// Start of extractGeneraliTotalPremium (Lines 2978-2984)
function extractGeneraliTotalPremium(text) {
  return cleanGeneraliAmount(
    matchGroup(text, /Total Premium\s*\(rounded off\)\s*([0-9,]+\.\d{1,2})/i) ||
      matchGroup(text, /Rs\.\s*([0-9,]+\.\d{1,2})\s*being the amount towards premium/i) ||
      matchGroup(text, /Total\s*\(Rounded to the nearest rupee\)\s*([0-9,]+\.\d{1,2})/i),
  );
}

// Start of extractGeneraliNominee (Lines 2986-2990)
function extractGeneraliNominee(text) {
  return cleanHdfcValue(
    matchGroup(text, /nominee[\s\S]{0,120}?\bis\s*1\)\s*([A-Z .]+?)(?:,\s*Age|\s*Age:)/i),
  );
}

// Start of extractGeneraliFinancer (Lines 2992-2999)
function extractGeneraliFinancer(text) {
  return cleanHdfcValue(
    matchGroup(
      text,
      /Hypothecation Agreement with:-\s*1\)\s*Hypothecation\s*-\s*([A-Z0-9 &().,-]+?)(?:\n|$)/i,
    ) || matchGroup(text, /Hypothecation\s*-\s*([A-Z0-9 &().,-]+?)(?:\n|$)/i),
  );
}

// Start of cleanGeneraliAmount (Lines 3016-3019)
function cleanGeneraliAmount(value) {
  const normalized = normalizeAmount(value || "");
  return normalized.replace(/^0+(?=\d,)/, "");
}

module.exports = {
  extractGeneraliMotor,
  isGeneraliMotor,
  extractGeneraliPolicyNumber,
  extractGeneraliPeriod,
  extractGeneraliInsuredName,
  extractGeneraliAddress,
  extractGeneraliVehicle,
  extractGeneraliTotalIdv,
  extractGeneraliTotalPremium,
  extractGeneraliNominee,
  extractGeneraliFinancer,
  cleanGeneraliAmount
};
