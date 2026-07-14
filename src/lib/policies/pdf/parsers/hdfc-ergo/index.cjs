const { normalizeInsuranceCompanyName: normalizeCompanyFromMaster } = require("../../../../master/insurance-companies.cjs");
const { extractByLabels, matchGroup, escapeRegExp } = require("../../utils/regex.cjs");
const { extractInsuredGstin, extractGstAmount, extractCscContact } = require("../../utils/motor.cjs");
const { cleanHdfcValue } = require("../../utils/text.cjs");
const { normalizeAmount } = require("../../utils/amounts.cjs");

// Start of extractHdfcErgoMotor (Lines 2688-2782)
function extractHdfcErgoMotor(text) {
  const detected = isHdfcErgoMotor(text);
  if (!detected) return { documentDetected: false };

  const data = {
    documentDetected: true,
    companyName: normalizeCompanyFromMaster("HDFC ERGO"),
    policyType: cleanHdfcValue(
      matchGroup(text, /(Standalone Motor Own Damage Cover - Private Car)/i) ||
        matchGroup(text, /(PRIVATE CAR COMPREHENSIVE POLICY)/i) ||
        matchGroup(text, /(Private Car Comprehensive Policy)/i) ||
        matchGroup(
          text,
          /(Motor Insurance\s*-\s*Proposal Form cum Transcript Letter For Private Car Package)/i,
        ),
    ),
    policyNumber: extractHdfcPolicyNumber(text),
    proposalNumber: extractByLabels(text, ["Proposal No.", "Proposal No"], "identifier"),
    invoiceNumber: extractByLabels(text, ["Invoice No.", "Invoice No"], "identifier"),
    issuanceDate: extractByLabels(text, ["Issuance Date", "Issue Date"], "date"),
    policyStartDate: extractHdfcPeriod(text, "start"),
    policyEndDate: extractHdfcPeriod(text, "end"),
    customerId: extractByLabels(text, ["Customer Id", "Customer ID"], "identifier"),
    insuredName: extractHdfcInsuredName(text),
    communicationAddress: extractHdfcCommunicationAddress(text),
    customerMobile: extractByLabels(text, ["Tel.", "Tel", "Mobile", "Contact No"], "phone"),
    customerEmail: extractByLabels(text, ["Email ID", "Email Id", "Email"], "email"),
    gstin: extractInsuredGstin(text),
    panNumber: extractByLabels(text, ["PAN/Form 97 ID", "PAN"], "pan"),
    vehicleMake: extractByLabels(text, ["Make"], "vehicleText"),
    vehicleModel: extractHdfcBoundedText(text, "Model", [
      "Period of",
      "Registration No",
      "RTO",
      "Chassis No",
    ]),
    registrationNumber: extractHdfcRegistrationNumber(text),
    rto: extractHdfcBoundedText(text, "RTO", ["Issuance Date", "Chassis No", "Invoice No"]),
    chassisNumber: extractHdfcBoundedText(text, "Chassis No.", [
      "Engine No",
      "Engine Number",
      "Invoice No",
      "Cubic Capacity",
      "Customer Id",
    ]),
    engineNumber: extractByLabels(text, ["Engine No.", "Engine No", "Engine Number"], "identifier"),
    cubicCapacity: extractByLabels(text, ["Cubic Capacity / Watts", "Cubic Capacity"], "number"),
    seatingCapacity: extractByLabels(text, ["Seats", "Seating Capacity"], "number"),
    manufacturingYear: extractByLabels(text, ["Year of Manufacture", "Manufacturing Year"], "year"),
    bodyType: extractByLabels(text, ["Body Type"], "shortText"),
    totalIdv: extractHdfcTotalIdv(text),
    geographicalArea: extractHdfcGeographicalArea(text),
    compulsoryDeductible: extractHdfcInlineAmount(text, /Compulsory Deductible\s*\(IMT-22\)\s*([0-9,]+)/i),
    voluntaryDeductible: extractHdfcInlineAmount(
      text,
      /Voluntary Deductible(?:\s*\(IMT-22A\))?\s*([0-9,]+)/i,
    ),
    basicOwnDamage: extractByLabels(text, ["Basic Own Damage"], "amount"),
    basicThirdPartyLiability: extractByLabels(text, ["Basic Third Party Liability"], "amount"),
    netOwnDamagePremium: extractByLabels(
      text,
      ["Net Own Damage Premium (a)", "Net Own Damage Premium"],
      "amount",
    ),
    netLiabilityPremium: extractByLabels(
      text,
      ["Net Liability Premium (b)", "Net Liability Premium"],
      "amount",
    ),
    totalPackagePremium: extractByLabels(
      text,
      ["Total Package Premium (a+b)", "Total Package Premium"],
      "amount",
    ),
    gstAmount: extractGstAmount(text),
    cgst: extractHdfcTaxAmount(text, "Central"),
    sgst: extractHdfcTaxAmount(text, "State"),
    totalPremium: extractByLabels(text, ["Total Premium"], "amount"),
    zeroDepreciationCover: extractHdfcAmountAfterCoverage(text, "Zero Depreciation"),
    engineGearboxProtection: extractHdfcAmountAfterCoverage(text, "Engine and Gear box Protection"),
    costOfConsumables: extractHdfcAmountAfterCoverage(text, "Cost of Consumables"),
    previousPolicyNumber: extractHdfcPreviousPolicyNumber(text),
    previousPolicyValidity: extractHdfcPreviousPolicyValidity(text),
    previousInsurer: extractHdfcPreviousInsurer(text),
    ncbPercentage: extractByLabels(text, ["NCB", "No Claim Bonus"], "percent"),
    nomineeName: cleanHdfcValue(
      matchGroup(text, /Nominee for Owner driver\s*([A-Z][A-Z .,'-]+?)(?=Appointee|Hypothecated|$)/i),
    ),
    financerName: cleanHdfcValue(
      matchGroup(
        text,
        /Hypothecated(?:\(IMT-7\))?\s+with\s*:\s*([A-Z0-9 .&'-]+?)(?=LIMITATIONS|Nominee|\n|$)/i,
      ),
    ),
    paymentReference: extractByLabels(text, ["Payment Details", "Payment Reference"], "text"),
    bankName: extractByLabels(text, ["Bank Name"], "text"),
    cscName: extractHdfcBoundedText(text, "CSC Name", ["CSC Code", "Contact No", "For HDFC", "Anti rebate"]),
    cscCode: extractHdfcBoundedText(text, "CSC Code", ["Contact No", "For HDFC", "Anti rebate"]),
    cscContactNumber: extractCscContact(text),
  };

  if (!data.policyType && /private\s+car\s+comprehensive\s+policy/i.test(text)) {
    data.policyType = "Private Car Comprehensive Policy";
  }
  if (!data.policyType && /standalone\s+motor\s+own\s+damage\s+cover/i.test(text)) {
    data.policyType = "Standalone Motor Own Damage Cover - Private Car";
  }

  return data;
}

// Start of isHdfcErgoMotor (Lines 2784-2805)
function isHdfcErgoMotor(text) {
  const hasCompany =
    /HDFC\s+ERGO\s+General\s+Insurance\s+Company\s+Limited/i.test(text) || /\bHDFC\s+ERGO\b/i.test(text);
  const hasExactPolicyTitle = /PRIVATE\s+CAR\s+COMPREHENSIVE\s+POLICY|Standalone\s+Motor\s+Own\s+Damage\s+Cover/i.test(text);

  if (!hasCompany) return false;

  const formatSignals = [
    /Vehicle\s+Details/i,
    /Premium\s+Details/i,
    /Total\s+IDV/i,
    /Basic\s+Own\s+Damage/i,
    /Basic\s+Third\s+Party\s+Liability/i,
    /Net\s+Own\s+Damage\s+Premium/i,
    /Net\s+Liability\s+Premium/i,
    /CSC\s+Name/i,
    /Policy\s+No\.?/i,
    /Proposal\s+No\.?/i,
  ];

  return hasExactPolicyTitle || formatSignals.some((pattern) => pattern.test(text));
}

// Start of extractHdfcPolicyNumber (Lines 3098-3109)
function extractHdfcPolicyNumber(text) {
  const certificateMatch = text.match(
    /Certificate of Insurance cum Policy Schedule\s*\n?\s*(\d{12,24})\s*\n?\s*PRIVATE CAR COMPREHENSIVE POLICY/i,
  );
  if (certificateMatch?.[1]) return certificateMatch[1].trim();

  const labelMatch = text.match(/Policy No\.?\s*([0-9 ]{12,32})/i);
  if (labelMatch?.[1]) return labelMatch[1].replace(/\s+/g, "");

  const repeated = text.match(/\b(23\d{17})\b/);
  return repeated?.[1] || "";
}

// Start of extractHdfcRegistrationNumber (Lines 3111-3117)
function extractHdfcRegistrationNumber(text) {
  const match = text.match(/Registration No\.?\s*([A-Z]{2}-\d{2}-[A-Z]{1,3}-\d{4})/i);
  return (
    match?.[1]?.trim() ||
    extractByLabels(text, ["Registration No", "Registration No.", "Registration Number"], "registration")
  );
}

// Start of extractHdfcBoundedText (Lines 3119-3135)
function extractHdfcBoundedText(text, label, stopLabels = []) {
  const escaped = escapeRegExp(label).replace(/\\ /g, "\\s+");
  const pattern = new RegExp(`${escaped}\\s*(?:[:.-])?\\s*([\\s\\S]{1,220})`, "i");
  const match = text.match(pattern);
  if (!match?.[1]) return "";

  let value = match[1];
  for (const stopLabel of stopLabels) {
    const stop = value.search(new RegExp(escapeRegExp(stopLabel).replace(/\\ /g, "\\s+"), "i"));
    if (stop !== -1) value = value.slice(0, stop);
  }

  return cleanHdfcValue(value)
    .split(/\n/)[0]
    .replace(/\s{2,}.*/, "")
    .trim();
}

// Start of extractHdfcCommunicationAddress (Lines 3137-3141)
function extractHdfcCommunicationAddress(text) {
  const match = text.match(/Communication Address\s*:?\s*([\s\S]+?)\s*Tel\.\s*[0-9Xx*]{8,14}/i);
  if (!match?.[1]) return extractByLabels(text, ["Communication Address"], "text");
  return cleanHdfcValue(match[1]);
}

// Start of extractHdfcTotalIdv (Lines 3143-3156)
function extractHdfcTotalIdv(text) {
  const rowMatch =
    text.match(/Year 1From\s*\d{2}\/\d{2}\/\d{4}\s*To\s*\d{2}\/\d{2}\/\d{4}\s*([0-9]+)/i) ||
    text.match(/Total IDV\s*\(`\)[\s\S]{0,160}?Year 1From[^\n]*?([0-9]{8,})/i);
  if (rowMatch?.[1]) {
    const digits = rowMatch[1];
    const known = digits.match(/(10\d{5,7})$/);
    if (known?.[1]) return normalizeAmount(known[1]);
    if (digits.length > 8) return normalizeAmount(digits.slice(-7));
    return normalizeAmount(digits);
  }

  return extractByLabels(text, ["Total IDV", "IDV"], "amount");
}

// Start of extractHdfcGeographicalArea (Lines 3158-3163)
function extractHdfcGeographicalArea(text) {
  return (
    matchGroup(text, /Geographical Area\s+([A-Za-z ]+?)\s+Compulsory Deductible/i) ||
    extractByLabels(text, ["Geographical Area"], "text")
  );
}

// Start of extractHdfcInlineAmount (Lines 3165-3168)
function extractHdfcInlineAmount(text, pattern) {
  const match = text.match(pattern);
  return match?.[1] ? normalizeAmount(match[1]) : "";
}

// Start of extractHdfcAmountAfterCoverage (Lines 3170-3175)
function extractHdfcAmountAfterCoverage(text, label) {
  const escaped = escapeRegExp(label).replace(/\\ /g, "\\s+");
  const pattern = new RegExp(`${escaped}(?:\\s*\\([^\\n]+\\))?\\s*\\n\\s*([0-9,]+(?:\\.\\d{1,2})?)`, "i");
  const match = text.match(pattern);
  return match?.[1] ? normalizeAmount(match[1]) : "";
}

function extractHdfcTaxAmount(text, taxType) {
  const match = text.match(new RegExp(`${taxType}\\s+Tax\\s+9%\\s*\\([^0-9]*([0-9,.]+)`, "i"));
  return match?.[1] ? normalizeAmount(match[1]) : "";
}

// Start of extractHdfcPreviousPolicyNumber (Lines 3177-3179)
function extractHdfcPreviousPolicyNumber(text) {
  return matchGroup(text, /Previous Policy No\.?\s*([A-Z0-9/-]+)(?=Valid)/i);
}

// Start of extractHdfcPreviousPolicyValidity (Lines 3181-3183)
function extractHdfcPreviousPolicyValidity(text) {
  return matchGroup(text, /Previous Policy No\.?[A-Z0-9/-]+Valid\s*([0-9/]+\s*to\s*[0-9/]+)/i);
}

// Start of extractHdfcPreviousInsurer (Lines 3185-3190)
function extractHdfcPreviousInsurer(text) {
  return matchGroup(
    text,
    /Previous Policy No\.?[A-Z0-9/-]+Valid[0-9/]+\s*to\s*[0-9/]+\s*of\s*([A-Z0-9 .&-]+?)(?=NCB|Policy Holder|$)/i,
  );
}

// Start of extractHdfcPeriod (Lines 3192-3211)
function extractHdfcPeriod(text, side) {
  const ownDamagePeriod = text.match(
    /From Date & Time\s*(\d{2}\/\d{2}\/\d{4}[^\n]*?)\s*To Date & Time\s*(\d{2}\/\d{2}\/\d{4}[^\n]*?)\s*(?=From Date & Time|Note:|Premium Details|$)/i,
  );
  if (ownDamagePeriod?.[1] || ownDamagePeriod?.[2]) {
    return cleanHdfcValue(side === "start" ? ownDamagePeriod[1] : ownDamagePeriod[2]);
  }

  const pattern =
    /(?:Period\s+of\s+Insurance\s*)?From\s*[:.-]?\s*([^\n]{4,80}?)\s+(?:To|Upto)\s*[:.-]?\s*([^\n]{4,80})/i;
  const match = text.match(pattern);
  if (match?.[1] || match?.[2]) {
    return cleanHdfcPeriodValue(side === "start" ? match[1] : match[2]);
  }
  return extractByLabels(
    text,
    side === "start" ? ["From Date & Time", "From"] : ["To Date & Time", "To"],
    "text",
  );
}

// Start of cleanHdfcPeriodValue (Lines 3213-3217)
function cleanHdfcPeriodValue(value) {
  return cleanHdfcValue(value)
    .replace(/^Date\s*&?\s*Time\s*/i, "")
    .trim();
}

// Start of extractHdfcInsuredName (Lines 3219-3230)
function extractHdfcInsuredName(text) {
  const emailAddrMatch = text.match(/Email\s*ID\s*:[^\n]*\r?\n\s*([A-Z\s.]+?)\s*\r?\n\s*Communication\s+Address:/i);
  if (emailAddrMatch?.[1]) {
    return cleanHdfcValue(emailAddrMatch[1]);
  }

  const patterns = [
    /Customer\s+Name\s*(?:Block)?\s*[:.-]?\s*([^\n]{3,120})/i,
    /(?:Customer|Insured|Proposer)\s+Name\s*[:.-]?\s*([^\n]{3,120})/i,
    /\b(M\/S\s+[A-Z0-9&().,/ -]{3,100})\b/i,
  ];
  for (const pattern of patterns) {
    const value = matchGroup(text, pattern);
    if (value) return cleanHdfcValue(value);
  }
  return "";
}

module.exports = {
  extractHdfcErgoMotor,
  isHdfcErgoMotor,
  extractHdfcPolicyNumber,
  extractHdfcRegistrationNumber,
  extractHdfcBoundedText,
  extractHdfcCommunicationAddress,
  extractHdfcTotalIdv,
  extractHdfcGeographicalArea,
  extractHdfcInlineAmount,
  extractHdfcAmountAfterCoverage,
  extractHdfcPreviousPolicyNumber,
  extractHdfcPreviousPolicyValidity,
  extractHdfcPreviousInsurer,
  extractHdfcPeriod,
  cleanHdfcPeriodValue,
  extractHdfcInsuredName
};
