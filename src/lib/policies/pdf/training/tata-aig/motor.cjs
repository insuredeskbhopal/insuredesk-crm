const scope = { insurer: "tata-aig", category: "motor" };
const { sumAmounts } = require("../../utils/amounts.cjs");

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

  return patch;
}

module.exports = { scope, matches, train };
