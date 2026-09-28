const { normalizeWarehouseDate, parseRobustDate } = require("../../utils/dates.cjs");

const scope = { insurer: "icici-lombard", category: "fidelity" };

function formatAmount(val) {
  if (!val) return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matches({ text = "" }) {
  return (
    /ICICI\s+Lombard/i.test(text) &&
    (/FIDELITY|Misc\s*03|4003\//i.test(text))
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  patch.insuranceCompany = "ICICI Lombard General Insurance Company Limited";
  patch.companyName = "ICICI Lombard General Insurance Company Limited";
  patch.documentCategory = "Fidelity Insurance";
  patch.policyCategory = "Fidelity Insurance";
  patch.policyType = "Fidelity Guarantee Insurance Policy";
  patch.productName = "Fidelity Guarantee Insurance Policy";

  const polMatch = text.match(/Policy\s+No\.?[:\s]*([0-9/]+)/i) || text.match(/4003\/[0-9/]+/);
  if (polMatch) {
    patch.policyNumber = (polMatch[1] || polMatch[0]).trim();
  }

  const nameMatch = text.match(/1\.Name\s+of\s+the\s+Insured\s*[:\s]*([^\n]+)/i) || text.match(/M\/S\s*LION[^\n]+/i);
  if (nameMatch) {
    patch.insuredName = (nameMatch[1] || nameMatch[0]).replace(/^1\.Name\s+of\s+the\s+Insured\s*[:\s]*/i, "").trim();
    patch.customerName = patch.insuredName;
  }

  // Address
  const addrMatch =
    text.match(/2\.Mailing\s+Address\s*[:\s]*([A-Za-z0-9\s.,&/()-]+?)(?=\s*3\.|\s*Period|\n\n)/i) ||
    text.match(/Address\s+of\s+the\s+Insured\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Telephone|\s*Email|\s*Period|\n\n)/i);
  if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  const periodMatch = text.match(/Period\s+of\s+Insurance\s*From\s*([0-9A-Za-z/-]+)\s*To\s*([0-9A-Za-z/-]+)/i);
  if (periodMatch) {
    patch.startDate = parseRobustDate(periodMatch[1]) || normalizeWarehouseDate(periodMatch[1]);
    patch.expiryDate = parseRobustDate(periodMatch[2]) || normalizeWarehouseDate(periodMatch[2]);
    patch.policyStartDate = patch.startDate;
    patch.policyExpiryDate = patch.expiryDate;
  }

  const totMatch =
    text.match(/Total\s+Premium\(Rs\.\)\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Amount[^\n]*\n?\s*([0-9,.]+)/i) ||
    text.match(/Premium[^\n]*?Including\s*GST[^\n0-9]*([0-9,.]+)/i) ||
    text.match(/Total\s+Premium\s+inclusive\s+Tax[^\n]*\n\s*([0-9,.]+)/i);
  if (totMatch) {
    patch.totalPremium = formatAmount(totMatch[1]);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = patch.totalPremium;
  } else if (result.totalPremium || result.premiumIncludingGst) {
    patch.totalPremium = formatAmount(result.totalPremium || result.premiumIncludingGst);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = patch.totalPremium;
  }

  const netMatch =
    text.match(/Premium\s*\(Rs\.\)\s*([0-9,.]+)/i) ||
    text.match(/Premium\s+Value\s+without\s+Tax[^\n]*\n\s*([0-9,.]+)/i);
  if (netMatch) {
    patch.netPremium = formatAmount(netMatch[1]);
  }

  patch.extractionTrainingVersion = "ICICI_LOMBARD_FIDELITY_V1";

  return patch;
}

module.exports = { scope, matches, train };
