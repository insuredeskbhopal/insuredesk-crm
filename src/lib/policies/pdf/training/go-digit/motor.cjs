const { normalizeAmount } = require("../../utils/amounts.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanHdfcValue } = require("../../utils/text.cjs");

const scope = { insurer: "go-digit", category: "motor" };

function matches({ text = "", result = {} }) {
  const company = String(result.insuranceCompany || result.companyName || "");
  const isDigit = /Go\s+Digit|Digit/i.test(company) || /Go\s+Digit|godigit\.com|Digit\s+Two-Wheeler/i.test(text);
  const isMotor = /Motor|Two-Wheeler|Private\s+Car|Commercial\s+Vehicle/i.test(
    result.documentCategory || result.policyType || text
  );
  return isDigit && isMotor;
}

function cleanAmount(val) {
  return normalizeAmount(String(val || "").replace(/,/g, ""));
}

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const patch = {};

  // Policy Number
  const policyNo = matchGroup(text, /Policy\s*No\.?\s*:?\s*([A-Z0-9]{8,25})/i);
  if (policyNo) {
    patch.policyNumber = policyNo;
  }

  // Insured Name
  const rawInsured = matchGroup(text, /Name\s*(?:MS|MR|MRS|DR)?\s*([A-Za-z\s]{3,40}?)(?=Vehicle\s+Registration|Registration\s+Mark|Policy|Period|Address|\n)/i) ||
                     matchGroup(text, /Name\s+of\s+Insured\s*(?:Person)?\s*(?:MS|MR|MRS|DR)?\s*([A-Za-z\s]{3,40}?)(?=\n|Mobile|E-mail|Present|Address)/i) ||
                     matchGroup(text, /Insured\s+Name\s*:?\s*(?:MS|MR|MRS|DR)?\s*([A-Za-z\s]{3,40}?)(?=\n|Mobile|Address)/i);
  const cleanedInsured = cleanHdfcValue(rawInsured).replace(/^(?:MS|MR|MRS|DR|M\/S)\s+/i, "");
  if (cleanedInsured && cleanedInsured.length > 2) {
    patch.insuredName = cleanedInsured;
    patch.customerName = cleanedInsured;
    patch.contactPerson = cleanedInsured;
  }

  // Policy Period (Dates)
  const dateMatches = Array.from(text.matchAll(/\b(\d{2}-[A-Za-z]{3}-\d{4})\b/g)).map(m => m[1]);
  if (dateMatches.length >= 2) {
    patch.startDate = dateMatches[0];
    patch.expiryDate = dateMatches.find(d => d !== patch.startDate) || dateMatches[1];
  }

  // Registration Number & RTO Location
  const regMatch = matchGroup(text, /Vehicle\s+Registration\s+No\.?\s*:?\s*([A-Z0-9]{8,15})/i);
  if (regMatch) {
    patch.registrationNumber = regMatch;
  }

  const rtoMatch = text.match(/RTO\s+Location\s*:?\s*([A-Za-z0-9\s,]+?)(?=\n|Make)/i);
  if (rtoMatch?.[1]) {
    patch.rto = rtoMatch[1].trim();
  }

  // Vehicle Make / Model / Variant
  const makeMatch = text.match(/Make\s*:?\s*(HONDA|HERO|TVS|YAMAHA|BAJAJ|ROYAL\s+ENFIELD|SUZUKI|MARUTI|HYUNDAI|TATA|MAHINDRA|TOYOTA|VOLKSWAGEN|RENAULT|FORD|NISSAN|KIA|MG)/i);
  if (makeMatch?.[1]) {
    patch.vehicleMake = makeMatch[1].trim();
  }

  const modelMatch = text.match(/(ACTIVA|JUPITER|ACCESS|SHINE|SPLENDOR|PULSAR|APACHE|ROYAL\s+ENFIELD|CLASSIC|BULLET|DIET|XL100|AVENIS|VESPA|DIO)\s*\/\s*([A-Z0-9]+)/i) ||
                         text.match(/Model\/Vehicle\s+Variant[^\n]*\n?\s*([A-Z0-9\s-]+?)\/([A-Z0-9\s-]+?)(?=\n|Body\s+Type)/i);
  if (modelMatch) {
    patch.vehicleModel = modelMatch[1].trim();
    patch.variant = modelMatch[2].trim();
    if (patch.vehicleMake) {
      patch.makeModel = `${patch.vehicleMake} ${patch.vehicleModel}`;
    }
  }

  // Engine Number & Chassis Number
  const engineMatch = text.match(/Engine\s+No\.?\s*:?\s*([A-Z0-9]{8,15})/i);
  if (engineMatch?.[1]) {
    patch.engineNumber = engineMatch[1].replace(/Cha.*$/i, "").trim();
  }

  const chassisMatch = text.match(/Chassis\s+No\.?\s*:?\s*([A-Z0-9]{10,25})/i);
  if (chassisMatch?.[1]) {
    patch.chassisNumber = chassisMatch[1].trim();
  }

  // IDV / Sum Insured
  const idvMatch = text.match(/Year\s+1\s*([0-9]{4,8})/i) || text.match(/Total\s+IDV[\s\S]{0,40}?([0-9]{4,8})/i);
  if (idvMatch?.[1]) {
    const idvVal = cleanAmount(idvMatch[1]);
    patch.totalIdv = idvVal;
    patch.sumInsured = idvVal;
    patch.idv = idvVal;
  }

  // Registration Date & Manufacturing Year
  const yearMatch = text.match(/Year\s+of\s+Regn\/Year\s+of\s+Mfg\.?\s*\n?\s*(\d{4})/i);
  if (yearMatch?.[1]) {
    patch.manufacturingYear = yearMatch[1];
    patch.registrationDate = yearMatch[1];
  }

  // Customer Address
  const addrMatch = text.match(/Address\s*\n?\s*([A-Za-z0-9\s.,/-]{10,120}?)(?=\n|Partner\s+Code|Mobile)/i);
  if (addrMatch?.[1]) {
    patch.communicationAddress = cleanHdfcValue(addrMatch[1]).trim();
    patch.customerAddress = patch.communicationAddress;
  }

  // Endorsement / Premium Invoice table: InvoiceNumber InvoiceDate NetPremium Igst Cgst Sgst Utgst CessGrossPremium
  // e.g. IA2728356492026-07-13754.550.0067.9167.910.000.00890.37
  const invoiceMatch = text.match(/([A-Z0-9]{8,20})\s*(\d{4}-\d{2}-\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})/);
  if (invoiceMatch) {
    const net = cleanAmount(invoiceMatch[3]);
    const cgst = parseFloat(cleanAmount(invoiceMatch[5]) || 0);
    const sgst = parseFloat(cleanAmount(invoiceMatch[6]) || 0);
    const totalGst = (cgst + sgst).toFixed(2);
    const gross = cleanAmount(invoiceMatch[9]);

    patch.netPremium = net;
    patch.basicPremium = net;
    patch.gstAmount = totalGst;
    patch.taxAmount = totalGst;
    patch.totalPremium = gross;
    patch.grossPremium = gross;
    patch.premiumIncludingGst = gross;
    patch.premium = gross;
  } else {
    // Fallback search for Total OD + Total Act / Final Premium
    const grossMatch = text.match(/(?:Gross\s+Premium|Final\s+Premium|TOTAL\s+POLICY\s+PREMIUM)[\s\S]{0,40}?([0-9,]+\.\d{2})/i);
    if (grossMatch?.[1]) {
      const gross = cleanAmount(grossMatch[1]);
      patch.totalPremium = gross;
      patch.grossPremium = gross;
      patch.premium = gross;
    }
  }

  patch.extractionTrainingVersion = "GO_DIGIT_MOTOR_V1";

  return patch;
}

module.exports = {
  scope,
  matches,
  train,
};
