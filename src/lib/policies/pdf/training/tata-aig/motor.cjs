const scope = { insurer: "tata-aig", category: "motor" };
const { sumAmounts } = require("../../utils/amounts.cjs");
const { matchGroup } = require("../../utils/regex.cjs");

function matches({ text = "", result = {} }) {
  const category = String(result.documentCategory || result.policyType || "");
  return (
    /TATA\s*AIG|tataaig\.com|customersupport@tataaig\.com/i.test(text) &&
    /Auto\s*Secure|Private\s+Car\s+Package\s+Policy/i.test(text) &&
    /Motor|Private\s+Car|Auto\s*Secure/i.test(category || text)
  );
}

function train({ text = "", result = {} }) {
  if (!result || typeof result !== "object") return result;

  const patch = {};
  const taxes = [...text.matchAll(/\b(CGST|SGST|IGST)\s*\d+(?:\.\d+)?\s*%\s*(?:₹|`|Rs\.?)?\s*([0-9,]+(?:\.\d{1,2})?)/gi)];
  for (const [, label, value] of taxes) patch[label.toLowerCase()] = sumAmounts(value);
  if ((patch.cgst && patch.sgst) || patch.igst) {
    patch.gstAmount = sumAmounts(patch.cgst, patch.sgst, patch.igst);
    patch.taxAmount = patch.gstAmount;
  }
  if (/\bTATA\s+MOTORS\s*\/\s*NEXO\s*\n?\s*N\s+EV\s*\/\s*XZ\s+PLUS\b/i.test(text)) {
    patch.vehicleMake = "TATA MOTORS";
    patch.vehicleModel = "NEXON EV";
    patch.makeModel = "TATA MOTORS NEXON EV";
    patch.variant = "XZ PLUS";
    patch.extractionTrainingVersion = "TATA_AIG_MOTOR_NEXON_EV_V1";
  }

  const startDate =
    matchGroup(text, /(\d{2}\/\d{2}\/\d{4})\s*\([^)]*00:00/i) ||
    matchGroup(text, /(?:Valid\s*From)[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i) ||
    matchGroup(text, /Period\s+of\s+Insurance[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
  const endDate =
    matchGroup(text, /(\d{2}\/\d{2}\/\d{4})\s*\([^)]*Midnight\)/i) ||
    matchGroup(text, /(?:Valid\s*Till)[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);

  if (startDate) {
    patch.policyStartDate = startDate;
    patch.startDate = startDate;
  }
  if (endDate) {
    patch.policyEndDate = endDate;
    patch.expiryDate = endDate;
  }

  return patch;
}

module.exports = { scope, matches, train };
