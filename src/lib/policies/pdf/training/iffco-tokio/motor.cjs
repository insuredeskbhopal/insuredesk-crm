const { normalizeAmount } = require("../../utils/amounts.cjs");

const scope = { insurer: "iffco-tokio", category: "motor" };

function matches({ text = "", result = {} }) {
  const company = String(result.insuranceCompany || result.companyName || "");
  const format = String(result.documentFormat || "");
  const isIffcoCompany = /IFFCO[- ]?TOKIO/i.test(company) || /IFFCO[- ]?TOKIO/i.test(text);
  const isMotor = /Motor|Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle/i.test(
    result.documentCategory || result.policyType || format || text
  );
  return isIffcoCompany && isMotor;
}

function extractPremiumBifurcation(text = "") {
  const idx = text.indexOf("Premium Bifurcation");
  if (idx === -1) return null;

  const block = text.slice(idx, idx + 450);

  // Case A: 6 dense numbers -> Sec1, Sec2, Sec3, TaxableValue, GST, TotalInvoice
  const match6 = block.match(
    /(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*([0-9,]{1,9}\.\d{2})\s*([0-9,]{1,9}\.\d{2})/
  );
  if (match6) {
    const sec1 = normalizeAmount(match6[1]);
    const sec2 = normalizeAmount(match6[2]);
    const sec3 = normalizeAmount(match6[3]);
    const taxableNet = normalizeAmount(match6[4]);
    const gst = normalizeAmount(match6[5]);
    const totalInvoice = normalizeAmount(match6[6]);

    return {
      sec1,
      sec2,
      sec3,
      netPremium: taxableNet,
      gstAmount: gst,
      totalPremium: totalInvoice,
      hasAddons: Boolean(parseFloat(sec2 || 0) > 0 || parseFloat(sec3 || 0) > 0),
    };
  }

  // Case B: 5 dense numbers -> Sec1, Sec2, TaxableValue, GST, TotalInvoice
  const match5 = block.match(
    /(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*(\d{1,7}\.\d{2})\s*([0-9,]{1,9}\.\d{2})\s*([0-9,]{1,9}\.\d{2})/
  );
  if (match5) {
    const sec1 = normalizeAmount(match5[1]);
    const sec2 = normalizeAmount(match5[2]);
    const taxableNet = normalizeAmount(match5[3]);
    const gst = normalizeAmount(match5[4]);
    const totalInvoice = normalizeAmount(match5[5]);

    return {
      sec1,
      sec2,
      sec3: "0.00",
      netPremium: taxableNet,
      gstAmount: gst,
      totalPremium: totalInvoice,
      hasAddons: Boolean(parseFloat(sec2 || 0) > 0),
    };
  }

  return null;
}

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const bifurcation = extractPremiumBifurcation(text);
  if (!bifurcation) return result;

  const patch = {};

  if (bifurcation.netPremium) {
    patch.netPremium = bifurcation.netPremium;
    patch.basicPremium = bifurcation.netPremium;
  }

  if (bifurcation.gstAmount) {
    patch.gstAmount = bifurcation.gstAmount;
    patch.taxAmount = bifurcation.gstAmount;
  }

  if (bifurcation.totalPremium) {
    patch.totalPremium = bifurcation.totalPremium;
    patch.grossPremium = bifurcation.totalPremium;
    patch.premiumIncludingGst = bifurcation.totalPremium;
    patch.premium = bifurcation.totalPremium;
  }

  patch.extractionTrainingVersion = "IFFCO_TOKIO_MOTOR_ADDON_V1";

  return patch;
}

module.exports = {
  scope,
  matches,
  train,
};
