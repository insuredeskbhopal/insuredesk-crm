const { normalizeWarehouseDate, parseRobustDate } = require("../../utils/dates.cjs");

const scope = { insurer: "icici-lombard", category: "public-liability" };

function formatAmount(val) {
  if (!val) return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matches({ text = "" }) {
  return (
    /ICICI\s+Lombard/i.test(text) &&
    /Public\s+Liability\s+Insurance|Public\s+Liability\s*\(Industrial\s+Risks\)|Product\s+Code:\s*4008/i.test(text)
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  patch.insuranceCompany = "ICICI Lombard General Insurance Company Limited";
  patch.companyName = "ICICI Lombard General Insurance Company Limited";
  patch.documentCategory = "Public Liability";
  patch.policyCategory = "Public Liability";
  patch.policyType = "Public Liability Insurance Policy";
  patch.productName = "Public Liability Insurance (Industrial Risks)";

  // Policy Number
  const polMatch =
    text.match(/Policy\s+Number\s*[:\s]*([0-9A-Z/]+)/i) ||
    text.match(/Policy\s*No\.?\s*[:\s]*([0-9A-Z/]+)/i);
  if (polMatch) {
    patch.policyNumber = polMatch[1].replace(/Issued.*/i, "").trim();
  }

  // Insured Name
  const nameMatch =
    text.match(/1Name of the Insured\s*([^\n]+)/i) ||
    text.match(/Name\s+of\s+the\s+Insured\s*[:\s]*\n?\s*([^\n]+)/i) ||
    text.match(/Date\s*:\s*[A-Za-z0-9,\s]+\n\s*([A-Za-z\s.]+?)(?=\s*PLOT|\s*LION\s+TOWER|\n)/i);
  if (nameMatch) {
    patch.insuredName = nameMatch[1].replace(/^:\s*/, "").replace(/\s+/g, " ").trim();
    patch.customerName = patch.insuredName;
    patch.proposerName = patch.insuredName;
    patch.contactPerson = patch.insuredName;
    patch.groupName = patch.insuredName;
  }

  // Address
  const addrMatch =
    text.match(/(?:2Mailing\s+Address\s+of\s+the\s+insured|Address\s+of\s+the\s+Insured)\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*\d*Business\s+of\s+the\s+insured|\s*Telephone|\s*Email|\s*Period|\s*Pincode|\n\n)/i) ||
    text.match(/Address\s+of\s+the\s+Insured\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*\d*Business\s+of\s+the\s+insured|\s*Telephone|\s*Email|\s*Period|\s*Pincode|\n\n)/i) ||
    text.match(/PLOT\s+NO\s*:\s*[A-Za-z0-9\s.,&/()-]+?(?=\s*\d*Business\s+of\s+the\s+insured|\s*Telephone|\s*Email|\s*Period|\n\n)/i) ||
    text.match(/Address\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*\d*Business\s+of\s+the\s+insured|\s*Telephone|\s*Email|\s*Period|\n\n)/i);
  if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  // Period / Dates
  const fromTo =
    text.match(/From\s*:\s*([0-9A-Za-z-]+)\s*To\s*:\s*([0-9A-Za-z-]+)/i) ||
    text.match(/Period\s+of\s+Insurance\s*[:\s]*From\s*([0-9A-Za-z-]+)[^\n]*To\s+([0-9A-Za-z-]+)/i);
  if (fromTo) {
    patch.startDate = parseRobustDate(fromTo[1]) || normalizeWarehouseDate(fromTo[1]);
    patch.expiryDate = parseRobustDate(fromTo[2]) || normalizeWarehouseDate(fromTo[2]);
    patch.policyStartDate = patch.startDate;
    patch.policyExpiryDate = patch.expiryDate;
    patch.policyEndDate = patch.expiryDate;
  }

  // Financials
  const baseMatch = text.match(/Base\s+Premium\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (baseMatch) {
    patch.netPremium = formatAmount(baseMatch[1]);
  }

  const gstMatch = text.match(/Applicable\s+GST\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (gstMatch) {
    patch.gstAmount = formatAmount(gstMatch[1]);
    patch.taxAmount = patch.gstAmount;
  }

  const cgstMatch =
    text.match(/(?:^|\n)\s*\d*CGST\s*9\s*(\d+\.\d{2})/i) ||
    text.match(/CGST\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (cgstMatch) {
    patch.cgst = formatAmount(cgstMatch[1]);
  }

  const sgstMatch =
    text.match(/(?:^|\n)\s*\d*(?:SGST|UTGST)\s*9\s*(\d+\.\d{2})/i) ||
    text.match(/(?:SGST|UTGST)\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (sgstMatch) {
    patch.sgst = formatAmount(sgstMatch[1]);
  }

  const igstMatch =
    text.match(/(?:^|\n)\s*\d*IGST\s*(?:18|0)\s*(\d+\.\d{2})/i) ||
    text.match(/IGST\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (igstMatch) {
    patch.igst = formatAmount(igstMatch[1]);
  }

  const totMatch =
    text.match(/Total\s+Amount\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Premium\*?\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (totMatch) {
    patch.totalPremium = formatAmount(totMatch[1]);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = patch.totalPremium;
  }

  // Limit of Indemnity (AOY / AOA)
  const aoyMatch = text.match(/Aggregate\s+One\s+Year\s*\(AOY\)\s*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (aoyMatch) {
    patch.sumInsured = formatAmount(aoyMatch[1]);
    patch.totalSumInsured = patch.sumInsured;
  }

  // Intermediary Details
  const interMatch = text.match(
    /(?:13Intermediary\s+Details|Intermediary\s+Details)[\s\S]*?Name\s*([^\n]+)[\s\S]*?Code\s*([^\n]+)[\s\S]*?Phone\s+No\.?\s*([^\n]+)[\s\S]*?Email\s+ID\s*([^\n]+)/i,
  );
  if (interMatch) {
    patch.agentName = interMatch[1].trim();
    patch.agentCode = interMatch[2].trim();
    patch.agentMobile = interMatch[3].trim();
    patch.agentEmail = interMatch[4].trim();
  }

  // Risk Location / Premise Insured (Annexure A)
  const premiseMatch = text.match(
    /Address\s+of\s+Premise\s+Insured\s*\n\s*1\s*\n([\s\S]+?)(?=\n\s*(?:ICICI|2\b|Page|\d+\s*\/))/i,
  );
  if (premiseMatch) {
    patch.riskLocation = premiseMatch[1].replace(/\s+/g, " ").trim();
    patch.locationOfRisk = patch.riskLocation;
  }

  // Zero out motor fields to ensure complete isolation
  patch.registrationNumber = "";
  patch.vehicleNumber = "";
  patch.makeModel = "";
  patch.chassisNumber = "";
  patch.engineNumber = "";

  // Payment Details
  patch.modeOfPayment = "Online";
  patch.paymentMode = "Online";
  patch.paymentMethod = "ONLINE";

  patch.extractionTrainingVersion = "ICICI_LOMBARD_PLI_V1";

  return patch;
}

module.exports = { scope, matches, train };
