const { normalizeWarehouseDate, parseRobustDate } = require("../../utils/dates.cjs");

const scope = { insurer: "iffco-tokio", category: "fire" };

function formatAmount(val) {
  if (!val) return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matches({ text = "" }) {
  return (
    /IFFCO\s*[- ]?\s*TOKIO/i.test(text) &&
    (/Trade\s+Protector|FLEXI\s+PROPERTY\s+PROTECTOR|BURGLARY\s+AND\s+HOUSE\s+BREAKING|Contractors\s+Plant\s+and\s+Machinery|STANDARD\s+FIRE/i.test(text))
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  patch.insuranceCompany = "IFFCO Tokio General Insurance Company Limited";
  patch.companyName = "IFFCO Tokio General Insurance Company Limited";

  if (/Trade\s+Protector/i.test(text)) {
    patch.documentCategory = "Fire Insurance";
    patch.policyCategory = "Fire Insurance";
    patch.policyType = "Trade Protector Policy";
    patch.productName = "Trade Protector Policy (Sookshma Udyam)";
  } else if (/BURGLARY\s+AND\s+HOUSE\s+BREAKING|BURGLARY\s+FIRST\s+LOSS/i.test(text)) {
    patch.documentCategory = "Burglary Insurance";
    patch.policyCategory = "Burglary Insurance";
    patch.policyType = "Burglary and House Breaking Insurance Policy";
    patch.productName = "IFFCO TOKIO Burglary And House Breaking Insurance Policy";
  } else if (/Contractors\s+Plant\s+and\s+Machinery/i.test(text)) {
    patch.documentCategory = "Contractors Plant & Machinery";
    patch.policyCategory = "Engineering / CPM";
    patch.policyType = "Contractors Plant and Machinery Policy";
    patch.productName = "Contractors Plant and Machinery";
  } else {
    patch.documentCategory = "Fire Insurance";
    patch.policyCategory = "Fire Insurance";
    patch.policyType = "Flexi Property Protector Policy";
    patch.productName = "IFFCO TOKIO Flexi Property Protector Policy";
  }

  // Policy Number
  const polMatch =
    text.match(/Policy\s+Number\s*[:\s]*([0-9A-Za-z]{6,25})/i) ||
    text.match(/Policy\s+No\.?[\s.:]*([0-9A-Za-z]{6,25})/i);
  if (polMatch) {
    patch.policyNumber = polMatch[1].replace(/Bill.*/i, "").trim();
  }

  // Insured Name
  const nameMatch =
    text.match(/Proposer\s*:\s*([^\n]+)/i) ||
    text.match(/Insured's\s*name\s*[:\s]*([^\n]+)/i) ||
    text.match(/Insured\s*([A-Za-z0-9\s.,&/-]+?)(?=\s*Client\s+Number|\s*Corresponding|\n)/i);
  if (nameMatch) {
    patch.insuredName = nameMatch[1].replace(/^:\s*/, "").replace(/\s+/g, " ").trim();
    patch.customerName = patch.insuredName;
  }

  // Address
  const addrMatch =
    text.match(/Corresponding\s+Address\s*\n\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*\*{3,}|\s*Client|\s*Policy|\s*Unique|\n\n)/i) ||
    text.match(/Address\s*:\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Unique|\s*Policy|\s*Pincode|\s*Date|\n\n)/i);
  if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  // Period / Dates
  const periodMatch =
    text.match(/Policy\s+effective\s+from\s+[0-9]+\s+hrs\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*To\s*(?:MidNight\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    text.match(/Period\s+of\s+Insurance\s*[:\s]*From\s*[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})\s*To\s*[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (periodMatch) {
    patch.startDate = parseRobustDate(periodMatch[1]) || normalizeWarehouseDate(periodMatch[1]);
    patch.expiryDate = parseRobustDate(periodMatch[2]) || normalizeWarehouseDate(periodMatch[2]);
    patch.policyStartDate = patch.startDate;
    patch.policyExpiryDate = patch.expiryDate;
  }

  // Financials
  const netMatch =
    text.match(/Net\s+Premium\s*\(Rs\.?\)\s*\/Taxable\s+Value\s*([0-9,.]+)/i) ||
    text.match(/Taxable\s+Value[\s\S]*?Amount\s*([0-9]+(?:\.[0-9]{2})?)/i) ||
    text.match(/Amount([0-9]+(?:\.[0-9]{2})?)/i) ||
    text.match(/Net\s+Premium[^\n]*\n?\s*([0-9,.]+)/i);
  if (netMatch) {
    patch.netPremium = formatAmount(netMatch[1]);
  }

  const totMatch =
    text.match(/Total\s+Premium\s+Payable\s*\(Rs\.?\)\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Value\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Amount[^\n]*\n?\s*([0-9,.]+)/i);
  if (totMatch) {
    patch.totalPremium = formatAmount(totMatch[1]);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = patch.totalPremium;
  }

  const sumInsuredMatch =
    text.match(/BUILDING\s+Sum\s+Insured\s*:\s*([0-9,.]+)/i) ||
    text.match(/Stock\s+In\s+Trade\s+Sum\s+Insured\s*:\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Sum\s+Insured\s*[:\s₹`]*([0-9,.]+)/i);
  if (sumInsuredMatch) {
    patch.sumInsured = formatAmount(sumInsuredMatch[1]);
    patch.totalSumInsured = patch.sumInsured;
  }

  patch.extractionTrainingVersion = "IFFCO_TOKIO_NON_MOTOR_V1";

  return patch;
}

module.exports = { scope, matches, train };
