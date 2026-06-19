
const { cleanHdfcValue, cleanWarehouseAddress, cleanWarehouseDescription, sliceText } = require("../../utils/text.cjs");
const { inferFuelType } = require("../../utils/motor.cjs");
const { matchGroup, escapeRegExp } = require("../../utils/regex.cjs");
const { normalizeAmount, sumAmounts } = require("../../utils/amounts.cjs");
const { coverageAmount } = require("../../utils/warehouse.cjs");
const { extractGenericPolicyPeriod } = require("../generic/index.cjs");

// Start of extractIciciMotor (Lines 1905-2002)
function extractIciciMotor(text, _sourceFile = "") {
  if (!isIciciMotor(text)) return { documentDetected: false };

  const riskLetterDetails = extractIciciRiskLetterVehicleDetails(text);
  const scheduleVehicle = extractIciciScheduleVehicleDetails(text);
  const premium = extractIciciPremiumDetails(text);
  const period = extractIciciPolicyPeriod(text);
  const communicationAddress = extractIciciAddress(text);
  const vehicleMake = riskLetterDetails.make || scheduleVehicle.make;
  const vehicleModel = riskLetterDetails.model || scheduleVehicle.model;
  const makeModel = [vehicleMake, vehicleModel].filter(Boolean).join(" ");

  return {
    documentDetected: true,
    companyName: "ICICI Lombard General Insurance Company Limited",
    policyType: cleanHdfcValue(
      matchGroup(text, /(Private Car Package Policy)/i) || "Private Car Package Policy",
    ),
    policyNumber: matchGroup(text, /Policy No\.?\s*(?:\n\s*:)?\s*([0-9]{4}\/[0-9]+\/[0-9]{2}\/[0-9]{3})/i),
    insuredName: cleanHdfcValue(
      matchGroup(text, /Insured Name\s*:?\s*([A-Z][A-Z .]+?)(?=Policy No|\n|$)/i) ||
        riskLetterDetails.insuredName,
    ),
    communicationAddress,
    customerMobile: matchGroup(text, /Mobile No\s*:?\s*([0-9*]{8,14})/i),
    customerEmail:
      matchGroup(text, /Email Address\s*:?\s*([A-Z0-9*._%+-]+@[A-Z0-9*.-]+\.COM)(?=E-Policy|\s|$)/i) ||
      matchGroup(text, /Email Address\s*:?\s*([A-Z0-9*._%+-]+@[A-Z0-9*.-]+\.[A-Z]{2,})/i),
    policyStartDate: period.start,
    policyEndDate: period.end,
    issuanceDate: normalizeIciciDate(
      matchGroup(text, /Policy Issued On\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i) ||
        matchGroup(text, /Date:\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i),
    ),
    covernoteNumber: matchGroup(text, /Covernote No\s*:?\s*([0-9]+)/i),
    invoiceNumber: matchGroup(text, /Invoice Number\s*:?\s*([0-9]+)/i),
    registrationNumber: scheduleVehicle.registrationNumber || riskLetterDetails.registrationNumber,
    vehicleMake,
    vehicleModel,
    makeModel,
    variant: "",
    bodyType: scheduleVehicle.bodyType,
    cubicCapacity: scheduleVehicle.cubicCapacity,
    manufacturingYear: scheduleVehicle.manufacturingYear || riskLetterDetails.manufacturingYear,
    seatingCapacity: scheduleVehicle.seatingCapacity,
    chassisNumber: scheduleVehicle.chassisNumber || riskLetterDetails.chassisNumber,
    engineNumber: scheduleVehicle.engineNumber || riskLetterDetails.engineNumber,
    registrationDate: riskLetterDetails.registrationDate,
    rto: cleanIciciRto(
      matchGroup(text, /RTO Location\s*:?\s*([A-Z -]+?)(?=GSTIN|Hypothecated|Servicing|\n|$)/i) ||
        riskLetterDetails.rto,
    ),
    fuelType: inferIciciFuelType(makeModel) || inferFuelType(text, makeModel),
    vehicleIdv: premium.vehicleIdv,
    totalIdv: premium.totalIdv,
    basicOwnDamage: premium.basicOwnDamage,
    roadSideAssistance: premium.roadSideAssistance,
    basicThirdPartyLiability: premium.basicThirdPartyLiability,
    legalLiabilityToPaidDriver: premium.legalLiabilityToPaidDriver,
    paCoverForOwnerDriver: premium.paCoverForOwnerDriver,
    unnamedPaCover: premium.unnamedPaCover,
    netOwnDamagePremium: premium.netOwnDamagePremium,
    netLiabilityPremium: premium.netLiabilityPremium,
    totalPackagePremium: premium.totalPackagePremium,
    cgst: premium.cgst,
    sgst: premium.sgst,
    gstAmount: premium.gstAmount,
    totalPremium: premium.totalPremium,
    ncbPercentage: riskLetterDetails.ncbPercentage || matchGroup(text, /No Claim Bonus\s*(\d{1,2}%)/i),
    previousPolicyNumber: riskLetterDetails.previousPolicyNumber,
    previousPolicyValidity: riskLetterDetails.previousPolicyValidity,
    previousInsurer: riskLetterDetails.previousInsurer,
    previousYearNcb: riskLetterDetails.previousYearNcb,
    policyCoverType: "Package",
    nomineeName: "",
    financerName: "",
    geographicalArea: matchGroup(text, /Geographical Area:\s*([A-Za-z]+?)(?=Applicable|\s|$)/i),
    compulsoryDeductible: normalizeAmount(matchGroup(text, /Compulsory Deductible:\s*`\s*([0-9,]+)/i)),
    voluntaryDeductible: normalizeAmount(matchGroup(text, /Voluntary Deductible:\s*`\s*([0-9,]+)/i)),
    receiptNumber: matchGroup(text, /Receipt Date[0-9-]+\s*GSTIN/i) ? "" : "",
    receiptDate: normalizeIciciDate(matchGroup(text, /Receipt Date\s*([0-9-]{8,10})/i)),
    premiumCollectionNumber: matchGroup(text, /Premium Collection No\.?\s*([0-9]+)/i),
    agencyCode: matchGroup(text, /Agency Code\s*:?\s*([A-Z0-9]+)/i),
    agencyName: cleanHdfcValue(matchGroup(text, /Agency Name\s*:?\s*([A-Z0-9 .&-]+)/i)),
    agencyContactNumber: matchGroup(text, /Agent's Contact No\s*:?\s*([6-9]\d{9})/i),
    servicingBranchName: cleanHdfcValue(
      matchGroup(text, /Servicing Branch Name\s*:?\s*([A-Za-z ]+?)(?=Invoice|\n|$)/i),
    ),
    servicingBranchAddress: cleanHdfcValue(
      matchGroup(text, /Servicing Branch Address\s*:?\s*([\s\S]+?)(?=Are you|Registration No\.|$)/i),
    ),
    insurerGstin: matchGroup(text, /GSTIN Reg\.No\s*([0-9A-Z]{15})/i),
    hsnSacCode: cleanHdfcValue(
      matchGroup(text, /HSN\/SAC code\s*([0-9 /A-Z]+?GENERAL\s+INSURANCE\s+SERVICES)/i),
    ),
    applicableImtClauses: cleanHdfcValue(matchGroup(text, /Applicable IMT Clauses:\s*([0-9 ,]+)/i)),
  };
}

// Start of isIciciMotor (Lines 2004-2010)
function isIciciMotor(text) {
  return (
    /ICICI\s+Lombard\s+General\s+Insurance\s+Company/i.test(text) &&
    /Certificate\s+of\s+Insurance\s+cum\s+Policy\s+Schedule/i.test(text) &&
    /Private\s+Car\s+Package\s+Policy|Registration No\.\s+MakeModelType of Body/i.test(text)
  );
}

// Start of extractIciciWarehouseMsme (Lines 2012-2105)
function extractIciciWarehouseMsme(text) {
  if (!isIciciWarehouseMsme(text)) return { documentDetected: false };

  const period = extractGenericPolicyPeriod(text);
  let startDate = period.startDate;
  let expiryDate = period.expiryDate;
  if (!startDate) {
    const customPeriodMatch = text.match(/Policy\s+Period\s*FROM\s*(\d{1,2}-[a-zA-Z]{3}-\d{4})\s*TO\s*(\d{1,2}-[a-zA-Z]{3}-\d{4})/i) ||
                              text.match(/FROM\s*(\d{1,2}-[a-zA-Z]{3}-\d{4})\s*TO\s*(\d{1,2}-[a-zA-Z]{3}-\d{4})/i);
    if (customPeriodMatch) {
      startDate = customPeriodMatch[1];
      expiryDate = customPeriodMatch[2];
    }
  }

  const mailingAddress = cleanWarehouseAddress(
    matchGroup(text, /Mailing Address of the\s*Insured\s*([\s\S]+?)\s*Period of Insurance/i) ||
    matchGroup(text, /Mailing\s*Address\s*([\s\S]+?)\s*(?:Policy Number|PolicyNumber|Period of Insurance|Occupancy|$)/i) ||
    matchGroup(text, /Mailing Address with Pincode\s*([\s\S]+?)\s*Occupancy of Risk/i)
  );
  const riskLocation = cleanWarehouseAddress(
    matchGroup(text, /Premises to be Insured\s*([\s\S]+?)\s*Premium\s*\(`/i) ||
    matchGroup(text, /Location\s*\d+\s+Address\s*([\s\S]+?)\s*Occupancy of Risk/i)
  ) || mailingAddress;
  const businessDescription = cleanWarehouseDescription(
    matchGroup(text, /Business of the Insured\s*([\s\S]+?)\s*Issued at/i) ||
    matchGroup(text, /Occupancy\s+of\s+Risk\s*([\s\S]+?)\s*Policy\s+Period/i)
  ) || "Warehouse";
  const coverages = extractIciciWarehouseCoverages(text);
  const premium = extractIciciWarehousePremium(text);
  const hypothecation = extractIciciWarehouseHypothecation(text);
  const broker = extractIciciWarehouseBroker(text);

  const required = {
    insuranceCompany: "ICICI Lombard General Insurance",
    productName: "MSME Suraksha Kavach Package Policy - Advance",
    policyNumber:
      matchGroup(text, /Policy No\s*([0-9]{4}\/[0-9]+\/[0-9]{2}\/[0-9]{3})/i) ||
      matchGroup(text, /PolicyNo\s*([0-9]{4}\/[0-9]+\/[0-9]{2}\/[0-9]{3})/i) ||
      matchGroup(text, /QUOTATION\s*No\s*:\s*([A-Za-z0-9-]+)/i),
    insuredName: cleanHdfcValue(
      matchGroup(text, /Name of the Insured\s*([A-Z0-9 .&/()\r\n-]+?)\s*Policy\s*No/i) ||
      matchGroup(text, /Insured\s*Name\s*([A-Z0-9 .&/()\r\n-]+?)\s*(?:Mailing Address|MailingAddress|Address|Policy|$)/i) ||
      matchGroup(text, /Insured\s+Name\s*\n\s*([A-Z0-9 .&/()-]+)/i)
    ),
    mailingAddress,
    riskLocation,
    startDate,
    expiryDate,
    issuedAt: cleanHdfcValue(matchGroup(text, /Issued at\s*([A-Z ]+?)\s*Premises to be Insured/i)) || "BHOPAL",
    businessDescription,
    premiumIncludingGst: premium.premiumIncludingGst,
    netPremium: premium.netPremium,
    gstAmount: premium.gstAmount,
    cgst: premium.cgst,
    sgst: premium.sgst,
    invoiceNumber: premium.invoiceNumber,
    invoiceDate: premium.invoiceDate,
    gstin: premium.gstin,
    placeOfSupply: premium.placeOfSupply,
    hypothecationDetails: hypothecation.bankName,
    brokerCode: broker.brokerCode,
    brokerName: broker.brokerName,
    brokerMobile: broker.brokerMobile,
    brokerEmail: broker.brokerEmail,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !String(value || "").trim())
    .map(([key]) => key);

  return {
    documentDetected: true,
    ...required,
    policyType: "Warehouse / MSME / Fire & Burglary package",
    sourceDocumentType: "ICICI_WAREHOUSE_MSME_SURAKSHA_KAVACH_V1",
    bankChargeType: hypothecation.chargeType ? `${hypothecation.bankName} - ${hypothecation.chargeType}` : "",
    contentsSumInsured: coverageAmount(coverages, "MSME Suraksha Kavach - Contents"),
    buildingSumInsured: coverageAmount(coverages, "MSME Suraksha Kavach - Buildings"),
    burglarySumInsured: coverageAmount(coverages, "Burglary"),
    fidelitySumInsured: coverageAmount(coverages, "Fidelity"),
    sumInsured: normalizeAmount(matchGroup(text, /increased\s+(?:[\s\S]*?)\s*by\s+an\s+amount\s+equal\s+to\s*(?:Rs\.?\s*)?([0-9,]+)/i)) ||
                coverageAmount(coverages, "MSME Suraksha Kavach - Contents") || 
                coverageAmount(coverages, "MSME Suraksha Kavach - Buildings") || 
                coverageAmount(coverages, "Burglary") || 
                coverageAmount(coverages, "Fidelity"),
    coverages,
    clauses: extractIciciWarehouseClauses(text),
    specialConditions: extractIciciWarehouseSpecialConditions(text),
    igst: premium.igst,
    needsManualReview: missing.length > 0,
    extractionConfidence: missing.length ? 0.82 : 0.96,
  };
}

// Start of isIciciWarehouseMsme (Lines 2107-2113)
function isIciciWarehouseMsme(text) {
  return (
    /ICICI\s+Lombard/i.test(text) &&
    /MSME\s+Suraksha\s+Kavach/i.test(text) &&
    (/Premises\s+to\s+be\s+Insured/i.test(text) || /Location\s+\d+\s+Address/i.test(text) || /SECTION\s+WISE/i.test(text) || /Endorsement/i.test(text))
  );
}

// Start of extractIciciWarehouseCoverages (Lines 2115-2170)
function extractIciciWarehouseCoverages(text) {
  const coveragePatterns = [
    [
      "MSME Suraksha Kavach - Contents",
      /MSME\s+Suraksha\s+Kavach\s*-\s*Contents\s*\(`\)\s*([0-9,]+(?:\.\d{2})?)/i,
    ],
    [
      "MSME Suraksha Kavach - Buildings",
      /MSME\s+Suraksha\s+Kavach\s*-\s*Buildings\s*\(`\)\s*([0-9,]+(?:\.\d{2})?)/i,
    ],
    ["Burglary", /(?:\n|\s)2\s*Burglary\s*\(`\)\s*([0-9,]+(?:\.\d{2})?)/i],
    ["Fidelity", /(?:\n|\s)3\s*Fidelity\s*\(`\)\s*([0-9,]+(?:\.\d{2})?)/i],
  ];
  let results = coveragePatterns
    .map(([sectionName, pattern]) => ({
      sectionName,
      sumInsured: normalizeAmount(matchGroup(text, pattern)),
    }))
    .filter((item) => item.sumInsured);

  // Fallback for Endorsement formats
  if (results.length === 0) {
    const fireEndo = matchGroup(text, /(?:Fire\s*(?:\([^)]*\))?\s*stocks?|Content)\s*(?::-\s*|:\s*|\s+)\s*([0-9,]+)/i);
    const burglaryEndo = matchGroup(text, /(?:Burglary\s*(?:\([^)]*\))?\s*stocks?|Burglary)\s*(?::-\s*|:\s*|\s+)\s*([0-9,]+)/i);
    const fidelityEndo = matchGroup(text, /Fidelity\s*(?:\([^)]*\))?\s*\s*(?::-\s*|:\s*|\s+)\s*([0-9,]+)/i);

    if (fireEndo) {
      results.push({ sectionName: "MSME Suraksha Kavach - Contents", sumInsured: normalizeAmount(fireEndo) });
    }
    if (burglaryEndo) {
      results.push({ sectionName: "Burglary", sumInsured: normalizeAmount(burglaryEndo) });
    }
    if (fidelityEndo) {
      results.push({ sectionName: "Fidelity", sumInsured: normalizeAmount(fidelityEndo) });
    }
  }

  // Fallbacks for Quotation format
  if (results.length === 0) {
    const fireMatch = text.match(/Total\s+Stock\s+Sum\s+Insured\s*\n\s*([0-9,]+)/i);
    const burglaryMatch = text.match(/Section\s+3:\s*Burglary[\s\S]{0,100}?Total\s+Sum\s+Insured\s*\n\s*([0-9,]+)/i);
    const fidelityMatch = text.match(/Section\s+5:\s*Fidelity[\s\S]{0,100}?Sum\s+Insured\s*\n\s*([0-9,]+)/i);

    if (fireMatch) {
      results.push({ sectionName: "MSME Suraksha Kavach - Contents", sumInsured: normalizeAmount(fireMatch[1]) });
    }
    if (burglaryMatch) {
      results.push({ sectionName: "Burglary", sumInsured: normalizeAmount(burglaryMatch[1]) });
    }
    if (fidelityMatch) {
      results.push({ sectionName: "Fidelity", sumInsured: normalizeAmount(fidelityMatch[1]) });
    }
  }

  return results;
}

// Start of extractIciciWarehousePremium (Lines 2172-2232)
function extractIciciWarehousePremium(text) {
  let netPremium = 
    normalizeAmount(
      matchGroup(
        text,
        /Total value of services\s*\(Premium Value without Tax\)\s*\(`\)\s*([0-9,]+(?:\.\d{2})?)/i,
      ),
    ) ||
    normalizeAmount(matchGroup(text, /extra premium amounting to\s*(?:Rs\.?\s*)?([0-9,]+)/i)) ||
    normalizeAmount(matchGroup(text, /Net Premium\s*([0-9,]+(?:\.\d{2})?)/i));

  let premiumIncludingGst =
    normalizeAmount(
      matchGroup(text, /Premium\s*\(`\)\s*\(Including GST\)\(`\)\s*([0-9,]+(?:\.\d{2})?)/i),
    ) || 
    normalizeAmount(matchGroup(text, /Total Premium inclusive Tax\s*\(`\)\s*([0-9,]+(?:\.\d{2})?)/i)) ||
    normalizeAmount(matchGroup(text, /Total Premium\s*[:\s\\'`"]*\s*([0-9,]+)/i)) ||
    normalizeAmount(matchGroup(text, /Total Premium\s*[:`\s]*\n\s*([0-9,]+)/i)) ||
    normalizeAmount(matchGroup(text, /Total Premium\s*[:`\s]*\s*([0-9,]+)/i)) ||
    normalizeAmount(matchGroup(text, /Total Premium\s*([0-9,]+(?:\.\d{2})?)/i));

  let cgst = normalizeAmount(matchGroup(text, /CGST\s*9\s*([0-9,]+(?:\.\d{2})?)/i));
  let sgst = normalizeAmount(matchGroup(text, /SGST\s*9\s*([0-9,]+(?:\.\d{2})?)/i));
  let igst = normalizeAmount(matchGroup(text, /IGST\s*0\s*([0-9,]+(?:\.\d{2})?)/i)) || "";
  let gstAmount =
    normalizeAmount(matchGroup(text, /Total Tax Amount\s*\(`\)\s*([0-9,]+(?:\.\d{2})?)/i)) ||
    normalizeAmount(matchGroup(text, /Total Tax Amount\s*\(`\)\s*([0-9]+)/i)) ||
    normalizeAmount(matchGroup(text, /GST\s*@\s*\d+%\s*([0-9,]+(?:\.\d{2})?)/i));

  let netVal = parseFloat(String(netPremium || "").replace(/,/g, ""));
  let grossVal = parseFloat(String(premiumIncludingGst || "").replace(/,/g, ""));
  
  if (netVal && grossVal && (!cgst || cgst === "0.00" || cgst === "0")) {
    const diff = grossVal - netVal;
    if (diff > 0) {
      gstAmount = diff.toFixed(2);
      cgst = (diff / 2).toFixed(2);
      sgst = (diff / 2).toFixed(2);
    }
  } else if (netVal && !grossVal) {
    cgst = (netVal * 0.09).toFixed(2);
    sgst = (netVal * 0.09).toFixed(2);
    gstAmount = (netVal * 0.18).toFixed(2);
    premiumIncludingGst = Math.round(netVal * 1.18).toFixed(2);
  }

  return {
    premiumIncludingGst,
    netPremium,
    gstAmount,
    cgst,
    sgst,
    igst,
    invoiceNumber: matchGroup(text, /Invoice Number\s*([0-9]+)/i),
    invoiceDate: matchGroup(text, /Invoice Date\s*(\d{1,2}\/\d{1,2}\/\d{4})/i),
    gstin:
      matchGroup(text, /GSTIN\s*([0-9A-Z]{15})/i) ||
      matchGroup(text, /Invoice Date\d{1,2}\/\d{1,2}\/\d{4}GSTIN([0-9A-Z]{15})/i),
    placeOfSupply: cleanHdfcValue(matchGroup(text, /Place of Supply\s*:\s*([A-Z ]+)/i)),
  };
}

// Start of extractIciciWarehouseHypothecation (Lines 2234-2252)
function extractIciciWarehouseHypothecation(text) {
  let bankName = cleanHdfcValue(
    matchGroup(
      text,
      /Annexure\s*-\s*I[\s\S]+?Sr\. No\.Name of the BankType of charge\s*1\s*([A-Z0-9 .&/-]+?)\s*Hypothecation/i,
    ),
  );
  if (!bankName) {
    if (/\bMPWLC\b/i.test(text)) {
      bankName = "MPWLC";
    } else if (/Hypothecation Details\s*(?:Bank Employee Name)?\s*NA/i.test(text)) {
      bankName = "None";
    } else {
      bankName = "";
    }
  }
  const chargeType = bankName && bankName !== "None" ? "Hypothecation" : "";
  return { bankName, chargeType };
}

// Start of extractIciciWarehouseBroker (Lines 2254-2277)
function extractIciciWarehouseBroker(text) {
  const compact = text.replace(/\s+/g, " ");
  const match = compact.match(
    /Agency\/Broker CodeAgency\/Broker NameAgency\/Broker Mobile NoAgency\/Broker Email-ID\s*(\d{10,})\s*([A-Z0-9 .&/-]+?)\s*([6-9]\d{9})\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
  );
  let brokerCode = match?.[1] || "";
  let brokerName = cleanHdfcValue(match?.[2] || "");
  let brokerMobile = match?.[3] || "";
  let brokerEmail = match?.[4] || "";

  if (!brokerCode) {
    brokerCode = matchGroup(text, /Intermediary\s+ID\s+([A-Z0-9-]+)/i);
  }
  if (!brokerName) {
    brokerName = cleanHdfcValue(matchGroup(text, /Intermediary\s+Name\s+([A-Z0-9 .&/-]+)/i));
  }

  return {
    brokerCode,
    brokerName,
    brokerMobile,
    brokerEmail,
  };
}

// Start of extractIciciWarehouseClauses (Lines 2279-2284)
function extractIciciWarehouseClauses(text) {
  return [...text.matchAll(/(?:^|\n)\s*\d+\s*([A-Z][A-Za-z0-9 ,/&().'-]{8,120})/g)]
    .map((match) => cleanHdfcValue(match[1]))
    .filter((clause) => /clause|warranty|policy|designation|insured|value/i.test(clause))
    .slice(0, 25);
}

// Start of extractIciciWarehouseSpecialConditions (Lines 2286-2296)
function extractIciciWarehouseSpecialConditions(text) {
  const conditions = [];
  const block = matchGroup(text, /Business of the Insured\s*([\s\S]+?)\s*Issued at/i);
  if (block) conditions.push(cleanWarehouseDescription(block));
  if (/hazardous goods/i.test(text)) {
    conditions.push(
      "Storage warranty excludes hazardous goods of Category I, II, III, coir waste, coir fibre and caddies.",
    );
  }
  return [...new Set(conditions.filter(Boolean))];
}

// Start of extractIciciRiskLetterVehicleDetails (Lines 2324-2383)
function extractIciciRiskLetterVehicleDetails(text) {
  const block = sliceText(text, /Insured\s*&\s*Vehicle\s*Details/i, /Previous\s+Policy\s+Details/i) || "";
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const ownershipIndex = lines.findIndex((line) => /^Ownership Serial Number$/i.test(line));
  const values = ownershipIndex === -1 ? [] : lines.slice(ownershipIndex + 1);
  const [
    insuredName,
    period,
    rawMakeModel,
    rto,
    registrationNumber,
    registrationDate,
    engineNumber,
    chassisNumber,
    ncbPercentage,
  ] = values;
  const makeParts = String(rawMakeModel || "")
    .split("/")
    .map((part) => cleanHdfcValue(part))
    .filter(Boolean);
  const previousBlock =
    sliceText(
      text,
      /Previous\s+Policy\s+Details/i,
      /Theinformationprovidedabove|Certificate\s+of\s+Insurance/i,
    ) || "";
  const previousLines = previousBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const previousTypeIndex = previousLines.findIndex((line) => /^Previous Policy Type$/i.test(line));
  const previousValues = previousTypeIndex === -1 ? [] : previousLines.slice(previousTypeIndex + 1);

  return {
    insuredName,
    period,
    make: makeParts[0] || "",
    model: makeParts.slice(1).join(" / "),
    rto,
    registrationNumber,
    registrationDate: normalizeIciciDate(registrationDate),
    engineNumber,
    chassisNumber,
    ncbPercentage,
    manufacturingYear: matchGroup(
      text,
      new RegExp(
        `${escapeRegExp(registrationNumber || "")}[A-Z]*[\\s\\S]{0,300}?\\b(19\\d{2}|20\\d{2})\\b`,
        "i",
      ),
    ),
    previousPolicyNumber: previousValues[0] || "",
    previousPolicyValidity: previousValues[1] || "",
    previousYearNcb: previousValues[2] || "",
    previousInsurer: previousValues[4] || "",
  };
}

// Start of extractIciciScheduleVehicleDetails (Lines 2385-2408)
function extractIciciScheduleVehicleDetails(text) {
  const match = text.match(
    /Registration No\.\s+MakeModelType of BodyCC\/KWMfg YrSeating CapacityChassis No\.Engine No\.\s*\n\s*([^\n]+)/i,
  );
  if (!match?.[1]) return {};

  const row = match[1].replace(/\s+/g, "");
  const parsed = row.match(
    /^([A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4})([A-Z]+)([A-Z0-9 .-]+?)(SUV|SEDAN|HATCHBACK|MUV|SALOON|OPEN|CLOSED)(\d{2,4})(19\d{2}|20\d{2})(\d{1,2})([A-Z0-9]{17})([A-Z0-9]{6,25})$/i,
  );
  if (!parsed) return {};

  return {
    registrationNumber: parsed[1],
    make: cleanHdfcValue(parsed[2]),
    model: cleanHdfcValue(parsed[3]),
    bodyType: cleanHdfcValue(parsed[4]),
    cubicCapacity: parsed[5],
    manufacturingYear: parsed[6],
    seatingCapacity: parsed[7],
    chassisNumber: parsed[8],
    engineNumber: parsed[9],
  };
}

// Start of extractIciciPremiumDetails (Lines 2410-2477)
function extractIciciPremiumDetails(text) {
  const result = {
    vehicleIdv: "",
    totalIdv: "",
    basicOwnDamage: "",
    roadSideAssistance: "",
    basicThirdPartyLiability: "",
    legalLiabilityToPaidDriver: "",
    paCoverForOwnerDriver: "",
    unnamedPaCover: "",
    netOwnDamagePremium: "",
    netLiabilityPremium: "",
    totalPackagePremium: "",
    cgst: "",
    sgst: "",
    gstAmount: "",
    totalPremium: "",
  };

  const idvDigits = matchGroup(text, /Total IDV\s*\(`\)\s*\n\s*([0-9]{6,})/i);
  if (idvDigits) {
    const parsedIdv = splitIciciDenseIdv(idvDigits);
    result.vehicleIdv = normalizeAmount(parsedIdv.vehicleIdv);
    result.totalIdv = normalizeAmount(parsedIdv.totalIdv);
  }

  const premiumBlock =
    sliceText(text, /Premium Details/i, /Unique Identification Number|Geographical Area/i) || text;
  const ownDamageNumbers = Array.from(
    (
      premiumBlock.match(
        /No Claim Bonus 45%[\s\S]{0,80}?(\d+)\s*\n\s*(\d+)\s*\n\s*\n\s*(\d+)\s*\n\s*\n\s*(\d+)\s*\n\s*(\d+)/i,
      ) || []
    ).slice(1),
  );
  if (ownDamageNumbers.length >= 5) {
    result.basicOwnDamage = normalizeAmount(ownDamageNumbers[0]);
    result.roadSideAssistance = normalizeAmount(ownDamageNumbers[1]);
  }

  const liabilityNumbers = Array.from(
    (
      premiumBlock.match(
        /Sub-Total\s*\n\s*(\d+)\s*\n\s*(\d+)\s*\n\s*\n\s*(\d+)\s*\n\s*(\d+)\s*\n\s*(\d+)\s*\n\s*(\d+)/i,
      ) || []
    ).slice(1),
  );
  if (liabilityNumbers.length >= 6) {
    result.basicThirdPartyLiability = normalizeAmount(liabilityNumbers[0]);
    result.legalLiabilityToPaidDriver = normalizeAmount(liabilityNumbers[2]);
    result.paCoverForOwnerDriver = normalizeAmount(liabilityNumbers[3]);
    result.unnamedPaCover = normalizeAmount(liabilityNumbers[4]);
  }

  result.netOwnDamagePremium = normalizeAmount(matchGroup(text, /Total Own Damage Premium\(A\)\s*([0-9]+)/i));
  result.netLiabilityPremium = normalizeAmount(matchGroup(text, /Total Liability Premium\(B\)\s*([0-9]+)/i));
  result.totalPackagePremium = normalizeAmount(
    matchGroup(text, /Total Package Premium\(A\+B\):\s*([0-9]+)/i),
  );
  result.cgst = normalizeAmount(matchGroup(text, /CGST[\s\S]{0,30}?`\s*\n\s*([0-9.]+)/i));
  result.sgst = normalizeAmount(matchGroup(text, /SGST[\s\S]{0,30}?`\s*\n\s*([0-9.]+)/i));
  result.gstAmount =
    normalizeAmount(matchGroup(text, /Total Tax Payable in `\s*([0-9]+)/i)) ||
    sumAmounts(result.cgst, result.sgst);
  result.totalPremium = normalizeAmount(matchGroup(text, /Total Premium Payable In `\s*([0-9]+)/i));

  return result;
}

// Start of extractIciciPolicyPeriod (Lines 2479-2499)
function extractIciciPolicyPeriod(text) {
  const schedule = text.match(
    /Period of Insurance\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})\s*([0-9:]+)?\s*to\s*(?:Midnight of\s*)?([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i,
  );
  if (schedule) {
    const start = normalizeIciciDate(schedule[1]);
    const end = normalizeIciciDate(schedule[3]);
    return {
      start: schedule[2] ? `${start} ${schedule[2]}` : start,
      end,
    };
  }

  const riskLetter = text.match(
    /Period of Insurance[\s\S]{0,180}?([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})\s+to\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i,
  );
  return {
    start: normalizeIciciDate(riskLetter?.[1] || ""),
    end: normalizeIciciDate(riskLetter?.[2] || ""),
  };
}

// Start of extractIciciAddress (Lines 2501-2505)
function extractIciciAddress(text) {
  const match = text.match(/Address\s*:?\s*([\s\S]+?)\s*Tenure\s*:/i);
  if (!match?.[1]) return "";
  return cleanHdfcValue(match[1].replace(/\n/g, " "));
}

// Start of normalizeIciciDate (Lines 2507-2543)
function normalizeIciciDate(value = "") {
  const text = String(value || "").trim();
  if (!text || text === "-") return "";
  const numeric = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (numeric) return `${numeric[1].padStart(2, "0")}/${numeric[2].padStart(2, "0")}/${numeric[3]}`;

  const monthMatch = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!monthMatch) return text;
  const months = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };
  const month = months[monthMatch[1].toLowerCase()];
  return month ? `${monthMatch[2].padStart(2, "0")}/${month}/${monthMatch[3]}` : text;
}

// Start of cleanIciciRto (Lines 2545-2549)
function cleanIciciRto(value = "") {
  return cleanHdfcValue(value)
    .replace(/^MADHYA PRADESH-/i, "")
    .toUpperCase();
}

// Start of inferIciciFuelType (Lines 2551-2556)
function inferIciciFuelType(makeModel = "") {
  const text = String(makeModel || "").toUpperCase();
  if (/(CRDI|DIESEL|D-?TEC|TDI|DDIS|DICOR)/.test(text)) return "Diesel";
  if (/(PETROL|VVT|IVTEC|MPI|KAPPA)/.test(text)) return "Petrol";
  return "";
}

// Start of splitIciciDenseIdv (Lines 2558-2579)
function splitIciciDenseIdv(value = "") {
  const compact = String(value || "").replace(/\D/g, "");
  const candidates = [];
  for (let width = 5; width <= 8; width++) {
    const totalIdv = compact.slice(-width);
    const prefix = compact.slice(0, -width);
    if (!totalIdv || /^0+$/.test(totalIdv)) continue;
    const vehicleMatch =
      prefix.match(new RegExp(`^(${escapeRegExp(totalIdv)})0*$`)) || prefix.match(/([1-9]\d{4,7})0*$/);
    if (vehicleMatch?.[1]) {
      candidates.push({ vehicleIdv: vehicleMatch[1], totalIdv, width });
    }
  }

  const best = candidates
    .filter((candidate) => Number(candidate.totalIdv) >= Number(candidate.vehicleIdv))
    .sort((a, b) => {
      const diff = Number(a.totalIdv) - Number(a.vehicleIdv) - (Number(b.totalIdv) - Number(b.vehicleIdv));
      return diff || b.width - a.width;
    })[0];
  return best || { vehicleIdv: "", totalIdv: "" };
}

module.exports = {
  extractIciciMotor,
  isIciciMotor,
  extractIciciWarehouseMsme,
  isIciciWarehouseMsme,
  extractIciciWarehouseCoverages,
  extractIciciWarehousePremium,
  extractIciciWarehouseHypothecation,
  extractIciciWarehouseBroker,
  extractIciciWarehouseClauses,
  extractIciciWarehouseSpecialConditions,
  extractIciciRiskLetterVehicleDetails,
  extractIciciScheduleVehicleDetails,
  extractIciciPremiumDetails,
  extractIciciPolicyPeriod,
  extractIciciAddress,
  normalizeIciciDate,
  cleanIciciRto,
  inferIciciFuelType,
  splitIciciDenseIdv
};
