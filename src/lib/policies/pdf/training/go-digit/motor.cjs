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

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const patch = {};

  const policyNo = matchGroup(text, /Policy\s*No\.?\s*:\s*([A-Z0-9]{8,25})/i);
  if (policyNo) {
    patch.policyNumber = policyNo;
  }

  const rawInsured = matchGroup(text, /Name\s*(?:MS|MR|MRS|DR)?\s*([A-Za-z\s]{3,40}?)(?=Vehicle\s+Registration|Registration\s+Mark|Policy|Period|Address|\n)/i) ||
                     matchGroup(text, /Name\s+of\s+Insured\s*(?:Person)?\s*(?:MS|MR|MRS|DR)?\s*([A-Za-z\s]{3,40}?)(?=\n|Mobile|E-mail|Present|Address)/i) ||
                     matchGroup(text, /Insured\s+Name\s*:?\s*(?:MS|MR|MRS|DR)?\s*([A-Za-z\s]{3,40}?)(?=\n|Mobile|Address)/i);
  const cleanedInsured = cleanHdfcValue(rawInsured).replace(/^(?:MS|MR|MRS|DR|M\/S)\s+/i, "");
  if (cleanedInsured && cleanedInsured.length > 2) {
    patch.insuredName = cleanedInsured;
    patch.customerName = cleanedInsured;
  }

  // Endorsement / Premium Invoice table: InvoiceNumber InvoiceDate NetPremium Igst Cgst Sgst Utgst Cess GrossPremium
  // e.g. IA2728356492026-07-13754.550.0067.9167.910.000.00890.37
  const invoiceMatch = text.match(/([A-Z0-9]{8,20})\s*(\d{4}-\d{2}-\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})\s*([0-9,]+\.\d{2})/);
  if (invoiceMatch) {
    const net = normalizeAmount(invoiceMatch[3]);
    const cgst = parseFloat(normalizeAmount(invoiceMatch[5]) || 0);
    const sgst = parseFloat(normalizeAmount(invoiceMatch[6]) || 0);
    const totalGst = (cgst + sgst).toFixed(2);
    const gross = normalizeAmount(invoiceMatch[9]);

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
      const gross = normalizeAmount(grossMatch[1]);
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
