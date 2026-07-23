const { normalizeAmount } = require("../../utils/amounts.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanHdfcValue } = require("../../utils/text.cjs");

const scope = { insurer: "liberty", category: "motor" };

function matches({ text = "", result = {} }) {
  const company = String(result.insuranceCompany || result.companyName || "");
  const isLiberty = /Liberty/i.test(company) || /LIBERTY\s+GENERAL\s+INSURANCE/i.test(text);
  const isMotor = /Motor|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle/i.test(
    result.documentCategory || result.policyType || text
  );
  return isLiberty && isMotor;
}

function cleanAmount(val) {
  return normalizeAmount(String(val || "").replace(/,/g, ""));
}

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const patch = {};

  // Policy Number
  const policyRef = matchGroup(text, /PolicyRef\s*No\.?\s*([0-9]{15,30})/i) || matchGroup(text, /Policy\s*No\.?\s*([0-9]{15,30})/i);
  if (policyRef) {
    patch.policyNumber = policyRef;
  }

  // Insured Name
  const rawInsured = matchGroup(text, /Name\s+of\s+Insured\s*:?\s*(?:\(Mr\/Mrs\/M\/s\/Dr\))?\s*\n?\s*([A-Za-z\s]{3,40}?)(?=\n|e-Insurance|Communication|Address)/i) ||
                     matchGroup(text, /\nInsured\s*([A-Za-z\s]{3,40}?)(?=Policy\s+Issued|Address|Covernote|Customer|\n)/i);
  const cleanedInsured = cleanHdfcValue(rawInsured).replace(/^(?:Mr\/Mrs\/M\/s\/Dr|Mr|Mrs|Ms|Dr)\s+/i, "");
  if (cleanedInsured && cleanedInsured.length > 2) {
    patch.insuredName = cleanedInsured;
    patch.customerName = cleanedInsured;
    patch.contactPerson = cleanedInsured;
  }

  // Period of Insurance (Dates)
  const periodMatch = text.match(/Period\s+of\s+Insurance[\s\S]{0,60}?From\s*(?:\d{2}:\d{2}\s*Hrs\s*of\s*)?(\d{2}\/\d{2}\/\d{4})[\s\S]{0,50}?To\s*(?:Midnight\s*of\s*)?(\d{2}\/\d{2}\/\d{4})/i);
  if (periodMatch) {
    patch.startDate = periodMatch[1];
    patch.expiryDate = periodMatch[2];
  }

  // Vehicle Make / Model / Variant
  const makeModelMatch = text.match(/(SKODA|MARUTI|HYUNDAI|HONDA|TATA|MAHINDRA|TOYOTA|VOLKSWAGEN|RENAULT|FORD|NISSAN|KIA|MG)\/([A-Z0-9\s-]+)\/([A-Z0-9\.\s-]+?)(?=-Sedan|Sedan|\n)/i) ||
                         text.match(/(SKODA|MARUTI|HYUNDAI|HONDA|TATA|MAHINDRA|TOYOTA|VOLKSWAGEN|RENAULT|FORD|NISSAN|KIA|MG)\s*(RAPID|SWIFT|BALENO|I20|CRETA|CITY|NEXON|HARRIER|SELTOS)\s*([A-Z0-9\.\s-]+)?/i);
  if (makeModelMatch) {
    patch.vehicleMake = makeModelMatch[1].trim();
    patch.vehicleModel = makeModelMatch[2].trim();
    patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel}`;
    if (makeModelMatch[3]) patch.variant = cleanHdfcValue(makeModelMatch[3]);
  }

  // Engine Number & Chassis Number
  const engineMatch = text.match(/\bEngine\s+No\.?\s*\n?\s*([A-Z0-9]{6,20})/i);
  if (engineMatch?.[1] && !/Chassis|Make|Model/i.test(engineMatch[1])) {
    patch.engineNumber = engineMatch[1].trim();
  } else {
    const rawEngine = text.match(/\b([A-Z0-9]{3,6}\d{5,8})\b/);
    if (rawEngine?.[1]) patch.engineNumber = rawEngine[1];
  }

  const chassisMatch = text.match(/\bChassis\s+No\.?\s*\n?\s*([A-Z0-9]{10,25})/i);
  if (chassisMatch?.[1]) {
    patch.chassisNumber = chassisMatch[1].replace(/\s+/g, "").trim();
  }

  // IDV / Sum Insured
  const idvMatch = text.match(/IDV\s+Of\s+Vehicle[\s\S]{0,120}?([0-9,]+\.\d{2})/i) ||
                   text.match(/Total\s+IDV\s+Rs\.?[\s\S]{0,30}?([0-9,]+(?:\.\d{2})?)/i);
  if (idvMatch?.[1]) {
    const idvVal = cleanAmount(idvMatch[1]);
    patch.totalIdv = idvVal;
    patch.sumInsured = idvVal;
    patch.idv = idvVal;
  }

  // Manufacturing Year & Registration Date
  const regDateMatch = text.match(/Date\s+of\s+Registration[\s\n]*(\d{2}\/\s*\d{2}\/\s*\d{4})/i);
  if (regDateMatch?.[1]) {
    patch.registrationDate = regDateMatch[1].replace(/\s+/g, "");
  }

  const yearMatch = text.match(/Year\s+of\s+Manufacture[^\n]*\n\s*(\d{4})/i) || text.match(/\b(20\d{2})\/(?:\d{2}-\d{2}-\d{4})/i);
  if (yearMatch?.[1]) {
    patch.manufacturingYear = yearMatch[1];
  }

  // Contact Mobile & Email
  const mobileMatch = text.match(/Mobile\s*No\.?\s*:?[\s\n]*([0-9]{10})/i) || text.match(/Contact\s+Number[^\n]*\+91\s*([0-9]{10})/i);
  if (mobileMatch?.[1]) {
    patch.customerMobile = mobileMatch[1];
    patch.contactNumber = mobileMatch[1];
  }

  const emailMatch = text.match(/Email\s+ID\s*:?[\s\n]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i);
  if (emailMatch?.[1]) {
    patch.customerEmail = emailMatch[1].trim();
  }

  // Financer Name
  const financerMatch = text.match(/Hire\s+Purchase\/Lease\/Hypothecated\s+with\s*:?\s*([A-Za-z0-9\s.,-]+?)(?=\n|LIMITATIONS|$)/i) ||
                        text.match(/Name\s+of\s+Financier[^\n]*\n\s*([A-Za-z0-9\s.,-]+?)(?=\n|Name\s+of\s+Insured|$)/i);
  if (financerMatch?.[1]) {
    patch.financerName = cleanHdfcValue(financerMatch[1]).replace(/&.*$/, "").trim();
  }

  // Premiums
  const netMatch = text.match(/Net\s+Premium\s*(?:\([^)]*\))?\s*(?:Taxable\s+Value)?[\s\S]{0,60}?`?\s*([0-9,]+\.\d{2})/i);
  if (netMatch?.[1]) {
    const net = cleanAmount(netMatch[1]);
    patch.netPremium = net;
    patch.basicPremium = net;
  }

  const gstMatch = text.match(/GST\s*\(\d+%\)[\s\S]{0,60}?`?\s*([0-9,]+\.\d{2})/i);
  if (gstMatch?.[1]) {
    const gst = cleanAmount(gstMatch[1]);
    patch.gstAmount = gst;
    patch.taxAmount = gst;
  }

  const totalMatch = text.match(/TOTAL\s+POLICY\s+PREMIUM[\s\S]{0,60}?`?\s*([0-9,]+\.\d{2})/i);
  if (totalMatch?.[1]) {
    const total = cleanAmount(totalMatch[1]);
    patch.totalPremium = total;
    patch.grossPremium = total;
    patch.premiumIncludingGst = total;
    patch.premium = total;
  }

  patch.extractionTrainingVersion = "LIBERTY_MOTOR_V1";

  return patch;
}

module.exports = {
  scope,
  matches,
  train,
};
