const { normalizeWarehouseDate, parseRobustDate } = require("../../utils/dates.cjs");

const scope = { insurer: "icici-lombard", category: "fire" };

function formatAmount(val) {
  if (!val) return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matches({ text = "" }) {
  return (
    /ICICI\s+Lombard/i.test(text) &&
    (/Bharat\s+Sookshma\s+Udyam|Bharat\s+Griha\s+Raksha|MSME\s+Suraksha\s+Kavach|Standard\s+Fire|Fire\s+and\s+Special\s+Perils/i.test(text) ||
      /\b1030\/|\b1015\//.test(text))
  );
}

function train({ text = "", result = {} }) {
  const patch = {};

  patch.insuranceCompany = "ICICI Lombard General Insurance Company Limited";
  patch.companyName = "ICICI Lombard General Insurance Company Limited";
  patch.documentCategory = "Fire Insurance";
  patch.policyCategory = "Fire Insurance";
  patch.policyType = result.policyType || "Fire Insurance Policy";
  const prodMatch = text.match(/MSME Suraksha Kavach Package Policy\s*-\s*Advance/i);
  patch.productName = prodMatch ? prodMatch[0].trim() : (result.productName || "ICICI Lombard MSME Suraksha Kavach Package Policy");

  // Policy Number
  const polMatch =
    text.match(/Policy\s+Number\s*[:\s]*([0-9/A-Z-]+)/i) ||
    text.match(/Policy\s*No\.?\s*[:\s]*([0-9/A-Z-]+)/i);
  if (polMatch) {
    patch.policyNumber = polMatch[1].replace(/Bill.*/i, "").trim();
  }

  // Insured Name
  const custMatch = text.match(/Name\s+of\s+the\s+Customer\s*[:\s]*\n?\s*([^\n]+)/i);
  const dateNameMatch = text.match(/Date\s*:\s*[^\n]+\n\s*([A-Za-z0-9\s.,&/-]+?)(?=\s*PLOT|\s*185,|\s*SHOP|\s*WARD|\s*NEAR|\s*VILLAGE|\s*HOUSE|\s*KHASRA|\s*MAILING|\s*Policy\s+No|\n\n)/i);
  const generalNameMatch = text.match(/Name\s+of\s+the\s+Insured\s*[:\s]*\n?\s*([^\n]+)/i);

  if (custMatch) {
    patch.insuredName = custMatch[1].replace(/^:\s*/, "").replace(/\s+/g, " ").trim();
  } else if (dateNameMatch) {
    patch.insuredName = dateNameMatch[1].replace(/^:\s*/, "").replace(/Policy\s+No.*/i, "").replace(/\s+/g, " ").trim();
  } else if (generalNameMatch) {
    patch.insuredName = generalNameMatch[1].replace(/^:\s*/, "").replace(/\s+/g, " ").trim();
  }
  patch.customerName = patch.insuredName;

  // Contact Person / Proprietor
  const propMatch =
    text.match(/PROP(?:RIETOR)?\.?\s+([A-Za-z\s]+?)(?:,|\s+JASALPUR|\s+TEH|\s+DIST|\s+MADHYA|\n)/i) ||
    text.match(/Contact\s+Person\s*[:\s]*([^\n]+)/i);
  if (propMatch) {
    patch.contactPerson = propMatch[1].replace(/\s+/g, " ").trim();
  }

  // Address
  const scheduleAddrMatch = text.match(/Mailing\s+Address\s+of\s+the\s*Insured\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Period\s+of|\s*Business|\s*Premises|\n\s*1030)/i);
  const addrMatch =
    text.match(/Address\s+of\s+the\s+Customer\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*GSTIN|\s*Unique|\s*Invoice|\n\n)/i) ||
    text.match(/Address\s+of\s+the\s+Insured\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Telephone|\s*Email|\s*Period|\s*Pincode|\n\n)/i) ||
    text.match(/Date\s*:\s*[^\n]+\n\s*[^\n]+\n\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Policy\s+No|\s*Mailing|\n\n)/i);
  const premiseMatch = text.match(/Premises\s+to\s+be\s+Insured\s*[:\s]*\n?\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Premium|\s*Hypothecation|\s*Section)/i);

  if (result.mailingAddress) {
    patch.mailingAddress = result.mailingAddress;
    patch.communicationAddress = result.communicationAddress || result.mailingAddress;
  } else if (scheduleAddrMatch) {
    patch.mailingAddress = scheduleAddrMatch[1].replace(/\s+/g, " ").trim();
    patch.communicationAddress = patch.mailingAddress;
  } else if (addrMatch) {
    patch.communicationAddress = addrMatch[1].replace(/\s+/g, " ").trim();
    patch.mailingAddress = patch.communicationAddress;
  }

  if (result.riskLocation) {
    patch.riskLocation = result.riskLocation;
    patch.premisesAddress = result.premisesAddress || result.riskLocation;
  } else if (premiseMatch) {
    patch.riskLocation = premiseMatch[1].replace(/--+/g, ", ").replace(/\s+/g, " ").trim();
    patch.premisesAddress = patch.riskLocation;
  } else if (patch.mailingAddress) {
    patch.riskLocation = patch.mailingAddress;
    patch.premisesAddress = patch.mailingAddress;
  }

  // District, Tehsil, Pincode
  const pinMatch = (patch.mailingAddress || text).match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) patch.pincode = pinMatch[1];

  if (result.district) {
    patch.district = result.district;
  } else {
    const distMatch = (patch.mailingAddress || text).match(/(?:DIST(?:RICT)?\.?|TEH\s+AND\s+DIST)\s+([A-Za-z]+)/i);
    if (distMatch) patch.district = distMatch[1].trim();
  }

  if (result.tehsil) {
    patch.tehsil = result.tehsil;
  } else {
    const tehMatch = (patch.mailingAddress || text).match(/TEH(?:SIL)?\.?\s+(?:AND\s+DIST\s+)?([A-Za-z]+)/i);
    if (tehMatch) patch.tehsil = tehMatch[1].trim();
  }

  // Business Description
  if (result.businessDescription) {
    patch.businessDescription = result.businessDescription;
    patch.occupancy = result.occupancy || patch.businessDescription;
  } else {
    const bizMatch = text.match(/Business\s+of\s+the\s+Insured\s*[:\s]*\n?\s*([\s\S]+?)(?=\s*Issued\s+at|\s*Premises)/i);
    if (bizMatch) {
      const rawBiz = bizMatch[1].replace(/\s+/g, " ").trim();
      patch.businessDescription = (/Storage of Non-hazardous goods/i.test(rawBiz) && /Storage in godown or warehouse/i.test(rawBiz))
        ? "Storage of Non-hazardous goods / godown or warehouse"
        : rawBiz;
      patch.occupancy = patch.businessDescription;
    }
  }

  // Invoice Details
  const invNumMatch = text.match(/Invoice\s+Number\s*[:\s]*([0-9]+)/i);
  if (invNumMatch) patch.invoiceNumber = invNumMatch[1].trim();

  const invDateMatch = text.match(/Invoice\s+Date\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  if (invDateMatch) patch.invoiceDate = invDateMatch[1].trim();

  // Intermediary / Broker Details
  const intermediaryRowMatch = text.match(/(\d{10,20})\s*([A-Za-z]+)\s*(\d{10})\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i);
  if (intermediaryRowMatch) {
    patch.brokerCode = intermediaryRowMatch[1].trim();
    patch.brokerName = intermediaryRowMatch[2].trim();
    patch.brokerMobile = intermediaryRowMatch[3].trim();
    patch.brokerEmail = intermediaryRowMatch[4].trim();
  }

  // Period / Dates
  const periodMatch =
    text.match(/Period\s+of\s+Insurance\s*From\s*[:\s]*(?:[0-9:]+\s*Hours\s*of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})\s*To\s*[:\s]*(?:[0-9:]+\s*Hours\s*of\s*)?(?:Midnight\s*of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    text.match(/Period\s+of\s+Insurance\s*From\s*[:\s]*(?:00:00\s+Hours\s+of\s*)?([0-9A-Za-z/-]+)\s*To\s*[:\s]*(?:Midnight\s+of\s*)?([0-9A-Za-z/-]+)/i) ||
    text.match(/From\s*[:\s]*([0-9A-Za-z/-]+)\s*(?:00:00\s+Hours\s*)?To\s*(?:Midnight\s+of\s*)?([0-9A-Za-z/-]+)/i) ||
    text.match(/(\d{2}[-/]\d{2}[-/]\d{4})\s+to\s+(\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (periodMatch) {
    patch.startDate = parseRobustDate(periodMatch[1]) || normalizeWarehouseDate(periodMatch[1]);
    patch.expiryDate = parseRobustDate(periodMatch[2]) || normalizeWarehouseDate(periodMatch[2]);
    patch.policyStartDate = patch.startDate;
    patch.policyExpiryDate = patch.expiryDate;
  }

  // Financials
  const netMatch =
    text.match(/Total\s+value\s+of\s+services\s*\(Premium\s+Value\s+without\s+Tax\)[^\n]*\n?\s*(?:`|₹)?\s*([0-9,.]+)/i) ||
    text.match(/Net\s+Premium\s*[:\s`₹]?\s*([0-9,.]+)/i) ||
    text.match(/Base\s+Premium\s*[:\s`₹]?\s*([0-9,.]+)/i);
  if (result.netPremium) {
    patch.netPremium = formatAmount(result.netPremium);
  } else if (netMatch) {
    patch.netPremium = formatAmount(netMatch[1]);
  }

  const cgstMatch =
    text.match(/1\s*CGST\s*9(?:\.0+)?\s*([0-9,.]+)/i) ||
    text.match(/CGST\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i);
  if (result.cgst) {
    patch.cgst = result.cgst;
  } else if (cgstMatch) {
    patch.cgst = formatAmount(cgstMatch[1]);
  }

  const sgstMatch =
    text.match(/2\s*SGST\s*9(?:\.0+)?\s*([0-9,.]+)/i) ||
    text.match(/SGST\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i);
  if (result.sgst) {
    patch.sgst = result.sgst;
  } else if (sgstMatch) {
    patch.sgst = formatAmount(sgstMatch[1]);
  }

  const igst18Match = text.match(/3\s*IGST\s*18(?:\.0+)?\s*([0-9,.]+)/i);
  if (igst18Match) {
    patch.igst = formatAmount(igst18Match[1]);
  } else if (/3\s*IGST\s*00?/i.test(text)) {
    patch.igst = "0.00";
  } else {
    const igstMatch = text.match(/IGST\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i);
    if (igstMatch) patch.igst = formatAmount(igstMatch[1]);
  }

  const totalGstMatch =
    text.match(/Total\s+Tax\s+Amount[^\n]*\n?\s*(?:`|₹)?\s*([0-9,.]+)/i) ||
    text.match(/Total\s+GST\s*(?:₹|`|Rs\.?)?\s*([0-9,.]+)/i);
  if (result.gstAmount) {
    patch.gstAmount = result.gstAmount;
    patch.taxAmount = patch.gstAmount;
  } else if (totalGstMatch) {
    patch.gstAmount = formatAmount(totalGstMatch[1]);
    patch.taxAmount = patch.gstAmount;
  }

  // Cross-verify CGST/SGST with Total Tax Amount (9% + 9%)
  if (!result.cgst && patch.gstAmount) {
    const totalGstNum = parseFloat(String(patch.gstAmount).replace(/,/g, ""));
    const cgstNum = parseFloat(String(patch.cgst || "").replace(/,/g, ""));
    if (totalGstNum > 0 && (!cgstNum || cgstNum >= totalGstNum)) {
      const half = totalGstNum / 2;
      patch.cgst = formatAmount(half);
      patch.sgst = formatAmount(half);
    }
  }

  const totMatch =
    text.match(/Total\s+Premium\s+inclusive\s+Tax[^\n]*\n?\s*(?:`|₹)?\s*([0-9,.]+)/i) ||
    text.match(/Premium[^\n]*?Including\s*GST[^\n0-9]*([0-9,.]+)/i) ||
    text.match(/Premium\s*\(`\)\s*\(Including\s+GST\)\s*\(`\)\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Premium\*?\s*[:\s`₹]?\s*([0-9,.]+)/i);
  if (totMatch) {
    patch.totalPremium = formatAmount(totMatch[1]);
    patch.grossPremium = patch.totalPremium;
    patch.premium = patch.totalPremium;
    patch.premiumIncludingGst = result.premiumIncludingGst || patch.totalPremium;
  }

  // Section-wise Sum Insured
  const bldgMatch = text.match(/MSME\s+Suraksha\s+Kavach\s*-\s*Buildings[^\d]*([0-9,.]+)/i);
  if (bldgMatch) patch.buildingSumInsured = formatAmount(bldgMatch[1]);

  const cntMatch = text.match(/MSME\s+Suraksha\s+Kavach\s*-\s*Contents[^\d]*([0-9,.]+)/i);
  if (cntMatch) patch.contentsSumInsured = formatAmount(cntMatch[1]);

  const burgMatch = text.match(/Burglary(?:\s+Basic\s+Cover)?[^\d]*([0-9,.]+)/i);
  if (burgMatch) patch.burglarySumInsured = formatAmount(burgMatch[1]);

  const fidMatch = text.match(/Fidelity(?:\s+Basic\s+Cover)?[^\d]*([0-9,.]+)/i);
  if (fidMatch) patch.fidelitySumInsured = formatAmount(fidMatch[1]);

  // Total Sum Insured
  const sumInsuredMatch =
    text.match(/Fire\s+Basic\s+Covers\s*\(`\)\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Sum\s+Insured\s*[:\s₹`]*([0-9,.]+)/i) ||
    text.match(/Sum\s+Insured\s*\(`\)\s*([0-9,.]+)/i);
  if (sumInsuredMatch) {
    patch.sumInsured = formatAmount(sumInsuredMatch[1]);
    patch.totalSumInsured = patch.sumInsured;
  }

  if (patch.buildingSumInsured && patch.contentsSumInsured) {
    const bVal = parseFloat(String(patch.buildingSumInsured).replace(/,/g, "")) || 0;
    const cVal = parseFloat(String(patch.contentsSumInsured).replace(/,/g, "")) || 0;
    if (!patch.sumInsured || patch.sumInsured === patch.buildingSumInsured) {
      patch.sumInsured = formatAmount(bVal + cVal);
      patch.totalSumInsured = patch.sumInsured;
    }
  }

  // Payment Details
  patch.modeOfPayment = "Online";
  patch.paymentMode = "Online";
  patch.paymentMethod = "ONLINE";

  patch.extractionTrainingVersion = "ICICI_LOMBARD_FIRE_V1";

  return patch;
}

module.exports = { scope, matches, train };
