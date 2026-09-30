const monthMap = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  jan: "01", feb: "02", mar: "03", apr: "04", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
};

function formatAmount(val) {
  if (!val) return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMarineDate(raw) {
  if (!raw) return "";
  const clean = String(raw).replace(/\b(?:from|to|midnight|hours|of)\b/gi, "").trim();
  const match = clean.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (match) {
    const month = monthMap[match[1].toLowerCase()] || "01";
    const day = match[2].padStart(2, "0");
    const year = match[3];
    return `${day}/${month}/${year}`;
  }
  const numMatch = clean.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (numMatch) {
    return `${numMatch[1].padStart(2, "0")}/${numMatch[2].padStart(2, "0")}/${numMatch[3]}`;
  }
  return clean;
}

const scope = { insurer: "icici-lombard", category: "marine" };

function matches({ text = "" }) {
  return (
    /ICICI\s+Lombard/i.test(text) &&
    (/Marine\s*01|Marine\s+Cargo|MARINE\s+OPEN|Marine\s+Insurance|2001\//i.test(text))
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  patch.insuranceCompany = "ICICI Lombard General Insurance Company Limited";
  patch.companyName = "ICICI Lombard General Insurance Company Limited";
  patch.documentCategory = "Marine Insurance";
  patch.policyCategory = "Marine Insurance";
  patch.policyType = "Marine Cargo Open Insurance Policy";
  patch.productName = "Marine Cargo Insurance";

  const polMatch =
    text.match(/Policy\s+Number\s*[:\s]*\n?\s*([0-9/]{10,30})/i) ||
    text.match(/Policy\s+No\.?[:\s]*([0-9/]{10,30})/i) ||
    text.match(/\b(2001\/[0-9/]{10,30})\b/);
  if (polMatch) {
    patch.policyNumber = (polMatch[1] || polMatch[0]).trim();
  }

  const nameMatch =
    text.match(/Name\s+of\s+the\s+Customer\s*[:\s]*([^\n]+)/i) ||
    text.match(/VAK\s+CONSEQUIP\s+SOLUTIONS/i) ||
    text.match(/1\.Name\s+of\s+the\s+Insured\s*([^\n]+)/i);
  if (nameMatch) {
    patch.insuredName = (nameMatch[1] || nameMatch[0]).replace(/Address.*/i, "").trim();
    patch.customerName = patch.insuredName;
  }

  // Address
  const addrMatch =
    text.match(/Address\s+of\s+the\s+Customer\s*[:\s]*([A-Za-z0-9\s.,&/()-]+?)(?=\s*GSTIN|\s*Unique|\s*Invoice|\n\n)/i) ||
    text.match(/Address\s+of\s+the\s+Insured\s*[:\s]*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Are\s+you|\s*Telephone|\s*Email|\n\n)/i);
  if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  const periodMatch =
    text.match(/Period\s+of\s+Insurance\s*:\s*From\s*:\s*(?:[0-9:]+\s*Hours\s*of\s*)?([A-Za-z0-9,\s]+?)\s*To\s*:\s*(?:Midnight\s*of\s*)?([A-Za-z0-9,\s]+?)(?=\n|Subject)/i) ||
    text.match(/From\s*:\s*([0-9A-Za-z,\s]+?)\s*To\s*:\s*([0-9A-Za-z,\s]+)/i);
  if (periodMatch) {
    patch.startDate = formatMarineDate(periodMatch[1]);
    patch.expiryDate = formatMarineDate(periodMatch[2]);
    patch.policyStartDate = patch.startDate;
    patch.policyExpiryDate = patch.expiryDate;
  }

  const netMatch =
    text.match(/Total\s+value\s+of\s+services[^\n]*\n\s*([0-9,.]+)/i) ||
    text.match(/ITC\s*\(A\)\s*Cover\s*:\s*Rs\.\s*([0-9,.]+)/i);
  if (netMatch) {
    patch.netPremium = formatAmount(netMatch[1]);
  }

  const totMatch =
    text.match(/Total\s+Premium\s+inclusive\s+Tax[^\n]*\n\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Premium\s*:\s*\(Rs\.\)\s*([0-9,.]+)/i);
  if (totMatch) {
    patch.totalPremium = formatAmount(totMatch[1]);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = patch.totalPremium;
  }

  const siMatch =
    text.match(/Total\s+Sum\s+Insured\s*[:\s]*(?:Rs\.?|INR)?\s*([0-9,.]+)/i) ||
    text.match(/Cargo\s+Sum\s+Insured\s*[:\s]*(?:Rs\.?|INR)?\s*([0-9,.]+)/i) ||
    text.match(/Estimated\s+Annual\s+Sum\s+Insured\s*[:\s]*(?:Rs\.?|INR)?\s*([0-9,.]+)/i) ||
    text.match(/Sum\s+Insured\s*[:\s]*(?:Rs\.?|INR)?\s*([0-9,.]+)/i);
  if (siMatch) {
    patch.sumInsured = formatAmount(siMatch[1]);
    patch.totalSumInsured = patch.sumInsured;
  }

  patch.extractionTrainingVersion = "ICICI_LOMBARD_MARINE_V1";

  return patch;
}

module.exports = { scope, matches, train };
