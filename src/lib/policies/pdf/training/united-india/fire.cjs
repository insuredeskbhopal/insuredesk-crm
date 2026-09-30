const { normalizeAmount } = require("../../utils/amounts.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanWarehouseBlock } = require("../../utils/text.cjs");

const scope = { insurer: "united-india", category: "fire" };

function formatAmount(val) {
  if (!val) return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matches({ text = "" }) {
  return (
    /UNITED\s+INDIA\s+INSURANCE\s+COMPANY\s+LIMITED/i.test(text) &&
    /STANDARD\s+FIRE\s+AND\s+SPECIAL\s+PERILS\s+POLICY|FIRE\s+POLICY/i.test(text)
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  patch.insuranceCompany = "United India Insurance Company Limited";
  patch.companyName = "United India Insurance Company Limited";
  patch.documentCategory = "Fire Insurance";
  patch.policyCategory = "Fire Insurance";
  patch.policyType = "Standard Fire and Special Perils Policy";
  patch.productName = "Standard Fire and Special Perils Policy";

  // Policy Number
  const polMatch =
    text.match(/POLICY\s+NO\.?\s*[:\s]*([0-9A-Za-z]+)/i) ||
    text.match(/Policy\s+Number\s*[:\s]*([0-9A-Za-z]+)/i);
  if (polMatch) {
    patch.policyNumber = polMatch[1].trim();
  }

  // Insured Name
  const insuredBlock = text.match(/Insured\s*\n\s*([^\n]+)/i) || text.match(/M\/S[^\n]+/i);
  if (insuredBlock) {
    patch.insuredName = insuredBlock[1] ? insuredBlock[1].replace(/^M\/s\.?\s*/i, "").trim() : insuredBlock[0].trim();
    patch.customerName = patch.insuredName;
  }

  // Address
  const addrMatch =
    text.match(/Location\s+Address[\s\S]{0,100}?SILO\s+BAG[^\n]*\n\s*([A-Za-z0-9\s.,&/()-]+?Pin-\d{6})/i) ||
    text.match(/Location\s+Address[\s\S]{0,100}?\n\s*([A-Za-z0-9\s.,&/()-]+?Pin-\d{6})/i) ||
    text.match(/Address\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?Pin-\d{6})/i);
  if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  // Dates
  const startDateMatch = text.match(/From\s*(?:00:00\s*Hrs\s*of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const expiryDateMatch = text.match(/To\s*(?:Midnight\s*of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (startDateMatch) patch.startDate = startDateMatch[1];
  if (expiryDateMatch) patch.expiryDate = expiryDateMatch[1];
  patch.policyStartDate = patch.startDate;
  patch.policyExpiryDate = patch.expiryDate;

  // Financials
  const netMatch =
    text.match(/Gross\s+Earned\s+Premium\s*[:\s₹`]*([0-9,.]+)/i) ||
    text.match(/Net\s+Premium\s*[:\s₹`]*([0-9,.]+)/i) ||
    text.match(/Premium\s*[:\s₹`]*([0-9,.]+)/i);
  if (netMatch) {
    patch.netPremium = formatAmount(netMatch[1]);
  }

  const totMatch =
    text.match(/TOTAL\s*[:\s₹`]*([0-9,.]+)/i) ||
    text.match(/Total\s+Amount\s*[:\s₹`]*([0-9,.]+)/i) ||
    text.match(/Total\s+Premium\s*[:\s₹`]*([0-9,.]+)/i);
  if (totMatch) {
    patch.totalPremium = formatAmount(totMatch[1]);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = patch.totalPremium;
  }

  // Sum Insured
  const sumMatch =
    text.match(/Sum\s+Insured\s*\(\s*\)\s*\n\s*Contents\s*([0-9,.]+)/i) ||
    text.match(/Contents\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Sum\s+Insured\s*[:\s₹`]*([0-9,.]+)/i);
  if (sumMatch) {
    patch.sumInsured = formatAmount(sumMatch[1]);
    patch.totalSumInsured = patch.sumInsured;
  }

  patch.extractionTrainingVersion = "UNITED_INDIA_FIRE_V1";

  return patch;
}

module.exports = { scope, matches, train };
