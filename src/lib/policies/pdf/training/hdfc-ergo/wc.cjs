const scope = { insurer: "hdfc-ergo", category: "workmen-compensation" };

function formatAmount(val) {
  if (!val) return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matches({ text = "" }) {
  return (
    /HDFC\s*ERGO/i.test(text) &&
    (/Employees?\s+Compensation\s+Insurance|Workm(?:e|a)n'?s\s+Compensation/i.test(text) ||
      /\b3114\d{15}\b/.test(text))
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  patch.insuranceCompany = "HDFC ERGO General Insurance Company Limited";
  patch.companyName = "HDFC ERGO General Insurance Company Limited";
  patch.documentCategory = "Workmen Compensation";
  patch.policyCategory = "Workmen Compensation";
  patch.policyType = "Employees Compensation Insurance Policy";
  patch.productName = "Employees Compensation Insurance";

  // Policy Number
  const polMatch =
    text.match(/Policy\s+No\.?\s*[:\s]*([0-9]+)/i) ||
    text.match(/\b(3114\d{15})\b/);
  if (polMatch) {
    patch.policyNumber = polMatch[1].trim();
  }

  // Insured Name
  const nameMatch =
    text.match(/HDFC\s+ERGO\s+General\s+Insurance\s+Company\s+Limited\s*\n\s*([^\n]+)/i) ||
    text.match(/Insured\s*[:\s]*([^\n]+)/i);
  if (nameMatch) {
    patch.insuredName = nameMatch[1].replace(/^:\s*/, "").replace(/\s+/g, " ").trim();
    patch.customerName = patch.insuredName;
  }

  // Address
  const addrMatch =
    text.match(/Correspondence\s+Address\s*\n\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Mobile|\s*Phone|\s*E\s*Mail|\n\n)/i) ||
    text.match(/HDFC\s+ERGO\s+General\s+Insurance[^\n]*\n\s*[^\n]+\s*\n\s*[A-Za-z0-9,\s]+\n\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Sub:|\n\n)/i);
  if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
  }

  // Period / Dates
  const periodMatch =
    text.match(/Period\s+of\s+Insurance[\s\S]{0,100}?(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4})\s+[0-9:]+\s*(?:AM|PM)?[^\n]*?(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4})/i) ||
    text.match(/From\s*[:\s]*(\d{1,2}[-/][A-Za-z0-9]+[-/]\d{2,4})[^\n]*To\s*[:\s]*(\d{1,2}[-/][A-Za-z0-9]+[-/]\d{2,4})/i) ||
    text.match(/Period\s+of\s+Insurance\s*[:\s]*From\s*([0-9A-Za-z/-]+)[^\n]*To\s+([0-9A-Za-z/-]+)/i);
  if (periodMatch) {
    patch.startDate = (periodMatch[1] || "").replace(/\s+/g, "");
    patch.expiryDate = (periodMatch[2] || "").replace(/\s+/g, "");
    patch.policyStartDate = patch.startDate;
    patch.policyExpiryDate = patch.expiryDate;
  }

  patch.registrationNumber = "";
  patch.vehicleNumber = "";

  // Financials
  const basicMatch = text.match(/Basic\s+Premium[\s\S]{0,100}?\n\s*([0-9,.]+)/i);
  if (basicMatch) {
    patch.netPremium = formatAmount(basicMatch[1]);
  }

  const totMatch =
    text.match(/Total\s+Premium[\s\S]{0,100}?\n\s*(?:[0-9,.]+\s*\n\s*){1,2}([0-9,.]+)/i) ||
    text.match(/Total\s+Amount[^\n]*\n?\s*([0-9,.]+)/i);
  if (totMatch) {
    patch.totalPremium = formatAmount(totMatch[1]);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = patch.totalPremium;
  }

  if (patch.totalPremium && patch.netPremium) {
    const n = parseFloat(String(patch.netPremium).replace(/,/g, ""));
    const t = parseFloat(String(patch.totalPremium).replace(/,/g, ""));
    if (t >= n) {
      patch.gstAmount = formatAmount((t - n).toFixed(2));
      patch.taxAmount = patch.gstAmount;
    }
  }

  patch.extractionTrainingVersion = "HDFC_ERGO_WC_V1";

  return patch;
}

module.exports = { scope, matches, train };
