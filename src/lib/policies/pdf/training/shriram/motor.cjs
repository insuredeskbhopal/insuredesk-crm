const { normalizeAmount } = require("../../utils/amounts.cjs");
const { buildDuration } = require("../../utils/dates.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanHdfcValue } = require("../../utils/text.cjs");

const scope = { insurer: "shriram", category: "motor" };

function matches({ text = "" }) {
  return (
    /Shriram\s+General\s+Insurance/i.test(text) &&
    /Certificate\s*cum\s*Policy\s*Schedule|UIN\s*No\.?IRDAN137/i.test(text)
  );
}

function clean(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function amount(value = "") {
  return normalizeAmount(String(value).replace(/,/g, ""));
}

function assign(patch, key, value) {
  const normalized = clean(value);
  if (normalized && normalized !== "N.A" && normalized !== "N.A." && normalized !== "NA") {
    patch[key] = normalized;
  }
}

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const patch = {};

  // --- Policy Type Detection ---
  const isPackage = /PACKAGE\s+POLICY/i.test(text);
  const isLiabilityOnly = /LIABILITY\s+ONLY\s+POLICY/i.test(text) && !isPackage;

  const rawPolicyType = clean(
    matchGroup(text, /MOTOR\s+COMMERCIAL\s+VEHICLE\s*\(([^)]+)\)/i) ||
    matchGroup(text, /MOTOR\s+(COMMERCIAL\s+VEHICLE[^-\n]+)/i) ||
    ""
  );

  if (rawPolicyType) {
    patch.policyType = `MOTOR COMMERCIAL VEHICLE (${rawPolicyType})`;
    patch.productName = patch.policyType;
  } else if (isPackage) {
    patch.policyType = "MOTOR COMMERCIAL VEHICLE (PACKAGE POLICY)";
    patch.productName = patch.policyType;
  }

  if (isPackage) {
    patch.policyCoverType = "Comprehensive";
  } else if (isLiabilityOnly) {
    patch.policyCoverType = "Third Party";
  }

  // --- UIN ---
  assign(patch, "uinNumber", matchGroup(text, /UIN\s*No\.?\s*(IRDAN137[A-Z0-9]+)/i));

  // --- Policy Number ---
  assign(
    patch,
    "policyNumber",
    matchGroup(text, /Policy\s+No\.?\s*\n?\s*([0-9/]{10,25})/i) ||
    matchGroup(text, /policy\s+number\s*:\s*([0-9/]{10,25})/i)
  );

  // --- Insured Name ---
  const insuredName = clean(
    matchGroup(text, /Insured's\s+Code\s*\/\s*Name\s*\n?\s*IN-\d+\s*\/\s*([^\n]+)/i) ||
    matchGroup(text, /Insured's\s+Code\s*\/\s*Name\s*([^\n]+)/i) ||
    matchGroup(text, /Name\s+of\s+Insured\s*[:.-]?\s*([^\n]+)/i)
  );
  assign(patch, "insuredName", insuredName);
  if (insuredName) {
    patch.customerName = insuredName;
    patch.contactPerson = insuredName;
  }

  // --- Address ---
  const address = cleanHdfcValue(
    matchGroup(text, /Insured Address and\s*\n?\s*Contact Details\s*\n([\s\S]+?)(?=Insured Address as Per|CKYC|Insured State|$)/i) ||
    matchGroup(text, /Insured Address as Per\s*\n?\s*RC\s*\n([\s\S]+?)(?=CKYC|Insured State|$)/i)
  );
  assign(patch, "communicationAddress", address);
  assign(patch, "mailingAddress", address);

  // --- Contact ---
  const contactNumber =
    matchGroup(text, /Mob-\s*\*+(\d{4,10})/i) ||
    matchGroup(text, /Mobile\s*No\.?-?\s*(\d{10})/i);
  if (contactNumber) {
    patch.contactNumber = contactNumber;
    patch.customerMobile = contactNumber;
  }

  // --- Email ---
  assign(patch, "customerEmail", matchGroup(text, /Email-([^\s,]+@[^\s,]+)/i));

  // --- Registration Number ---
  const regMatch = text.match(/([A-Z]{2}\s*[-–—\s]\s*\d{2}\s*[-–—\s]\s*[A-Z]{1,3}\s*[-–—\s]\s*\n?\s*\d{4})\s*[&\s]+([A-Z ]+)/i);
  if (regMatch) {
    const regNum = regMatch[1].replace(/[\s\-–—]/g, "").toUpperCase();
    patch.registrationNumber = regNum;
    patch.vehicleNumber = regNum;
    const place = clean(regMatch[2]);
    if (place && !/ENGINE|CHASSIS/i.test(place)) {
      patch.rtoLocation = place;
    }
  }

  // --- Engine & Chassis ---
  const engineChassis = matchGroup(text, /ENGINE\s*NO\.?\s*[&]\s*CHASSIS\s*NO\.?[\s\S]*?\n\s*([A-Z0-9]+)\s*[&]\s*\n?\s*([A-Z0-9]+)/i);
  if (!engineChassis) {
    const engChassisMatch = text.match(/([A-Z0-9]{8,15})\s*[&]\s*\n?\s*([A-Z0-9]{17})/);
    if (engChassisMatch) {
      patch.engineNumber = engChassisMatch[1];
      patch.chassisNumber = engChassisMatch[2];
    }
  }

  // Better engine/chassis extraction from the vehicle table
  const engineMatch = matchGroup(text, /([A-Z]\d{2}[A-Z]{2}\d{7,})\s*[&]/i);
  const chassisMatch = matchGroup(text, /[&]\s*\n?\s*(MA[A-Z0-9]{15})/i) ||
    matchGroup(text, /[&]\s*\n?\s*([A-Z]{3}[A-Z0-9]{14})/i);
  if (engineMatch) patch.engineNumber = engineMatch;
  if (chassisMatch) patch.chassisNumber = chassisMatch;

  // --- Make / Model ---
  const makeModelRaw = matchGroup(text, /MAKE\s*-\s*MODEL[\s\S]*?\n\s*([^\n]+?\s*-\s*\n?[^\n]+?)(?=\n[A-Z]*HATCHBACK|\nSEDAN|\nSUV|\nPICKUP|\n[A-Z/\s]*\s*\/\s*(?:PETROL|DIESEL|CNG|LPG|ELECTRIC))/i) ||
    matchGroup(text, /([A-Z\s]+-\s*\n?\s*[A-Z0-9\s]+(?:BS\s*\d)?)\s*\n\s*(?:HATCHBACK|SEDAN|SUV|PICKUP|OPEN|CLOSED)/i);
  if (makeModelRaw) {
    const parts = makeModelRaw.replace(/\n/g, " ").split(/\s*-\s*/);
    if (parts.length >= 2) {
      patch.vehicleMake = clean(parts[0]);
      patch.vehicleModel = clean(parts.slice(1).join(" "));
      patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel}`;
    }
  }

  // --- Body Type & Fuel Type ---
  // Shriram PDFs concatenate: "HATCHBACK / CNG998 / 0 / 2025" (fuel immediately before CC digits)
  const bodyFuelMatch = text.match(/(HATCHBACK|SEDAN|SUV|PICKUP|OPEN LOAD BODY|CLOSED LOAD BODY|TRI AXLE[^\n]*)\s*\/\s*(CNG|PETROL|DIESEL|LPG|ELECTRIC)/i);
  if (bodyFuelMatch) {
    assign(patch, "bodyType", bodyFuelMatch[1]);
    assign(patch, "fuelType", bodyFuelMatch[2]);
  } else {
    assign(patch, "bodyType", matchGroup(text, /(?:TYPE OF BODY[\s\S]*?\n\s*)(HATCHBACK|SEDAN|SUV|PICKUP|OPEN LOAD BODY|CLOSED LOAD BODY|[A-Z\s]+?)\s*\//i));
    assign(patch, "fuelType", matchGroup(text, /\/\s*(CNG|PETROL|DIESEL|LPG|ELECTRIC)(?:\d{3,4}|\s)/i));
  }

  // --- Cubic Capacity / Manufacturing Year ---
  const ccYearMatch = text.match(/(\d{3,4})\s*\/\s*\d+\s*\/\s*(\d{4})/);
  if (ccYearMatch) {
    patch.cubicCapacity = ccYearMatch[1];
    patch.manufacturingYear = ccYearMatch[2];
  } else {
    assign(patch, "cubicCapacity", matchGroup(text, /CUBIC CAPACITY[\s\S]*?(\d{3,4})\s*\//i));
    assign(patch, "manufacturingYear", matchGroup(text, /YEAR OF\s*\n?\s*MANF\.?\s*\n?\s*.*?(\d{4})/i));
  }

  // --- Registration Date ---
  assign(
    patch,
    "registrationDate",
    matchGroup(text, /DATE OF\s*\n?\s*REGN\.?[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i)
  );

  // --- Seating Capacity ---
  assign(
    patch,
    "seatingCapacity",
    matchGroup(text, /SEAT CAP[\s\S]*?(\d\s*\+\s*\d)/i) ||
    matchGroup(text, /(\d\s*\+\s*\d)\s*$/im)
  );

  // --- IDV ---
  // Shriram PDFs concatenate IDV columns into one string like:
  // "0.000.00560000.000000560000.00"
  // We extract amounts starting with non-zero digit: "560000.00"
  const idvLine = matchGroup(text, /TOTAL VALUE\s*\n?\s*([0-9.]+)/i);
  let totalValue = "";
  if (idvLine) {
    // Match amounts that start with 1-9 (skip zero-only amounts)
    const nonZeroAmounts = idvLine.match(/[1-9]\d*\.\d{2}/g);
    if (nonZeroAmounts && nonZeroAmounts.length > 0) {
      // The last non-zero amount is TOTAL VALUE
      totalValue = amount(nonZeroAmounts[nonZeroAmounts.length - 1]);
    }
  }
  if (totalValue && totalValue !== "0.00") {
    patch.idv = totalValue;
    patch.totalIdv = totalValue;
    patch.vehicleIdv = totalValue;
    patch.sumInsured = totalValue;
  }

  // --- GSTIN ---
  assign(patch, "gstin", matchGroup(text, /GSTIN\s*No\.?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z])/i));

  // --- NCB ---
  const ncbVal = matchGroup(text, /NCB\s+Discount\s*\(%\)\s*\n?\s*(\d{1,2})/i);
  if (ncbVal) {
    patch.ncb = `${ncbVal}%`;
    patch.ncbPercentage = `${ncbVal}%`;
  }

  // --- Policy Period ---
  const startDate = matchGroup(text, /From\s+\d{2}:\d{2}\s+Hrs\s+of\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /Period\s+of\s+Insurance\s*\n?\s*From\s+\d{2}:\d{2}\s+Hrs\s+of\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /From\s+Date\s*[&]\s*Time\s*(\d{2}\/\d{2}\/\d{4})/i);
  const endDate = matchGroup(text, /Midnight\s+Of\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /To\s+Date\s*[&]\s*Time\s*(\d{2}\/\d{2}\/\d{4})/i);

  if (startDate) {
    patch.policyStartDate = startDate;
    patch.startDate = startDate;
    patch.issuanceDate = startDate;
  }
  if (endDate) {
    patch.policyEndDate = endDate;
    patch.expiryDate = endDate;
  }
  if (startDate && endDate) {
    patch.duration = buildDuration(startDate, endDate);
  }

  // --- Premiums ---
  if (isPackage) {
    const odTotal = amount(matchGroup(text, /OD TOTAL\s*([0-9,.]+)/i));
    const tpTotal = amount(matchGroup(text, /TP TOTAL\s*([0-9,.]+)/i));
    const totalPremium = amount(matchGroup(text, /TOTAL PREMIUM\s*([0-9,.]+)/i));
    const premiumAmount = amount(matchGroup(text, /PREMIUM AMOUNT\s*([0-9,.]+)/i));
    const basicTp = amount(matchGroup(text, /BASIC TP COVER\s*([0-9,.]+)/i));
    const sgst = amount(
      matchGroup(text, /SGST\/UTGST\s+\d+(?:\.\d+)?%\s*([0-9,.]+)/i) ||
      matchGroup(text, /SGST\/UTGST\s*\n?\s*([0-9]+)/i)
    );
    const cgst = amount(
      matchGroup(text, /CGST\s+\d+(?:\.\d+)?%\s*([0-9,.]+)/i) ||
      matchGroup(text, /CGST\s*\n?\s*([0-9]+)/i)
    );
    const igst = amount(matchGroup(text, /IGST\s*\n?\s*([0-9]+)/i));

    assign(patch, "odPremium", odTotal);
    assign(patch, "basicThirdPartyLiability", basicTp);
    assign(patch, "basicTpPremium", basicTp);
    assign(patch, "tpPremium", tpTotal);
    assign(patch, "liabilityPremium", tpTotal);
    assign(patch, "netLiabilityPremium", tpTotal);
    assign(patch, "netPremium", totalPremium);
    assign(patch, "basicPremium", totalPremium);
    assign(patch, "sgst", sgst);
    assign(patch, "cgst", cgst);
    assign(patch, "igst", igst);

    if (sgst || cgst || igst) {
      patch.gstAmount = (Number(sgst || 0) + Number(cgst || 0) + Number(igst || 0)).toFixed(2);
      patch.taxAmount = patch.gstAmount;
    }

    assign(patch, "totalPremium", premiumAmount);
    assign(patch, "grossPremium", premiumAmount);
    assign(patch, "premium", premiumAmount);
    assign(patch, "premiumIncludingGst", premiumAmount);

    // PA Owner Driver
    const paOwnerDriver = amount(matchGroup(text, /PA FOR OWNER DRIVER\s*([0-9,.]+)/i) ||
      matchGroup(text, /GR36A-PA FOR OWNER DRIVER\s*([0-9,.]+)/i));
    assign(patch, "ownerDriverPremium", paOwnerDriver);

    // Legal Liability for Paid Driver
    const legalLiability = amount(matchGroup(text, /Legal Liability Coverages?\s+For\s+Paid\s+Driver\s*([0-9,.]+)/i));
    assign(patch, "legalLiabilityPremium", legalLiability);

    // CNG/LPG cover
    assign(patch, "cngLpgCover", amount(matchGroup(text, /InBuilt CNG\/LPG\/LNG Cover\s*([0-9,.]+)/i)));
  } else {
    // Liability Only — use existing TP values
    const tpTotal = amount(matchGroup(text, /TP TOTAL\s*([0-9,.]+)/i) ||
      matchGroup(text, /TOTAL PREMIUM\s*([0-9,.]+)/i));
    const premiumAmount = amount(matchGroup(text, /PREMIUM AMOUNT\s*([0-9,.]+)/i));
    const basicTp = amount(matchGroup(text, /BASIC TP COVER\s*([0-9,.]+)/i));
    const sgst = amount(matchGroup(text, /SGST\/UTGST\s*\n?\s*([0-9]+)/i));
    const cgst = amount(matchGroup(text, /CGST\s*\n?\s*([0-9]+)/i));

    assign(patch, "basicThirdPartyLiability", basicTp);
    assign(patch, "netPremium", tpTotal);
    assign(patch, "netLiabilityPremium", tpTotal);
    assign(patch, "sgst", sgst);
    assign(patch, "cgst", cgst);
    if (sgst || cgst) {
      patch.gstAmount = (Number(sgst || 0) + Number(cgst || 0)).toFixed(2);
      patch.taxAmount = patch.gstAmount;
    }
    assign(patch, "totalPremium", premiumAmount);
    assign(patch, "grossPremium", premiumAmount);
    assign(patch, "premium", premiumAmount);
  }

  // --- Compulsory Deductible ---
  assign(patch, "compulsoryDeductible", amount(matchGroup(text, /Compulsory\s+Deductible\s+Rs\.?\s*([0-9,.]+)/i)));

  // --- IMT Endorsements ---
  const imtMatch = matchGroup(text, /Subject to IMT Endorsement[^:]*:\s*([^\n]+)/i);
  if (imtMatch) {
    patch.imtEndorsements = clean(imtMatch);
  }

  // --- Hypothecation ---
  const hypothecation = clean(matchGroup(text, /Hypothecation\s+Agreement\s+with:\s*([^\n]+)/i));
  if (hypothecation) {
    patch.hypothecation = hypothecation;
    patch.financier = hypothecation;
    patch.financerName = hypothecation;
  }

  // --- Nominee ---
  assign(patch, "nomineeName", clean(matchGroup(text, /Nominee for\s*\n?\s*Owner\/Driver\s*\n?\s*([^\n]+)/i)));
  assign(patch, "nomineeAge", matchGroup(text, /Nominee Age\s*\n?\s*(\d+)/i));
  assign(patch, "nomineeRelation", clean(matchGroup(text, /Nominee Relationship\s*\n?\s*([^\n]+)/i)));

  // --- Agent Details ---
  const agentRaw = matchGroup(text, /Agent Details\s*([^\n]+)/i);
  if (agentRaw) {
    const agentName = clean(matchGroup(agentRaw, /(?:Mr\.|Mrs\.|Ms\.)\s*([A-Z\s]+?)(?:\s*-\s*[A-Z]{2}\d|$)/i) || "");
    assign(patch, "agentName", agentName);
    const agentCode = matchGroup(agentRaw, /([A-Z]{2}\d{10})/i);
    assign(patch, "agentCode", agentCode);
    const agentMobile = matchGroup(text, /Agent Details[\s\S]*?Mobile\s+No\.?-?\s*(\d{10})/i);
    assign(patch, "agentMobile", agentMobile);
  }

  // --- Executive ---
  assign(patch, "executiveName", clean(matchGroup(text, /Executive\s*\n?\s*([A-Z\s]+?)(?:\s*-\s*NAN|\s*$)/im)));

  // --- Previous Insurer / Policy ---
  const prevInsurer = clean(matchGroup(text, /Previous Insurer\s*\n?\s*([^\n]+)/i));
  if (prevInsurer && !/^N\.?A\.?$/i.test(prevInsurer)) {
    patch.previousInsurer = prevInsurer;
  }
  const prevPolicy = clean(matchGroup(text, /Previous Policy No\.?\s*\n?\s*([^\n]+)/i));
  if (prevPolicy && !/^N\.?A\.?$/i.test(prevPolicy)) {
    patch.previousPolicyNumber = prevPolicy;
  }

  // --- Geographical Area ---
  assign(patch, "geographicalArea", clean(matchGroup(text, /Geographical Area\s*\n?\s*([^\n]+)/i)));

  // --- PA Cover ---
  const paCover = amount(matchGroup(text, /P\.A\.\s+Cover\s+under\s+Section\s+III\s+for\s+Owner\s*-\s*Driver\s*\(CSI\)\s*:\s*Rs\.?\s*([0-9,.]+)/i));
  if (paCover) patch.paOwnerDriverSumInsured = paCover;

  // --- Branch ---
  assign(patch, "branchAddress", clean(matchGroup(text, /Branch Address\s*\n([\s\S]+?)(?=Branch Office|Geographical)/i)));
  assign(patch, "branchPhone", matchGroup(text, /Branch Office Phone No\.?\s*\n?\s*(\d{10})/i));

  // --- Place ---
  assign(patch, "placeOfIssue", clean(matchGroup(text, /PLACE\s*:\s*([A-Z]+)/i)));

  // --- Gross Vehicle Weight (only set if found in text, not hardcoded) ---
  const gvw = matchGroup(text, /G\.?V\.?W\.?\s*[:\s]*([0-9,]+)/i);
  if (gvw) {
    patch.grossVehicleWeight = normalizeAmount(gvw);
  } else {
    // Clear the hardcoded value if this isn't a heavy vehicle
    patch.grossVehicleWeight = "";
  }

  // --- PAN ---
  const panNo = clean(matchGroup(text, /PAN No\.?\s*\n?\s*([^\n]+)/i));
  if (panNo && !/^N\.?A\.?$/i.test(panNo)) {
    patch.panNumber = panNo;
  } else {
    patch.panNumber = "";
  }

  // --- CIN ---
  assign(patch, "cinNumber", matchGroup(text, /CIN NO\.?\s*([A-Z0-9]+)/i));

  patch.extractionTrainingVersion = isPackage
    ? "SHRIRAM_MOTOR_PACKAGE_V1"
    : "SHRIRAM_MOTOR_LIABILITY_V1";

  return patch;
}

module.exports = { scope, matches, train };
