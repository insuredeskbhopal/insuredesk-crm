/**
 * IFFCO Tokio Warehouse (Flexi Property Protector / Burglary / Fidelity) — Scoped Training
 *
 * Scope  : (iffco-tokio, warehouse)
 * Covers : Warehouse schedules, endorsements, and quotations for:
 *          1. Flexi Property Protector Policy
 *          2. Burglary and House Breaking Insurance Policy
 *          3. Fidelity Guarantee Policy
 *
 * Isolation: Uses only neutral utils (amounts, dates, regex, text). Never
 *            imports parsers, schemas, motor helpers, or other scopes.
 */

const { normalizeAmount, sumPlainAmounts } = require("../../utils/amounts.cjs");
const { normalizeWarehouseDate, parseRobustDate } = require("../../utils/dates.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanWarehouseBlock } = require("../../utils/text.cjs");

const scope = { insurer: "iffco-tokio", category: "warehouse" };

const INSURER_PINCODES = new Set(["110017", "462011"]);

const KNOWN_DISTRICTS =
  "NARSIMHAPUR|NARSINGHPUR|HOSHANGABAD|NARMADAPURAM|RAISEN|SEHORE|VIDISHA|SAGAR|DATIA|DEWAS|SHAJAPUR|SHAHDOL|TIKAMGARH|HARDA|DHAR|CHHATARPUR|REWA|SATNA|DAMOH|GUNA|BHOPAL|INDORE|JABALPUR|UJJAIN|GWALIOR|SEONI|MANDLA|BETUL|CHHINDWARA|BALAGHAT|KATNI|PANNA|KHARGONE|KHANDWA|BURHANPUR|BARWANI|RATLAM|MANDSAUR|NEEMUCH|RAJGARH|SHIVPURI|ASHOKNAGAR|MORENA|BHIND|SHEOPUR";

function matches({ text = "" }) {
  if (!/IFFCO\s*[- ]?\s*TOKIO/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Goods\s+Carrying\s+Commercial|Passenger\s+Carrying/i.test(text)) return false;
  const hasProduct =
    /FLEXI\s+PROPERTY\s+PROTECTOR|BURGLARY\s+AND\s+HOUSE\s+BREAKING|BURGLARY\s+FIRST\s+LOSS|Fidelity\s+Guarantee/i.test(text);
  const hasWarehouseSignal =
    /\b(?:WAREHOUSE|GODOWN|MPWLC|WAREHOUSING|BHANDARAN|Godowns\s*&\s*Silos)\b/i.test(text);
  return hasProduct && hasWarehouseSignal;
}

function pickClientPincode(text = "") {
  const found = String(text || "").match(/\b([1-9][0-9]{5})\b/g) || [];
  return found.find((pin) => !INSURER_PINCODES.has(pin)) || "";
}

function detectSubType(text = "", result = {}) {
  if (/Fidelity\s+Guarantee/i.test(text) || /FIDELITY/i.test(result.subType || result.policySubType || "")) {
    return {
      subType: "Fidelity",
      policySubType: "WAREHOUSE_FIDELITY_POLICY",
      policyType: result.policyType || "Fidelity Guarantee",
    };
  }
  if (/BURGLARY\s+AND\s+HOUSE\s+BREAKING|BURGLARY\s+FIRST\s+LOSS/i.test(text) || /BURGLARY/i.test(result.subType || result.policySubType || "")) {
    return {
      subType: "Burglary",
      policySubType: "WAREHOUSE_BURGLARY_POLICY",
      policyType: result.policyType || "BURGLARY AND HOUSE BREAKING INSURANCE",
    };
  }
  return {
    subType: "Fire",
    policySubType: "WAREHOUSE_FIRE_POLICY",
    policyType: result.policyType || "FLEXI PROPERTY PROTECTOR",
  };
}

function extractLocationDistrict(address = "") {
  const cleaned = String(address || "");
  const explicit =
    matchGroup(cleaned, /DIST(?:RICT)?[.\-\s]+([A-Z][A-Z\s]{2,25}?)(?:,|\s+\d{6}|$)/i) ||
    matchGroup(cleaned, new RegExp(`\\b(${KNOWN_DISTRICTS})\\b`, "i"));
  return explicit ? explicit.replace(/\s+/g, " ").trim().toUpperCase() : "";
}

function inferGoodsStored(desc = "", text = "") {
  const combined = `${desc} ${String(text || "").slice(0, 6000)}`;
  const goods = [];
  if (/\brice\b/i.test(combined)) goods.push("Rice");
  if (/\bwheat\b/i.test(combined)) goods.push("Wheat");
  if (/\bpulses?\b/i.test(combined)) goods.push("Pulses");
  if (/food\s+grains?/i.test(combined)) goods.push("Food grains");
  if (goods.length) return Array.from(new Set(goods)).join(", ");
  if (/goods?\s+held\s+in\s+trust|non[-\s]?hazardous/i.test(combined)) return "Goods held in trust";
  return "";
}

function train({ text = "", result = {} }) {
  const patch = {};
  const subInfo = detectSubType(text, result);

  patch.subType = result.subType || subInfo.subType;
  patch.policySubType = result.policySubType || subInfo.policySubType;
  patch.warehousePolicySubType = result.warehousePolicySubType || subInfo.policySubType;
  patch.policyType = result.policyType || subInfo.policyType;
  patch.productName = result.productName || subInfo.policyType;

  // Policy Number / Quote Reference
  const polMatch =
    matchGroup(text, /Policy\s+(?:Number|No\.?)\s*[.:\s]*([0-9A-Za-z]{6,25})/i) ||
    matchGroup(text, /refer\s+to\s+Policy\s+No\.?\s*([0-9A-Za-z]{6,25})/i);
  patch.policyNumber = result.policyNumber || polMatch || "";

  const quoteRef = matchGroup(text, /Quote\s+Reference\s+Number\s*:\s*\n?\s*([A-Z0-9-]+)/i);
  if (quoteRef) {
    patch.quotationNumber = result.quotationNumber || quoteRef;
    patch.isQuotation = true;
    if (!patch.policyNumber) patch.policyNumber = quoteRef;
  }

  // Insured & Warehouse Profile Name
  const insuredName =
    result.insuredName ||
    cleanWarehouseBlock(
      matchGroup(text, /Name\s+of\s+the\s+Insured\s*:\s*([^\n]+)/i) ||
      matchGroup(text, /Insured'?s\s+Name\s*:\s*([^\n]+)/i) ||
      matchGroup(text, /Insured\s*([A-Za-z0-9\s.,&/()-]+?)(?=\s*Client\s+Number|\s*Corresponding|\n)/i),
    );
  if (insuredName) {
    patch.insuredName = insuredName;
    patch.customerName = insuredName;
    patch.warehouseProfileName =
      result.warehouseProfileName ||
      cleanWarehouseBlock(
        insuredName
          .replace(/\b(?:M\/S\.?|A\/C\s+MPWLC|AC\s+MPWLC|C\/O\s+MPWLC|IN\s+FAVOUR\s+OF[\s\S]*$)\b/gi, ""),
      );
  }

  // Addresses
  const mailingAddress =
    result.mailingAddress ||
    cleanWarehouseBlock(matchGroup(text, /Corresponding\s+Address\s*\n\s*([\s\S]+?)(?=\*{3,}|CKYC|Policy\s+Number|$)/i));
  const riskLocation =
    result.riskLocation ||
    cleanWarehouseBlock(matchGroup(text, /Location\s+address\s*\n?\s*([\s\S]+?)(?=Location\s+Description|Occupancy|$)/i)) ||
    mailingAddress ||
    "";
  if (mailingAddress) {
    patch.mailingAddress = mailingAddress;
    patch.communicationAddress = result.communicationAddress || mailingAddress;
  }
  if (riskLocation) {
    patch.riskLocation = riskLocation;
    patch.premisesAddress = result.premisesAddress || riskLocation;
  }

  // District / Tehsil / Pincode / State — validate pincode is a real 6-digit postal code
  const candidatePin = [result.pincode, result.addressEntity?.pincode].find((v) =>
    /^[1-9][0-9]{5}$/.test(String(v || "").trim()),
  );
  const pincode =
    (candidatePin && String(candidatePin).trim()) ||
    pickClientPincode(riskLocation) ||
    pickClientPincode(mailingAddress) ||
    pickClientPincode(text);
  if (pincode) patch.pincode = pincode;

  const district = result.district || extractLocationDistrict(riskLocation || mailingAddress);
  if (district) patch.district = district;

  const tehsil = result.tehsil !== undefined ? result.tehsil : (result.addressEntity?.tehsil || "");
  if (tehsil) patch.tehsil = tehsil;

  const state =
    result.state ||
    result.addressEntity?.state ||
    (/MADHYA\s+PRADESH|\bMP\b/i.test(`${riskLocation} ${mailingAddress}`) ? "MADHYA PRADESH" : "");
  if (state) patch.state = state;

  patch.addressEntity = {
    correspondenceAddress: mailingAddress || "",
    riskLocation: riskLocation || "",
    village: result.village || result.addressEntity?.village || "",
    tehsil: tehsil || "",
    district: district || "",
    state: state || "",
    pincode: pincode || "",
  };

  // Dates (including Burglary Endorsement "Policy Inception Date" & "Policy Expiry Date")
  const startDate =
    result.startDate ||
    parseRobustDate(
      matchGroup(text, /Policy\s+Inception\s+Date\s*(\d{1,2}[/\s-]\d{1,2}[/\s-]\d{4})/i) ||
      matchGroup(text, /Period\s+of\s+Insurance\s*:\s*From\s*:\s*(\d{1,2}[/\s-]\d{1,2}[/\s-]\d{4})/i) ||
      matchGroup(text, /Policy\s+effective\s+from\s+\d+\s+hrs\s+(\d{1,2}\/\d{1,2}\/\d{4})/i),
    ) ||
    "";
  const expiryDate =
    result.expiryDate ||
    parseRobustDate(
      matchGroup(text, /Policy\s+Expiry\s+Date\s*(\d{1,2}[/\s-]\d{1,2}[/\s-]\d{4})/i) ||
      matchGroup(text, /To\s*:\s*(\d{1,2}[/\s-]\d{1,2}[/\s-]\d{4})/i) ||
      matchGroup(text, /To\s+MidNight\s*(\d{1,2}\/\d{1,2}\/\d{4})/i),
    ) ||
    "";
  if (startDate) {
    patch.startDate = normalizeWarehouseDate(startDate);
    patch.policyStartDate = patch.startDate;
  }
  if (expiryDate) {
    patch.expiryDate = normalizeWarehouseDate(expiryDate);
    patch.policyEndDate = patch.expiryDate;
    patch.policyExpiryDate = patch.expiryDate;
  }

  // Invoice (quote date fallback for proposals)
  if (!result.invoiceNumber && patch.policyNumber) patch.invoiceNumber = patch.policyNumber;
  if (!result.invoiceDate) {
    const quoteDate = matchGroup(text, /Quote\s+Issuance\s+Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (quoteDate) patch.invoiceDate = quoteDate;
  }

  // Sum Insured & Section Breakup (preserve exact parser decimals when present)
  const netPremium = result.netPremium || normalizeAmount(matchGroup(text, /Net\s+Premium\s*(?:\(Rs\.?\))?\s*[:/]?\s*([0-9,.]+)/i));
  const totalPremium =
    result.premiumIncludingGst ||
    result.totalPremium ||
    normalizeAmount(matchGroup(text, /Total\s+Premium\s+Payable\s*(?:\(Rs\.?\))?\s*([0-9,.]+)/i));

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

  const totalSumInsuredMatch =
    subInfo.subType === "Fire" &&
    !/Endorsement/i.test(text.slice(0, 1500)) &&
    normalizeAmount(matchGroup(text, /Total\s+Sum\s+Insured(?:\s*\([^)]*\))?\s*[:\s₹`]*([0-9][0-9,.]+)/i));

  if (totalSumInsuredMatch) {
    patch.sumInsured = totalSumInsuredMatch.replace(/,/g, "");
  } else if (result.sumInsured) {
    patch.sumInsured = result.sumInsured;
  }
  if (result.contentsSumInsured) patch.contentsSumInsured = result.contentsSumInsured;
  if (result.burglarySumInsured) patch.burglarySumInsured = result.burglarySumInsured;
  if (result.fidelitySumInsured) patch.fidelitySumInsured = result.fidelitySumInsured;

  // Occupancy & Goods Stored
  const locationDescription =
    result.locationDescription ||
    cleanWarehouseBlock(matchGroup(text, /Location\s+Description\s*([\s\S]+?)\s*Occupancy/i)) ||
    result.businessDescription ||
    "";
  const occupancy =
    result.occupancy ||
    cleanWarehouseBlock(matchGroup(text, /Occupancy\s*:\s*([\s\S]+?)(?=Occupancy\s+Code|Period\s+of\s+Insurance|$)/i)) ||
    (subInfo.subType === "Fidelity" ? "Warehouse" : "Storage of Non-Hazardous Goods");
  const goodsStored = result.goodsStored || inferGoodsStored(locationDescription, text);
  if (locationDescription) patch.locationDescription = locationDescription;
  if (occupancy) patch.occupancy = occupancy;
  if (goodsStored) patch.goodsStored = goodsStored;
  patch.businessDescription = result.businessDescription || locationDescription || occupancy;

  // Hypothecation
  const hypothecation =
    result.hypothecationDetails ||
    (/MPWLC/i.test(`${text} ${patch.insuredName || ""}`) ? "MPWLC" : "None");
  patch.hypothecationDetails = hypothecation;
  patch.financerName = result.financerName || hypothecation;
  patch.warehouseFinanced = result.warehouseFinanced ?? /MPWLC/i.test(hypothecation);
  if (patch.warehouseFinanced && /MPWLC/i.test(hypothecation)) {
    patch.mpwlcReference = result.mpwlcReference || "MPWLC";
  }

  // Keep/update warehouse profile
  if (result.warehouseProfile) {
    patch.warehouseProfile = {
      ...result.warehouseProfile,
      district: district || result.warehouseProfile.district || "",
      tehsil: tehsil || result.warehouseProfile.tehsil || "",
      policySubType: patch.policySubType,
    };
  }

  patch.extractionTrainingVersion = "IFFCO_TOKIO_WAREHOUSE_TRAINING_V1";
  return patch;
}

module.exports = { scope, matches, train };
