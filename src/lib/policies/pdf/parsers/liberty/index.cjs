const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("../../../../master/insurance-companies.cjs");
const { sliceText, cleanHdfcValue } = require("../../utils/text.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { normalizeAmount } = require("../../utils/amounts.cjs");

function extractLibertyMotor(text, sourceFile = "") {
  if (!isLibertyMotor(text)) return { documentDetected: false };

  const policyNumber = matchGroup(text, /Policy\s+No\.\s*\n?\s*(\d{8,30})/i) || 
                       matchGroup(text, /Covernote\s+No\s*\n?\s*(\d{8,30})/i);
  const insuredName = cleanHdfcValue(matchGroup(text, /Insured\s*\n\s*([A-Z\s]+?)\s*\n/i));
  const contactNumber = matchGroup(text, /Contact\s+Number\s*\n\s*\(M\)\s*\+?(\d{10,12})/i);
  
  // Extract dates
  // e.g. From 00:00 Hrs of 10/07/2026 To Midnight of 09/07/2027
  const periodMatch = text.match(/From\s+[0-9:]+\s*Hrs\s*of\s*(\d{2}\/\d{2}\/\d{4})\s*To\s*Midnight\s*of\s*(\d{2}\/\d{2}\/\d{4})/i);
  const policyStartDate = periodMatch ? periodMatch[1] : "";
  const policyEndDate = periodMatch ? periodMatch[2] : "";

  // Extract address
  // Address starts after "Address" and ends before "Covernote No"
  const addressMatch = text.match(/Address\s*\n([\s\S]+?)(?=\bCovernote\s+No\b)/i);
  const communicationAddress = addressMatch ? cleanHdfcValue(addressMatch[1].replace(/\n/g, " ").replace(/\s+/g, " ")) : "";

  const rto = cleanHdfcValue(matchGroup(text, /RTO\s+Location\s*\n\s*([A-Z\s]+?)\s*\n/i));

  // Extract Vehicle details
  const vehicle = extractLibertyVehicle(text);

  // Extract Premium details
  const netPremium = cleanLibertyAmount(
    matchGroup(text, /Net\s+Premium[\s`\n]*([0-9,]+\.\d{2})/i) ||
    matchGroup(text, /TOTAL\s+LIABILITY\s+PREMIUM[\s`\n]*([0-9,]+\.\d{2})/i)
  );

  const gstAmount = cleanLibertyAmount(
    matchGroup(text, /IGST[\s`\n]*([0-9,]+(?:\.\d{2})?)/i) ||
    matchGroup(text, /GST[\s`\n]*([0-9,]+(?:\.\d{2})?)/i)
  );

  const totalPremium = cleanLibertyAmount(
    matchGroup(text, /TOTAL\s+POLICY\s+PREMIUM[\s`\n]*([0-9,]+\.\d{2})/i)
  );

  return {
    documentDetected: true,
    companyName: normalizeCompanyFromMaster("Liberty General Insurance Limited"),
    policyType: "Two Wheeler Liability Policy",
    policyNumber,
    issuanceDate: matchGroup(text, /Policy\s+Issued\s+on\s*\n\s*(\d{2}\/\d{2}\/\d{4})/i) || 
                  matchGroup(text, /Date\s+of\s+Issue\s*:\s*(\d{2}\/\d{2}\/\d{4})/i) || policyStartDate,
    policyStartDate,
    policyEndDate,
    insuredName,
    communicationAddress,
    customerMobile: contactNumber,
    registrationNumber: vehicle.registrationNumber,
    vehicleMake: vehicle.vehicleMake,
    vehicleModel: vehicle.vehicleModel,
    variant: vehicle.variant,
    chassisNumber: vehicle.chassisNumber,
    engineNumber: vehicle.engineNumber,
    cubicCapacity: vehicle.cubicCapacity,
    seatingCapacity: vehicle.seatingCapacity,
    manufacturingYear: vehicle.manufacturingYear,
    rto,
    netLiabilityPremium: netPremium,
    totalPackagePremium: netPremium,
    gstAmount,
    totalPremium,
    basicOwnDamage: "0",
    basicThirdPartyLiability: netPremium,
    netOwnDamagePremium: "0"
  };
}

function isLibertyMotor(text) {
  return /Liberty\s+General\s+Insurance/i.test(text);
}

function extractLibertyVehicle(text) {
  const data = {
    registrationNumber: "",
    manufacturingYear: "",
    registrationDate: "",
    engineNumber: "",
    chassisNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    variant: "",
    cubicCapacity: "",
    seatingCapacity: ""
  };

  const match = text.match(/Registration\s+Mark[\s\S]+?TWO\s+WHEELER\s+LIABILITY\s+POLICY/i);
  if (!match) return data;

  const lines = match[0].split("\n").map(l => l.trim()).filter(Boolean);
  
  // Find where MP-04-MR-7706 or another registration number is.
  const regIndex = lines.findIndex(l => /^[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}$/i.test(l));
  if (regIndex === -1) return data;

  const valLines = lines.slice(regIndex);

  data.registrationNumber = valLines[0];

  let yearRegDate = "";
  let idx = 1;
  while (idx < valLines.length && !/^[A-Z0-9]{10,25}$/i.test(valLines[idx])) {
    yearRegDate += valLines[idx];
    idx++;
  }

  const mfgYearMatch = yearRegDate.match(/^\d{4}/);
  if (mfgYearMatch) data.manufacturingYear = mfgYearMatch[0];

  const dates = yearRegDate.match(/\d{2}-\d{2}-\d{4}/g) || [];
  if (dates[0]) data.registrationDate = dates[0];

  if (valLines[idx]) {
    data.engineNumber = valLines[idx];
    idx++;
  }

  if (valLines[idx]) {
    let chassis = valLines[idx];
    idx++;
    if (valLines[idx] && /^\d+$/.test(valLines[idx]) && valLines[idx].length <= 5) {
      chassis += valLines[idx];
      idx++;
    }
    data.chassisNumber = chassis;
  }

  let makeModelBody = "";
  while (idx < valLines.length && !/^\d+$/.test(valLines[idx])) {
    makeModelBody += (makeModelBody ? " " : "") + valLines[idx];
    idx++;
  }

  const ccSeat = valLines[idx] || "";
  if (ccSeat.length >= 4) {
    data.cubicCapacity = ccSeat.slice(0, -1);
    data.seatingCapacity = ccSeat.slice(-1);
  } else {
    data.cubicCapacity = ccSeat;
  }

  // Parse make, model, variant
  const parts = makeModelBody.split("/").map(p => p.trim());
  data.vehicleMake = parts[0] || "";
  data.vehicleModel = parts[1] || "";
  data.variant = parts.slice(2).join(" ") || "";

  return data;
}

function cleanLibertyAmount(value) {
  const normalized = normalizeAmount(value || "");
  return normalized.replace(/^0+(?=\d,)/, "");
}

module.exports = {
  extractLibertyMotor,
  isLibertyMotor,
  extractLibertyVehicle
};
