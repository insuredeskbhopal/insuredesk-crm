const { normalizeWarehouseDate, parseRobustDate } = require("../../utils/dates.cjs");

const scope = { insurer: "icici-lombard", category: "workmen-compensation" };

function formatAmount(val) {
  if (!val) return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matches({ text = "" }) {
  return (
    /ICICI\s+Lombard/i.test(text) &&
    (/EMPLOYEE'?S\s+COMPENSATION|WORKM(?:E|A)N'?S\s+COMPENSATION/i.test(text) ||
      (/\b4010\//.test(text) && /Part\s+1\s+of\s+the\s+POLICY\s+SCHEDULE/i.test(text)))
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  patch.insuranceCompany = "ICICI Lombard General Insurance Company Limited";
  patch.companyName = "ICICI Lombard General Insurance Company Limited";
  patch.documentCategory = "Workmen Compensation";
  patch.policyCategory = "Workmen Compensation";
  patch.policyType = "Workmen Compensation Policy";
  patch.productName = "Employee's Compensation Insurance";
  patch.registrationNumber = "";
  patch.vehicleNumber = "";

  // Policy Number
  const polMatch =
    text.match(/Policy\s+No\.?\s*[:\s]*([0-9/A-Z-]+)/i) ||
    text.match(/Policy\s+Number\s*[:\s]*([0-9/A-Z-]+)/i);
  if (polMatch) {
    patch.policyNumber = polMatch[1].replace(/Bill.*/i, "").trim();
  }

  // Insured Name
  const nameMatch =
    text.match(/Name\s+of\s+the\s+Insured\s*[:\s]*\n?\s*([^\n]+)/i) ||
    text.match(/Insured\s+Name\s*[:\s]*\n?\s*([^\n]+)/i) ||
    text.match(/Date\s*:\s*[A-Za-z0-9,\s]+\n\s*([A-Za-z\s.]+?)(?=\s*PLOT|\s*LION|\s*PLOTNO|\n)/i);
  if (nameMatch) {
    patch.insuredName = nameMatch[1].replace(/^:\s*/, "").replace(/\s+/g, " ").trim();
    patch.customerName = patch.insuredName;
  }

  // Address
  const addrMatch =
    text.match(/Address\s+of\s+the\s+Insured\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Telephone|\s*Email|\s*Period|\s*Pincode|\n\n)/i) ||
    text.match(/Address\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Telephone|\s*Email|\s*Period|\n\n)/i);
  if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  // Period / Dates
  const periodMatch =
    text.match(/Period\s+of\s+Insurance\s*[:\s]*From\s*([0-9A-Za-z-]+)[^\n]*To\s+(?:Midnight\s+of\s+)?([0-9A-Za-z-]+)/i) ||
    text.match(/From\s*:\s*([0-9A-Za-z-]+)\s*(?:00:00\s+Hours\s*)?To\s*(?:Midnight\s+of\s*)?([0-9A-Za-z-]+)/i);
  if (periodMatch) {
    patch.startDate = parseRobustDate(periodMatch[1]) || normalizeWarehouseDate(periodMatch[1]);
    patch.expiryDate = parseRobustDate(periodMatch[2]) || normalizeWarehouseDate(periodMatch[2]);
    patch.policyStartDate = patch.startDate;
    patch.policyExpiryDate = patch.expiryDate;
  }

  // Financials
  const netMatch =
    text.match(/1\.Premium\s+Calculations:[\s\S]*?Premium\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i) ||
    text.match(/Total\s+value\s+of\s+services\s*\(Premium\s+Value\s+without\s+Tax\)[\s\S]*?`\s*([0-9,.]+)/i) ||
    text.match(/Premium\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i);
  if (netMatch) {
    patch.netPremium = formatAmount(netMatch[1]);
  }

  const cgstMatch = text.match(/CGST\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i) || text.match(/1CGST\d+\s*([0-9,.]+)/i);
  if (cgstMatch) patch.cgst = formatAmount(cgstMatch[1]);

  const sgstMatch = text.match(/SGST\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i) || text.match(/2SGST\d+\s*([0-9,.]+)/i);
  if (sgstMatch) patch.sgst = formatAmount(sgstMatch[1]);

  const igstMatch = text.match(/IGST\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i) || text.match(/3IGST\d+\s*([0-9,.]+)/i);
  if (igstMatch) patch.igst = formatAmount(igstMatch[1]);

  const totalGstMatch =
    text.match(/Total\s+GST\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Tax\s+Amount[^\n]*\n?\s*([0-9,.]+)/i);
  if (totalGstMatch) {
    patch.gstAmount = formatAmount(totalGstMatch[1]);
    patch.taxAmount = patch.gstAmount;
  }

  const totalMatch =
    text.match(/Total\s+Premium\*?\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Premium\s+inclusive\s+Tax[^\n]*\n?\s*([0-9,.]+)/i);
  if (totalMatch) {
    patch.totalPremium = formatAmount(totalMatch[1]);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = patch.totalPremium;
  }

  // Sum Insured
  const sumInsuredMatch = text.match(/Total\s+Sum\s+Insured\s*[:\s₹`]*([0-9,.]+)/i);
  if (sumInsuredMatch) {
    patch.sumInsured = formatAmount(sumInsuredMatch[1]);
    patch.totalSumInsured = patch.sumInsured;
  }

  // Payment Details
  patch.modeOfPayment = "Online";
  patch.paymentMode = "Online";
  patch.paymentMethod = "ONLINE";

  patch.extractionTrainingVersion = "ICICI_LOMBARD_WC_V1";

  return patch;
}

module.exports = { scope, matches, train };
