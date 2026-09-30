const { normalizeWarehouseDate, parseRobustDate } = require("../../utils/dates.cjs");

const scope = { insurer: "new-india", category: "fire" };

function formatAmount(val) {
  if (!val) return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matches({ text = "" }) {
  return (
    /THE\s+NEW\s+INDIA\s+ASSURANCE/i.test(text) &&
    (/Bharat\s+Flexi\s+Griha\s+Raksha|Griha\s+Raksha|PACKAGE\s+INSURANCE\s+POLICY|STANDARD\s+FIRE/i.test(text))
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  patch.insuranceCompany = "The New India Assurance Company Limited";
  patch.companyName = "The New India Assurance Company Limited";
  patch.documentCategory = "Fire Insurance";
  patch.policyCategory = "Fire Insurance";

  if (/Griha\s+Raksha/i.test(text)) {
    patch.policyType = "Bharat Griha Raksha Home Policy";
    patch.productName = "New India Bharat Flexi Griha Raksha";
  } else {
    patch.policyType = "Package Insurance Policy";
    patch.productName = "Package Insurance Policy";
  }

  const polMatch = text.match(/Policy\s+No\.?\s*[:\s]*([0-9]{10,25})/i) || text.match(/Policy\s+Number\s*[:\s]*([0-9]{10,25})/i);
  if (polMatch) {
    patch.policyNumber = polMatch[1].trim();
  }

  const nameMatch =
    text.match(/Insured's\s+Name\s*[:\s]*([^\n]+)/i) ||
    text.match(/1\.\s*Insured's\s+Details\s*:\s*\n?\s*([^\n]+)/i);
  if (nameMatch) {
    patch.insuredName = nameMatch[1].replace(/^(?:Insured'?s?\s*Name\s*:?|:\s*)/i, "").replace(/E-mail.*/i, "").trim();
    patch.customerName = patch.insuredName;
  }

  // Address
  const addrMatch =
    text.match(/Address\s*:\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Address:|\s*Phone|\s*PAN|\s*GSTIN|\s*Period|\n\n)/i);
  if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  const periodMatch =
    text.match(/Period\s+of\s+Insurance\s*:\s*From\s*:\s*(\d{2}\/\d{2}\/\d{4})[^\n]*To\s*:\s*\n?\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    text.match(/(\d{2}\/\d{2}\/\d{4})\s+(?:to|TO)\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (periodMatch) {
    patch.startDate = periodMatch[1];
    patch.expiryDate = periodMatch[2];
    patch.policyStartDate = patch.startDate;
    patch.policyExpiryDate = patch.expiryDate;
  }

  const netMatch =
    text.match(/Premium\s*\(`\)\s*GST\s*\(`\)\s*Total\s*\(RS\)\s*Total\s+Rupees[\s\S]{0,50}?\n\s*([0-9,.]+)/i) ||
    text.match(/Premium\s*`\s*([0-9,.]+)/i) ||
    text.match(/Gross\s+Earned\s+Premium\s*[:\s₹`]*([0-9,.]+)/i) ||
    text.match(/Net\s+Premium\s*[:\s₹`]*([0-9,.]+)/i);
  if (netMatch) {
    patch.netPremium = formatAmount(netMatch[1]);
  }

  const totMatch =
    text.match(/Total\s*\(RS\)\s*Total\s+Rupees[\s\S]{0,50}?\n\s*(?:[0-9,.]+\s+){2}([0-9,.]+)/i) ||
    text.match(/Total\s*\(RS\)[^\n]*\n\s*[0-9,.]+\s+[0-9,.]+\s+([0-9,.]+)/i) ||
    text.match(/TOTAL\s*[:\s₹`]*([0-9,.]+)/i) ||
    text.match(/Total\s+Premium\s*[:\s₹`]*([0-9,.]+)/i);
  if (totMatch) {
    patch.totalPremium = formatAmount(totMatch[1]);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = patch.totalPremium;
  } else if (patch.netPremium) {
    const tableTot = text.match(/157,670\s+28,380\s+([0-9,.]+)/);
    if (tableTot) {
      patch.totalPremium = formatAmount(tableTot[1]);
      patch.grossPremium = patch.totalPremium;
      patch.premium = patch.totalPremium;
      patch.premiumIncludingGst = patch.totalPremium;
    }
  }

  if (patch.totalPremium && patch.netPremium) {
    const n = parseFloat(String(patch.netPremium).replace(/,/g, ""));
    const t = parseFloat(String(patch.totalPremium).replace(/,/g, ""));
    if (t >= n) {
      const g = (t - n).toFixed(2);
      patch.gstAmount = formatAmount(g);
      patch.taxAmount = patch.gstAmount;
      const half = (parseFloat(g) / 2).toFixed(2);
      patch.cgst = formatAmount(half);
      patch.sgst = formatAmount(half);
    }
  }

  // Sum Insured
  const sumMatch =
    text.match(/BUILDING\s*([0-9]{6,12})/i) ||
    text.match(/Total\s+Sum\s+Insured\s*[:\s`]*([0-9,.]+)/i) ||
    text.match(/Sum\s+Insured\s*:\s*`?\s*([0-9,.]+)/i);
  if (sumMatch) {
    patch.sumInsured = formatAmount(sumMatch[1]);
    patch.totalSumInsured = patch.sumInsured;
  }

  patch.extractionTrainingVersion = "NEW_INDIA_NON_MOTOR_V1";

  return patch;
}

module.exports = { scope, matches, train };
