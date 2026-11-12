/**
 * Bajaj Allianz Warehouse (Flexi Commercial Property Guard / Burglary / Fidelity) — Scoped Training
 *
 * Scope  : (bajaj-allianz, warehouse)
 * Covers : Warehouse schedules and endorsements under Bajaj Allianz / Bajaj General:
 *          1. Flexi Commercial Property Guard
 *          2. Burglary Insurance Policy (without Fire Policy No. bleed)
 *          3. Fidelity Guarantee Insurance Policy
 *
 * Isolation: Uses only neutral utils (amounts, dates, regex, text). Never
 *            imports parsers, schemas, motor helpers, or other scopes.
 */

const { normalizeAmount, sumPlainAmounts } = require("../../utils/amounts.cjs");
const { normalizeWarehouseDate } = require("../../utils/dates.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanWarehouseBlock } = require("../../utils/text.cjs");

const scope = { insurer: "bajaj-allianz", category: "warehouse" };

const INSURER_PINCODES = new Set(["411006"]);

function matches({ text = "" }) {
  if (!/BAJAJ\s*(?:ALLIANZ|GENERAL)/i.test(text)) return false;
  if (
    /Private\s+Car|Two\s+Wheeler|Two-Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Passenger\s+Carrying|Motor\s+Package|Motor\s+Policy|Drive\s*Smart|Drive\s*Assure/i.test(
      text,
    )
  ) {
    return false;
  }
  if (/\b(?:Engine\s+No|Chassis\s+No|Vehicle\s+Make|Vehicle\s+Model)\b|(?<!IRDAI\s+)Registration\s+No/i.test(text)) {
    return false;
  }
  const hasWarehouseProduct =
    /FLEXI\s+COMMERCIAL\s+PROPERTY\s+GUARD|BURGLARY\s+INSURANCE\s+POLICY|FIDELITY\s*GUARANTEE\s*INSURANCE\s*POLICY/i.test(
      text,
    );
  const hasWarehouseSignal =
    /(?:WAREHOUSE|MPWLC|GODOWN|WAREHOUSING|Storage\s+of\s+Non[-\s]?hazardous)/i.test(text);
  return hasWarehouseProduct && hasWarehouseSignal;
}

function pickClientPincode(text = "") {
  const found = String(text || "").match(/\b([1-9][0-9]{5})\b/g) || [];
  return found.find((pin) => !INSURER_PINCODES.has(pin)) || "";
}

function inferGoodsStored(text = "", occupancy = "") {
  const combined = `${occupancy} ${String(text || "").slice(0, 8000)}`;
  const items = [];
  if (/\bwheat\b/i.test(combined)) items.push("Wheat");
  if (/\brice\b/i.test(combined)) items.push("Rice");
  if (/\bpulses?\b/i.test(combined)) items.push("Pulses");
  if (/food\s+grains?|grains?\b/i.test(combined)) items.push("Food grains");
  if (items.length) return Array.from(new Set(items)).join(", ");
  if (/non[-\s]?hazardous/i.test(combined)) return "Non-hazardous goods";
  return "";
}

function detectBajajSubtype(text = "", productName = "") {
  const ref = productName || text;
  if (/FIDELITY\s+GUARANTEE/i.test(ref)) return "WAREHOUSE_FIDELITY_POLICY";
  if (/BURGLARY/i.test(ref)) return "WAREHOUSE_BURGLARY_POLICY";
  if (/FLEXI\s+COMMERCIAL\s+PROPERTY\s+GUARD/i.test(ref)) return "WAREHOUSE_FIRE_POLICY";
  return "WAREHOUSE_POLICY";
}

function train({ text = "", result = {} }) {
  const patch = {};

  const productName =
    result.productName ||
    cleanWarehouseBlock(matchGroup(text, /(FLEXI\s+COMMERCIAL\s+PROPERTY\s+GUARD)/i)) ||
    cleanWarehouseBlock(matchGroup(text, /(BURGLARY\s+INSURANCE\s+POLICY)/i)) ||
    cleanWarehouseBlock(matchGroup(text, /(FIDELITY\s+GUARANTEE\s+INSURANCE\s+POLICY)/i)) ||
    "FLEXI COMMERCIAL PROPERTY GUARD";

  const policySubType = result.policySubType || detectBajajSubtype(text, productName);
  patch.productName = productName;
  patch.policyType = result.policyType || productName;
  patch.policySubType = policySubType;
  patch.warehousePolicySubType = result.warehousePolicySubType || policySubType;

  // Policy number — never allow referenced Fire Policy No. (4056) to bleed into Burglary (4010) or Fidelity (3310)
  const expectedTypeCode =
    policySubType === "WAREHOUSE_BURGLARY_POLICY"
      ? "4010"
      : policySubType === "WAREHOUSE_FIDELITY_POLICY"
        ? "3310"
        : "4056";
  const typedPolicyMatch = text.match(new RegExp(`\\b(OG-\\d{2}-\\d{4}-${expectedTypeCode}-\\d{8})\\b`, "i"));
  const policyNumber =
    (result.policyNumber && result.policyNumber.includes(`-${expectedTypeCode}-`) ? result.policyNumber : "") ||
    (typedPolicyMatch ? typedPolicyMatch[1].toUpperCase() : "") ||
    result.policyNumber ||
    matchGroup(text, /Policy\s+(?:Number|No\.?)\s*:?\s*(OG-\d{2}-\d{4}-\d{4}-\d{8})/i);
  if (policyNumber) patch.policyNumber = policyNumber;

  if (policySubType === "WAREHOUSE_BURGLARY_POLICY") {
    const fireRef =
      result.firePolicyReference || matchGroup(text, /Fire\s+Policy\s+No\.?\s*(OG-\d{2}-\d{4}-4056-\d{8})/i);
    if (fireRef) patch.firePolicyReference = fireRef;
  }

  // Insured & Warehouse Name
  const insuredName =
    result.insuredName ||
    cleanWarehouseBlock(
      matchGroup(text, /Insured(?:'s|’s)?\s+Name\s*([^\n]+?)(?=Email|Mobile|Insured\s+Address|$)/i) ||
        matchGroup(text, /Dear\s+([^,\n]+),/i),
    );
  if (insuredName) {
    patch.insuredName = insuredName;
    patch.customerName = insuredName;
    patch.warehouseProfileName =
      result.warehouseProfileName ||
      cleanWarehouseBlock(insuredName.replace(/\bM\/S\.?\s*|\bA\/C\s+MPWLC\b|\bAC\s+MPWLC\b/gi, ""));
  }

  // Addresses & Location Parts
  const mailingAddress =
    result.mailingAddress ||
    cleanWarehouseBlock(
      matchGroup(text, /Mailing\s+Address\s*([\s\S]+?)(?=1\.Contact\s+person|Business\s+and\s+Location|Policy\s+Details|$)/i),
    );
  const riskLocation = result.riskLocation || mailingAddress || "";
  if (mailingAddress) {
    patch.mailingAddress = mailingAddress;
    patch.communicationAddress = result.communicationAddress || mailingAddress;
  }
  if (riskLocation) {
    patch.riskLocation = riskLocation;
    patch.premisesAddress = result.premisesAddress || riskLocation;
  }

  const pincode =
    result.pincode ||
    result.addressEntity?.pincode ||
    pickClientPincode(riskLocation) ||
    pickClientPincode(mailingAddress) ||
    pickClientPincode(text);
  if (pincode) patch.pincode = pincode;

  if (result.district) patch.district = result.district;
  if (result.tehsil) patch.tehsil = result.tehsil;
  if (result.village) patch.village = result.village;
  if (result.state) patch.state = result.state;

  // Dates
  const startDate =
    normalizeWarehouseDate(
      result.startDate ||
        matchGroup(text, /From\s*([0-9]{1,2}[-/][A-Za-z]{3}[-/][0-9]{4})/i) ||
        matchGroup(text, /From\s*:?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/i),
    ) || "";
  const expiryDate =
    normalizeWarehouseDate(
      result.expiryDate ||
        matchGroup(text, /To\s*([0-9]{1,2}[-/][A-Za-z]{3}[-/][0-9]{4})/i) ||
        matchGroup(text, /To\s*:?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/i),
    ) || "";
  if (startDate) {
    patch.startDate = startDate;
    patch.policyStartDate = startDate;
  }
  if (expiryDate) {
    patch.expiryDate = expiryDate;
    patch.policyEndDate = expiryDate;
    patch.policyExpiryDate = expiryDate;
  }

  // Premiums & Sums (preserve precise parser results, fill missing)
  const netPremium =
    result.netPremium ||
    normalizeAmount(matchGroup(text, /Total\s+Premium\s+\(Before\s+GST\)\s*[:\s]*(?:Rs\.?)?\s*([0-9,.]+)/i)) ||
    normalizeAmount(matchGroup(text, /Net\s+Premium\s*[:\s]*(?:Rs\.?)?\s*([0-9,.]+)/i));
  const totalPremium =
    result.premiumIncludingGst ||
    result.totalPremium ||
    normalizeAmount(matchGroup(text, /Total\s+Premium\s*(?:\(INR\))?\s*[:\s]*([0-9,.]+)/i)) ||
    normalizeAmount(matchGroup(text, /Final\s+Premium\s*([0-9,.]+)/i));

  if (netPremium) patch.netPremium = netPremium;
  if (totalPremium) {
    patch.totalPremium = totalPremium;
    patch.premiumIncludingGst = totalPremium;
    patch.premium = totalPremium;
  }
  if (result.cgst) patch.cgst = result.cgst;
  if (result.sgst) patch.sgst = result.sgst;
  if (result.igst) patch.igst = result.igst;
  if (result.gstAmount) patch.gstAmount = result.gstAmount;
  else if (result.cgst && result.sgst) patch.gstAmount = sumPlainAmounts(result.cgst, result.sgst, result.igst || 0);

  if (result.sumInsured) patch.sumInsured = result.sumInsured;
  if (result.buildingSumInsured) patch.buildingSumInsured = result.buildingSumInsured;
  if (result.stockSumInsured !== undefined) patch.stockSumInsured = result.stockSumInsured;
  if (result.contentsSumInsured) patch.contentsSumInsured = result.contentsSumInsured;
  if (result.burglarySumInsured) patch.burglarySumInsured = result.burglarySumInsured;
  if (result.fidelitySumInsured) patch.fidelitySumInsured = result.fidelitySumInsured;

  // Occupancy & Goods Stored
  const occupancy = result.occupancy || cleanWarehouseBlock(matchGroup(text, /(Storage\s+of\s+Non[\s\S]{0,200}?stored\s+therein\.?)/i)) || "Warehouse";
  patch.occupancy = occupancy;
  patch.businessDescription = result.businessDescription || occupancy;
  const goodsStored = result.goodsStored || inferGoodsStored(text, occupancy);
  if (goodsStored) patch.goodsStored = goodsStored;

  // Hypothecation & MPWLC
  if (policySubType !== "WAREHOUSE_FIDELITY_POLICY") {
    const financer =
      result.hypothecationDetails ||
      (Array.isArray(result.financialInstitutions) && result.financialInstitutions.join(", ")) ||
      (/MPWLC/i.test(text) ? "MPWLC" : "");
    if (financer) {
      patch.hypothecationDetails = financer;
      patch.financerName = result.financerName || financer;
      patch.warehouseFinanced = true;
      if (/MPWLC/i.test(text)) patch.mpwlcReference = "MPWLC";
    }
  }

  patch.extractionTrainingVersion = "BAJAJ_ALLIANZ_WAREHOUSE_TRAINING_V1";
  return patch;
}

module.exports = { scope, matches, train };
