const { normalizeAmount } = require("../../utils/amounts.cjs");
const { buildDuration } = require("../../utils/dates.cjs");
const { matchGroup } = require("../../utils/regex.cjs");

const scope = { insurer: "new-india", category: "motor" };

function matches({ text = "", result = {} }) {
  const company = String(result.insuranceCompany || result.companyName || "");
  const format = String(result.documentFormat || "");
  if (company && !/NEW\s+INDIA/i.test(company) && !/Bundled\/Liability\s+Insurer:\s*HDFC/i.test(text)) {
    return false;
  }
  const isNewIndiaCompany = /NEW\s+INDIA/i.test(company) || /NEW\s+INDIA/i.test(text);
  const isMotor = /Motor|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Liability\s+Only/i.test(
    result.documentCategory || result.policyType || format || text,
  );
  return isNewIndiaCompany && isMotor;
}

function clean(value = "") {
  return String(value).replace(/[\r\n\s]+/g, " ").trim();
}

function amount(value = "") {
  return normalizeAmount(String(value).replace(/,/g, ""));
}

function assign(patch, key, value) {
  const normalized = clean(value);
  if (normalized) patch[key] = normalized;
}

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const patch = {};

  // 1. Policy Number & UIN
  assign(
    patch,
    "policyNumber",
    matchGroup(text, /Policy Number\s*:?\s*(\d{15,25})/i) ||
      matchGroup(text, /Policy No\.\s*:?\s*(\d{15,25})/i),
  );
  assign(patch, "uinNumber", matchGroup(text, /UIN Number\s*-\s*([A-Z0-9]+)/i));

  // 2. Policy Type & Product Name
  const policyTypeMatch = text.match(/POLICY\s+SCHEDULE\s+CUM\s+CERTIFICATE\s+OF\s+INSURANCE\s*\n\s*([^\n\r]+)/i);
  if (policyTypeMatch) {
    const rawType = clean(policyTypeMatch[1].replace(/UIN\s+Number.*/i, ""));
    if (rawType && !/UIN/i.test(rawType)) {
      patch.policyType = rawType;
      patch.productName = rawType;
    }
  }
  if (!patch.productName) {
    if (/Commercial\s+Vehicle\s+Liability\s+Only\s+Policy/i.test(text)) {
      patch.productName = "Commercial Vehicle Liability Only Policy";
      patch.policyType = "Commercial Vehicle Liability Only Policy";
    } else if (/Commercial\s+Vehicle\s+Package\s+Policy/i.test(text)) {
      patch.productName = "Commercial Vehicle Package Policy";
      patch.policyType = "Commercial Vehicle Package Policy";
    } else if (/Private\s+Car\s+Package\s+Policy/i.test(text)) {
      patch.productName = "Private Car Package Policy";
      patch.policyType = "Private Car Package Policy";
    }
  }

  if (/Liability\s+Only/i.test(patch.policyType || text)) {
    patch.policyCoverType = "Third Party";
  } else if (/Standalone\s+(?:Motor\s+)?Own\s+Damage|Own\s+Damage\s+Only/i.test(patch.policyType || text)) {
    patch.policyCoverType = "Standalone Own Damage";
  } else if (/Package/i.test(patch.policyType || text)) {
    patch.policyCoverType = "Comprehensive";
  }

  // 3. Insured Details
  const insuredName = clean(
    matchGroup(text, /Insured'?s?\s*Name\s*:?\s*([A-Z\s.-]+?)(?=Customer\s*ID|Customer|ID|PAN|Address|\n|$)/i),
  );
  if (insuredName) {
    patch.insuredName = insuredName;
    patch.customerName = insuredName;
    patch.contactPerson = insuredName;
  }
  assign(patch, "customerId", matchGroup(text, /Customer ID\s*[:\s]*([A-Z0-9]+)/i));
  assign(patch, "panNumber", matchGroup(text, /PAN\s+No\s*:?\s*([A-Z0-9]{10})/i));
  if (patch.panNumber) patch.pan = patch.panNumber;

  const addressMatch = matchGroup(
    text,
    /Insured'?s?\s*Address\s*:?\s*([\s\S]+?)(?=Contact Number|Email|GSTIN|POLICY DETAILS|$)/i,
  );
  if (addressMatch) {
    const cleanAddr = clean(addressMatch);
    patch.mailingAddress = cleanAddr;
    patch.communicationAddress = cleanAddr;
    patch.address = cleanAddr;
    const pin = cleanAddr.match(/\b(\d{6})\b/);
    if (pin) patch.pinCode = pin[1];
  }

  const contactNo =
    matchGroup(text, /Contact Number\s*\/[^\n]*?([0-9X]{10})/i) ||
    matchGroup(text, /Contact Number\s*:?\s*([0-9X]+)/i);
  if (contactNo && contactNo !== "NA") {
    patch.contactNumber = contactNo;
    patch.customerMobile = contactNo;
  }

  const insuredEmailMatch = text.match(
    /INSURED\s+DETAILS[\s\S]*?Email\s*([a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9\s.-]+?)(?=\s*GSTIN|\s*POLICY|POLICY\s+DETAILS|$)/i,
  );
  if (insuredEmailMatch) {
    const cleanEmail = insuredEmailMatch[1].replace(/[\r\n\s]+/g, "").replace(/\.+$/, "").trim();
    patch.customerEmail = cleanEmail;
    patch.email = cleanEmail;
  }

  const gstinMatch =
    matchGroup(text, /GSTIN\s*([0-9A-Z]{15})/i) ||
    matchGroup(text, /GSTIN\(Issuing\s+Office\)\s*([0-9A-Z]{15})/i);
  if (gstinMatch && gstinMatch !== "NA") {
    patch.gstin = gstinMatch;
  }

  // 4. Policy Period & Receipts
  const periodMatch = text.match(
    /Period\s+of\s+(?:cover|insurance)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})(?:\s+[0-9:]+\s*(?:AM|PM)?)?\s+to\s+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
  );
  if (periodMatch) {
    patch.startDate = periodMatch[1].trim();
    patch.expiryDate = periodMatch[2].trim();
    patch.policyStartDate = patch.startDate;
    patch.policyEndDate = patch.expiryDate;
    patch.duration = buildDuration(patch.startDate, patch.expiryDate);
  }

  assign(
    patch,
    "receiptNumber",
    matchGroup(text, /Receipt Number\s*([0-9A-Z\s/-]+?)(?=\s*Previous|Previous|$)/i),
  );
  assign(patch, "taxInvoiceNo", matchGroup(text, /Tax Invoice No\s*:\s*([0-9A-Z]+)/i));
  if (patch.taxInvoiceNo) {
    patch.invoiceNumber = patch.taxInvoiceNo;
  }

  // 5. Previous & Bundled Policy Details
  const prevInsurerMatch = text.match(
    /Previous\s+Insurer\s*:?\s*([A-Z0-9 /&.,-]+?)(?=\s*Previous\s+Policy\s+Number|$)/i,
  );
  if (prevInsurerMatch) {
    patch.previousInsurer = clean(prevInsurerMatch[1].replace(/Previous.*/i, ""));
  }
  assign(patch, "previousPolicyNumber", matchGroup(text, /Previous\s+Policy\s+Number\s*:?\s*([A-Z0-9/.-]+)/i));

  const bundledPolicyNo = matchGroup(text, /Related\s+Bundled\/Liability\s+Policy\s+No\.?:?\s*(\d{15,25})/i);
  const bundledPeriod = matchGroup(text, /Bundled\/Liability\s+Policy\s+period\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4}\s+to\s+\d{1,2}\/\d{1,2}\/\d{4})/i);
  const bundledInsurer = matchGroup(text, /Bundled\/Liability\s+Insurer\s*:?\s*([^\n\r]+)/i);
  if (bundledPolicyNo) {
    patch.activeTpPolicyNumber = bundledPolicyNo;
    patch.bundledPolicyNumber = bundledPolicyNo;
  }
  if (bundledInsurer) {
    patch.activeTpInsurer = clean(bundledInsurer);
    patch.bundledInsurer = clean(bundledInsurer);
  }
  if (bundledPeriod) {
    patch.bundledPolicyPeriod = clean(bundledPeriod);
    const bDates = bundledPeriod.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (bDates) {
      patch.activeTpStartDate = bDates[1];
      patch.activeTpEndDate = bDates[2];
    }
  }

  // 6. Vehicle Details
  const regNoMatch =
    matchGroup(text, /Registration no\.\s*([A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})/i) ||
    matchGroup(text, /Registration\s+Number\s*:?\s*([A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})/i);
  if (regNoMatch) {
    patch.registrationNumber = regNoMatch;
    patch.vehicleNumber = regNoMatch;
  }

  const makeModelMatch = text.match(
    /Make\s*\/?\s*Model\s*:?\s*([A-Z0-9 /&.,-]+?)(?=Registration|Variant|Year|\n|$)/i,
  );
  if (makeModelMatch) {
    const rawMakeModel = clean(makeModelMatch[1].replace(/Registration\s+no\..*/i, ""));
    if (rawMakeModel) {
      patch.makeModel = rawMakeModel;
      const parts = rawMakeModel.split("/");
      patch.vehicleMake = clean(parts[0]);
      patch.vehicleModel = clean(parts[1] || parts[0]);
    }
  }

  assign(
    patch,
    "variant",
    matchGroup(text, /Variant\s*:?\s*([^\n\r]+?)(?=\s+Automobile|\s+Colour|\s+Cover|\n|$)/i),
  );

  const chEngMatch = text.match(
    /Chassis\s+no\.?\s*\/\s*Engine\s+(?:no\.|Number)\s*:?\s*([A-Z0-9]+)\s*\/\s*([A-Z0-9]+[\s\r\n]*[A-Z0-9]+)/i,
  );
  if (chEngMatch) {
    patch.chassisNumber = chEngMatch[1].trim();
    patch.engineNumber = chEngMatch[2].replace(/[\r\n\s]+/g, "").trim();
  }

  assign(patch, "manufacturingYear", matchGroup(text, /Year\s+of\s+manufacture\s*:?\s*(\d{4})/i));
  if (patch.manufacturingYear) {
    patch.yearOfManufacture = patch.manufacturingYear;
  }

  const fuelMatch = text.match(/Type\s+of\s+fuel\s*:?\s*([A-Za-z]+?)(?=\s*Cubic|Cubic|\s*Gross|Gross|\s*Make|Make|\n|$)/i);
  if (fuelMatch) {
    const rawFuel = fuelMatch[1].trim().toUpperCase();
    if (rawFuel.includes("CNG")) patch.fuelType = "CNG";
    else if (rawFuel.includes("PETROL")) patch.fuelType = "Petrol";
    else if (rawFuel.includes("DIESEL")) patch.fuelType = "Diesel";
    else if (rawFuel.includes("LPG")) patch.fuelType = "LPG";
    else if (rawFuel.includes("ELECTRIC") || rawFuel.includes("EV")) patch.fuelType = "Electric";
    else patch.fuelType = fuelMatch[1].trim();
  }

  const bodyFuelMatch = text.match(/Type\s+of\s+body\s*\/\s*Type\s+of\s+Fuel\s*([A-Za-z0-9]+)\/([A-Za-z0-9]+)/i);
  if (bodyFuelMatch) {
    if (!patch.bodyType) patch.bodyType = clean(bodyFuelMatch[1]);
    if (!patch.fuelType) patch.fuelType = clean(bodyFuelMatch[2]);
  }

  const ccMatch = text.match(/Cubic\s+capacity[\s\S]{0,40}?:?\s*(\d+)\s*(?:cc)?/i);
  if (ccMatch) {
    patch.cubicCapacity = ccMatch[1].trim();
  }

  const bodyMatch = text.match(/Type\s+of\s+body\s*:?\s*([A-Za-z0-9]+?)(?=\s*Gross|Gross|\s*Make|Make|\s*Variant|Variant|\s*Seating|Seating|\n|$)/i);
  if (bodyMatch && !patch.bodyType) {
    patch.bodyType = clean(bodyMatch[1]);
  }

  const gvwMatch = text.match(/Gross\s+Vehicle\s+Weight[\s\S]{0,40}?:\s*(\d+)/i);
  if (gvwMatch) {
    patch.grossVehicleWeight = gvwMatch[1].trim();
  }

  const seatingMatch =
    matchGroup(text, /Seating\s+capacity[^\n]*\n(?:Driver:\n)?\s*(\d+)/i) ||
    matchGroup(text, /Seating\s+capacity[\s\S]{0,40}?:\s*(\d+)/i);
  if (seatingMatch) {
    patch.seatingCapacity = seatingMatch.trim();
  }

  const rtoMatch = text.match(/Name\s+of\s+registration\s+authority\s*:?\s*([^\n\r]+?)(?=\s+FASTag|\s+INSURED|\n|$)/i);
  if (rtoMatch) {
    patch.rtoLocation = clean(rtoMatch[1]);
  }

  const compExcess = matchGroup(text, /Compulsory\s+excess\s+in\s+Rs\s*:?\s*(\d+)/i);
  if (compExcess) {
    patch.compulsoryDeductible = normalizeAmount(compExcess);
    patch.compulsoryExcess = normalizeAmount(compExcess);
  }

  const subTypeMatch = text.match(
    /Sub\s+Type\s*:?\s*([\s\S]*?)(?=Name\s+of\s+the\s+Financier|Chassis\s+no|Type\s+of\s+fuel|$)/i,
  );
  if (subTypeMatch) {
    patch.commercialVehicleSubType = clean(subTypeMatch[1]);
  }

  const financierMatch = text.match(/Name\s+of\s+the\s+Financier\s*:?\s*([^\n\r]*)/i);
  if (financierMatch) {
    const rawVal = clean(financierMatch[1]);
    if (rawVal && !/Chassis\s+no|Engine\s+no|Cover\s*Note|none/i.test(rawVal)) {
      patch.hypothecation = rawVal;
      patch.financier = rawVal;
      patch.financerName = rawVal;
    } else {
      patch.hypothecation = "";
      patch.financier = "";
      patch.financerName = "";
    }
  } else if (/Cover\s*Note|none/i.test(result.financerName || "")) {
    patch.hypothecation = "";
    patch.financier = "";
    patch.financerName = "";
  }

  // Opted Addons
  const addOnsOpted = [];
  if (/Nil\s+Depreciation\s+Cover\s*Yes/i.test(text)) {
    addOnsOpted.push("Zero Depreciation");
    patch.zeroDepreciation = "Yes";
  }
  if (/Roadside\s+Assistance\s+Cover[\s\S]{0,30}?Yes/i.test(text)) {
    addOnsOpted.push("Roadside Assistance");
    patch.roadsideAssistance = "Yes";
  }
  if (addOnsOpted.length) patch.addOnsOpted = addOnsOpted;

  // 7. IDV (Insured Declared Value) Table
  const denseIdv =
    text.match(/For\s+individual\s+covers\s*\(OD\)\s*in\s*RS\s*:?\s*([0-9,]+)/i) ||
    text.match(/INSURED\s+DECLARED\s+VALUE[\s\S]*?\n\s*([1-9][0-9]{4,7})0000([1-9][0-9]{4,7})/i) ||
    text.match(/INSURED\s+DECLARED\s+VALUE[\s\S]*?\n\s*([0-9,]{1,8})\s+[0-9,]+\s+[0-9,]+\s+[0-9,]+\s+[0-9,]+\s+([0-9,]{1,8})/i) ||
    text.match(/INSURED\s+DECLARED\s+VALUE[\s\S]*?\n\s*(\d+)/i);

  const idvVal = amount(denseIdv ? denseIdv[1] : "0");
  patch.idv = idvVal;
  patch.totalIdv = idvVal;
  patch.vehicleIdv = idvVal;
  patch.sumInsured = idvVal;

  // 8. Premium Breakdown
  const odScheduleMatch = text.match(
    /Basic\s+OD\s+Premium[\s\S]*?Total\s+NCB\s+Discount\s*\((\d+(?:\.\d+)?%)\)[\s\S]*?Roadside\s+Assistance[^\n]*\n\s*(\d+(?:\.\d+)?)\s*\n\s*(\d+(?:\.\d+)?)\s*\n\s*(\d+(?:\.\d+)?)\s*\n\s*(\d+(?:\.\d+)?)[\s\S]*?Calculated\s+OD\s+Premium\s*(\d+)/i
  );

  const premiumTableMatch = text.match(/Basic TP Premium[\s\S]*?oprn\s*\n\s*(\d+)\s*\n+\s*(\d+)/i);
  const basicTp = amount(
    premiumTableMatch ? premiumTableMatch[1] : (matchGroup(text, /Basic\s+TP\s+Premium[\s\S]{0,100}?\n\s*(\d+(?:\.\d+)?)/i) || "0"),
  );
  const llPaidDriver = amount(
    premiumTableMatch ? premiumTableMatch[2] : (matchGroup(text, /LL to paid driver[\s\S]{0,120}?\n\s*(\d+)/i) || "0"),
  );

  const basicOdMatch = text.match(/Basic\s+OD\s+Premium[\s\S]{0,100}?\n\s*(\d+(?:\.\d+)?)/i);
  const basicOd = amount(odScheduleMatch ? odScheduleMatch[2] : (basicOdMatch ? basicOdMatch[1] : "0"));

  const calcOdMatch =
    text.match(/Calculated\s+OD\s+Premium\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/Total\s+OD\s+Premium\s*(?:\(Rs\)|in\s*Rs)?\s*(\d+(?:\.\d+)?)/i);
  const totalOd = amount(odScheduleMatch ? odScheduleMatch[6] : (calcOdMatch ? calcOdMatch[1] : basicOd));

  const calcTpMatch =
    text.match(/Calculated\s+TP\s+Premium\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/Total\s+TP\s+Premium\s*(?:\(Rs\)|in\s*Rs)?\s*(\d+(?:\.\d+)?)/i);
  const totalTp = amount(calcTpMatch ? calcTpMatch[1] : basicTp);

  const paMatch = text.match(/PA\s+Premium\s+for\s+Owner\s+Driver[\s\S]*?(\d+)\s*\n\s*(\d+)/i) ||
    text.match(/Compulsory\s+PA\s+Premium\s+for\s+Owner\s+Driver[\s\S]{0,100}?\n\s*(\d+(?:\.\d+)?)/i);
  if (paMatch) {
    patch.paOwnerDriver = amount(paMatch[2] || paMatch[1]);
  }

  const ncbMatch = text.match(/Total\s+NCB\s+Discount\s*\(\s*(\d+(?:\.\d+)?)\s*%\s*\)[\s\S]*?\n\s*\d+\s*\n\s*([0-9.]+)/i);
  if (odScheduleMatch) {
    patch.ncbPercentage = odScheduleMatch[1].replace(/%/g, "").trim();
    patch.ncb = `${patch.ncbPercentage}%`;
    patch.ncbDiscount = amount(odScheduleMatch[3]);
    patch.nilDepreciationPremium = amount(odScheduleMatch[4]);
    patch.rsaPremium = amount(odScheduleMatch[5]);
  } else if (ncbMatch) {
    patch.ncbPercentage = ncbMatch[1].trim();
    patch.ncb = `${patch.ncbPercentage}%`;
    patch.ncbDiscount = amount(ncbMatch[2]);
  }

  const netMatch = text.match(/Net\s+Premium\s*(?:in\s*Rs|\(Rs\))?\s*[:\s]*([0-9,.]+)/i);
  const netPremium = amount(netMatch ? netMatch[1] : (totalOd !== "0.00" ? totalOd : totalTp));

  const gstMatch = text.match(/GST\s*(?:in\s*Rs|\(Rs\))?\s*[:\s]*([0-9,.]+)/i);
  const totalGst = amount(gstMatch ? gstMatch[1] : "0");

  const payableMatch = text.match(/Total\s+Payable\s*(?:in\s*Rs|\(Rs\))?\s*[:\s]*([0-9,.]+)/i);
  const totalPayable = amount(payableMatch ? payableMatch[1] : (Number(netPremium || 0) + Number(totalGst || 0)).toFixed(2));

  patch.odPremium = totalOd;
  patch.basicOwnDamage = basicOd;
  patch.netOwnDamagePremium = totalOd;

  const isStandaloneOD = /Standalone\s+Motor\s+Own\s+Damage|Standalone\s+Own\s+Damage/i.test(patch.policyType || text);
  if (isStandaloneOD) {
    patch.basicThirdPartyLiability = "0.00";
    patch.basicTpPremium = "0.00";
    patch.legalLiabilityPremium = "0.00";
    patch.tpPremium = "0.00";
    patch.totalActPremium = "0.00";
    patch.liabilityPremium = "0.00";
    patch.netLiabilityPremium = "0.00";
    patch.tpDriverOwner = "0.00";
  } else {
    patch.basicThirdPartyLiability = basicTp;
    patch.basicTpPremium = basicTp;
    patch.legalLiabilityPremium = llPaidDriver;
    patch.tpPremium = totalTp;
    patch.totalActPremium = totalTp;
    patch.liabilityPremium = totalTp;
    patch.netLiabilityPremium = totalTp;
    patch.tpDriverOwner = totalTp;
  }

  patch.netPremium = netPremium;
  patch.basicPremium = netPremium;
  patch.gstAmount = totalGst;
  patch.taxAmount = totalGst;

  const igstMatch = text.match(/IGST\s*18\s*(\d+(?:\.\d+)?)/i);
  if (igstMatch) {
    patch.igst = amount(igstMatch[1]);
    patch.cgst = "0.00";
    patch.sgst = "0.00";
  } else if (totalGst && totalGst !== "0.00") {
    const halfGst = (Number(totalGst) / 2).toFixed(2);
    patch.sgst = halfGst;
    patch.cgst = halfGst;
  }

  patch.totalPremium = totalPayable;
  patch.grossPremium = totalPayable;
  patch.premium = totalPayable;
  patch.premiumIncludingGst = totalPayable;

  // 9. Agent / Business Channel Details
  assign(
    patch,
    "agentCode",
    matchGroup(text, /\b(NIAAG\d+)\b/i) || matchGroup(text, /\b(2D\d+)\b/i),
  );
  assign(
    patch,
    "agentName",
    matchGroup(text, /(Mr\.\s*Anand\s*Soni)/i) || matchGroup(text, /NAME:\s*([^\n-]+)/i),
  );
  assign(
    patch,
    "agentMobile",
    matchGroup(text, /BUSINESS CHANNEL[\s\S]*?PHONE NUMBER:\s*\/[^\n]*?(\d{10})/i) ||
      matchGroup(text, /BUSINESS CHANNEL[\s\S]*?(\d{10})/i),
  );
  assign(
    patch,
    "agentEmail",
    matchGroup(text, /BUSINESS CHANNEL[\s\S]*?EMAIL:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i),
  );

  // 10. IMT Endorsements
  const imtMatch = matchGroup(
    text,
    /IMT Endorsement Number\(s\) printed herewith attached\s*([0-9,\s]+)/i,
  );
  if (imtMatch) {
    patch.imtEndorsements = imtMatch
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => (x.startsWith("IMT") ? x : `IMT-${x}`))
      .join(", ");
  }

  patch.extractionTrainingVersion = "NEW_INDIA_MOTOR_V2";

  return patch;
}

module.exports = {
  scope,
  matches,
  train,
};
