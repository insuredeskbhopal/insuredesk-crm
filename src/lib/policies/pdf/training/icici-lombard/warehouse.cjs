/**
 * ICICI Lombard Warehouse (MSME Suraksha Kavach) — Scoped Training
 *
 * Scope  : (icici-lombard, warehouse)
 * Covers : Main Policy Schedules, Endorsement Schedules, and Quotations
 *          under ICICI Lombard MSME Suraksha Kavach / Warehouse policies.
 *
 * Isolation: Uses only neutral utils (amounts, dates, regex, text). Never
 *            imports parsers, schemas, motor helpers, or other scopes.
 */

const { normalizeWarehouseDate, parseRobustDate } = require("../../utils/dates.cjs");
const { cleanWarehouseBlock } = require("../../utils/text.cjs");

const scope = { insurer: "icici-lombard", category: "warehouse" };

const INSURER_PINCODES = new Set(["400064", "400025", "600034"]);

function matches({ text = "" }) {
  if (!/ICICI\s+Lombard/i.test(text)) return false;
  if (/Private\s+Car|Two\s+Wheeler|Commercial\s+Vehicle|Goods\s+Carrying|Total\s+IDV/i.test(text)) return false;
  return (
    /MSME\s+Suraksha\s+Kavach/i.test(text) ||
    (/\b1030\/|\b1015\//.test(text) && /\b(?:WAREHOUSE|GODOWN|MPWLC|WAREHOUSING|BHANDARAN)\b/i.test(text))
  );
}

function formatAmount(val) {
  if (val === null || val === undefined || val === "") return "";
  const num = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pickClientPincode(text = "") {
  const matches = String(text || "").match(/\b([1-9][0-9]{5})\b/g) || [];
  return matches.find((pin) => !INSURER_PINCODES.has(pin)) || "";
}

function inferGoodsStored(biz = "", text = "") {
  const combined = `${biz} ${String(text || "").slice(0, 6000)}`;
  const items = [];
  if (/\bwheat\b/i.test(combined)) items.push("Wheat");
  if (/\brice\b/i.test(combined)) items.push("Rice");
  if (/\bpulses?\b/i.test(combined)) items.push("Pulses");
  if (/\bfood\s+grains?\b/i.test(combined)) items.push("Food grains");
  if (/\bagro\s+goods\b/i.test(combined)) items.push("Agro goods");
  if (items.length) return Array.from(new Set(items)).join(", ");
  if (/non[-\s]?hazardous\s+goods/i.test(combined)) return "Non-hazardous goods";
  return "";
}

function train({ text = "", result = {} }) {
  const patch = {};
  const isEndorsement = /Endorsement\s+(?:Schedule|Details|Wording)/i.test(text);
  const isQuotation = !isEndorsement && /QUOTATION\s*No:/i.test(text);

  patch.policyType = result.policyType || "Warehouse / MSME / Fire & Burglary package";
  const prodMatch = text.match(/MSME\s+Suraksha\s+Kavach\s+Package\s+Policy\s*-\s*Advance/i);
  patch.productName = prodMatch ? prodMatch[0].trim() : (result.productName || "ICICI Lombard MSME Suraksha Kavach Package Policy");

  // Policy Number
  if (result.policyNumber) {
    patch.policyNumber = String(result.policyNumber).replace(/Bill.*/i, "").trim();
  } else {
    const polMatch =
      text.match(/Policy\s+Number\s*[:\s]*([0-9/A-Z-]+)/i) ||
      text.match(/Policy\s*No\.?\s*[:\s]*([0-9/A-Z-]+)/i);
    if (polMatch) {
      patch.policyNumber = polMatch[1].replace(/Bill.*/i, "").trim();
    }
  }

  // Insured Name — guard against multi-paragraph Dispatch Letter bleed on short addresses
  const custMatch = text.match(/Name\s+of\s+the\s+Customer\s*[:\s]*\n?\s*([^\n]+)/i);
  const followingLineMatch = text.match(/by\s+the\s+following\s+insured:\s*\n+\s*([^\n]{3,90})/i);
  const dateNameMatch = text.match(/Date\s*:\s*[^\n]+\n+\s*([A-Za-z0-9][^\n]{2,85}?)(?=\s*PLOT|\s*185,|\s*SHOP|\s*WARD|\s*NEAR|\s*VILLAGE|\s*HOUSE|\s*KHASRA|\s*MAILING|\s*Policy\s+No|\n)/i);
  const generalNameMatch = text.match(/Name\s+of\s+the\s+Insured\s*[:\s]*\n?\s*([^\n]{3,90})/i);

  const existingName = String(result.insuredName || "").replace(/\s+/g, " ").trim();
  const isDirtyExisting =
    !existingName ||
    existingName.length > 90 ||
    /Pleasegothrough|Thank you|Dispatch|Authorized/i.test(existingName);

  if (!isDirtyExisting) {
    patch.insuredName = existingName;
  } else if (custMatch) {
    patch.insuredName = custMatch[1].replace(/^:\s*/, "").replace(/\s+/g, " ").trim();
  } else if (followingLineMatch) {
    patch.insuredName = followingLineMatch[1].replace(/^:\s*/, "").replace(/\s+/g, " ").trim();
  } else if (dateNameMatch) {
    patch.insuredName = dateNameMatch[1].replace(/^:\s*/, "").replace(/Policy\s+No.*/i, "").replace(/\s+/g, " ").trim();
  } else if (generalNameMatch) {
    patch.insuredName = generalNameMatch[1].replace(/^:\s*/, "").replace(/\s+/g, " ").trim();
  }
  if (patch.insuredName) patch.customerName = patch.insuredName;

  // Contact Person / Proprietor
  const propMatch =
    text.match(/PROP(?:RIETOR)?\.?\s+([A-Za-z\s]+?)(?:,|\s+JASALPUR|\s+TEH|\s+DIST|\s+MADHYA|\n)/i) ||
    text.match(/Contact\s+Person\s*[:\s]*([^\n]+)/i);
  if (propMatch) {
    patch.contactPerson = propMatch[1].replace(/\s+/g, " ").trim();
  } else if (result.contactPerson) {
    patch.contactPerson = result.contactPerson;
  }

  // Mailing / Risk Address
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
    patch.mailingAddress = cleanWarehouseBlock(scheduleAddrMatch[1]);
    patch.communicationAddress = patch.mailingAddress;
  } else if (addrMatch) {
    patch.communicationAddress = cleanWarehouseBlock(addrMatch[1]);
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
  patch.pincode =
    result.pincode ||
    pickClientPincode(patch.riskLocation) ||
    pickClientPincode(patch.mailingAddress) ||
    pickClientPincode(text);

  if (result.district) {
    patch.district = String(result.district).replace(/\s+(?:DATE|MADHYA\s+PRADESH|MP|PIN)\b.*$/i, "").trim();
  } else {
    const distMatch = (patch.riskLocation || patch.mailingAddress || text).match(/(?:DIST(?:RICT)?\.?|TEH\s+AND\s+DIST)\s+([A-Za-z]+)/i);
    if (distMatch) patch.district = distMatch[1].trim().toUpperCase();
  }

  if (result.tehsil !== undefined && result.tehsil !== null && result.tehsil !== "") {
    patch.tehsil = result.tehsil;
  } else if (result.tehsil !== "") {
    const tehMatch = (patch.riskLocation || patch.mailingAddress || "").match(/TEH(?:SIL)?\.?\s+(?:AND\s+DIST\s+)?([A-Za-z]+)/i);
    if (tehMatch) patch.tehsil = tehMatch[1].trim().toUpperCase();
  }

  // Business Description / Occupancy / Goods Stored
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
  const goodsStored = result.goodsStored || inferGoodsStored(patch.businessDescription || patch.occupancy, text);
  if (goodsStored) patch.goodsStored = goodsStored;

  // Invoice Details
  const invNumMatch = text.match(/Invoice\s+Number\s*[:\s]*([0-9]+)/i);
  if (invNumMatch) patch.invoiceNumber = result.invoiceNumber || invNumMatch[1].trim();
  const invDateMatch = text.match(/Invoice\s+Date\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  if (invDateMatch) patch.invoiceDate = result.invoiceDate || invDateMatch[1].trim();

  // Intermediary / Broker Details
  const intermediaryRowMatch = text.match(/(\d{10,20})\s*([A-Za-z]+)\s*(\d{10})\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i);
  if (intermediaryRowMatch) {
    patch.brokerCode = result.brokerCode || intermediaryRowMatch[1].trim();
    patch.brokerName = result.brokerName || intermediaryRowMatch[2].trim();
    patch.brokerMobile = result.brokerMobile || intermediaryRowMatch[3].trim();
    patch.brokerEmail = result.brokerEmail || intermediaryRowMatch[4].trim();
  }

  // Period / Dates
  const periodMatch =
    text.match(/Period\s+of\s+Insurance\s*From\s*:\s*(?:[0-9:]+\s*(?:Hours\s*)?of\s*)?(\d{1,2}[-/][A-Za-z0-9]{2,3}[-/]\d{4})\s*To\s*:\s*(?:[0-9:]+\s*(?:Hours\s*)?of\s*|Midnight\s+of\s*)?(\d{1,2}[-/][A-Za-z0-9]{2,3}[-/]\d{4})/i) ||
    text.match(/Period\s+of\s+Insurance\s*From\s*[:\s]*(?:[0-9:]+\s*Hours\s*of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})\s*To\s*[:\s]*(?:[0-9:]+\s*Hours\s*of\s*)?(?:Midnight\s+of\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    text.match(/Period\s+of\s+Insurance\s*From\s*[:\s]*(?:00:00\s+Hours\s+of\s*)?([0-9A-Za-z/-]+)\s*To\s*[:\s]*(?:Midnight\s+of\s*)?([0-9A-Za-z/-]+)/i) ||
    text.match(/From\s*[:\s]*([0-9A-Za-z/-]+)\s*(?:00:00\s+Hours\s*)?To\s*(?:Midnight\s+of\s*)?([0-9A-Za-z/-]+)/i) ||
    text.match(/(\d{2}[-/]\d{2}[-/]\d{4})\s+to\s+(\d{2}[-/]\d{2}[-/]\d{4})/i);
  if (periodMatch) {
    patch.startDate = normalizeWarehouseDate(parseRobustDate(periodMatch[1]));
    patch.expiryDate = normalizeWarehouseDate(parseRobustDate(periodMatch[2]));
    patch.policyStartDate = patch.startDate;
    patch.policyExpiryDate = patch.expiryDate;
    patch.policyEndDate = patch.expiryDate;
  }

  // Financials & Endorsement Transaction Values
  const extraNetMatch =
    text.match(/extra\s+premium\s+amounting\s+to\s*(?:Rs\.?|₹|`|INR)?\s*([0-9,]+(?:\.[0-9]{2})?)/i) ||
    text.match(/premium\s+of\s*(?:Rs\.?|₹|`|INR)?\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:\/-\s*)?stands\s+charged/i) ||
    text.match(/premium\s+amounting\s+to\s*(?:Rs\.?|₹|`|INR)?\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:\/-\s*)?as\s+shown/i);

  const returnNetMatch =
    text.match(/return\s+premium\s+amounting\s+to\s*(?:Rs\.?|₹|`|INR)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);

  if (extraNetMatch) {
    const extraNum = parseFloat(extraNetMatch[1].replace(/,/g, ""));
    patch.additionalPremium = formatAmount(extraNum);
    patch.additionalNetPremium = formatAmount(extraNum);
    patch.endorsementNetPremium = formatAmount(extraNum);
    patch.netPremium = formatAmount(extraNum);
    const endoGst = Math.round(extraNum * 0.18 * 100) / 100;
    const endoGross = Math.round(extraNum * 1.18 * 100) / 100;
    patch.additionalGst = formatAmount(endoGst);
    patch.additionalPayable = formatAmount(endoGross);
  } else if (returnNetMatch) {
    const retNum = parseFloat(returnNetMatch[1].replace(/,/g, ""));
    patch.returnPremium = formatAmount(retNum);
    patch.returnNetPremium = formatAmount(retNum);
    patch.netPremium = `-${formatAmount(retNum)}`;
  }

  if (!patch.netPremium) {
    const netMatch =
      text.match(/Total\s+value\s+of\s+services\s*\(Premium\s+Value\s+without\s+Tax\)[^\n]*\n?\s*(?:`|₹)?\s*([0-9,.]+)/i) ||
      text.match(/Net\s+Premium\s*[:\s`₹]?\s*([0-9,.]+)/i) ||
      text.match(/Base\s+Premium\s*[:\s`₹]?\s*([0-9,.]+)/i);
    if (result.netPremium) {
      patch.netPremium = formatAmount(result.netPremium);
    } else if (netMatch) {
      patch.netPremium = formatAmount(netMatch[1]);
    }
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
    text.match(/Total\s+Premium\*?\s*(?:`\s*:|₹\s*:|3\s*:|:)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i) ||
    text.match(/Total\s+Premium\*?\s*[:\s`₹]*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
  if (totMatch) {
    const formattedTot = formatAmount(totMatch[1]);
    patch.totalPremium = formattedTot;
    patch.grossPremium = formattedTot;
    patch.premium = formattedTot;
    patch.cumulativeTotalPremium = formattedTot;
    patch.premiumIncludingGst = isEndorsement
      ? formattedTot
      : result.premiumIncludingGst || formattedTot;
  }

  if (isEndorsement && patch.totalPremium && !extraNetMatch && !returnNetMatch) {
    const grossVal = parseFloat(String(patch.totalPremium).replace(/,/g, ""));
    const netVal = parseFloat(String(patch.netPremium || "").replace(/,/g, ""));
    const gstVal = parseFloat(String(patch.gstAmount || "0").replace(/,/g, ""));
    if (grossVal > 0 && (!netVal || Math.abs(grossVal - (netVal + gstVal)) > 5)) {
      if (/inclusive\s+of\s+taxes/i.test(text)) {
        const trueNet = Math.round((grossVal / 1.18) * 100) / 100;
        const trueTax = Math.round((grossVal - trueNet) * 100) / 100;
        const halfTax = Math.round((trueTax / 2) * 100) / 100;
        patch.netPremium = formatAmount(trueNet);
        patch.gstAmount = formatAmount(trueTax);
        patch.taxAmount = formatAmount(trueTax);
        patch.cgst = formatAmount(halfTax);
        patch.sgst = formatAmount(halfTax);
        patch.igst = "0.00";
      }
    }
  }

  // Section-wise Sum Insured (preserving clean parser fields + filling MSME sections)
  const bldgMatch = text.match(/MSME\s+Suraksha\s+Kavach\s*-\s*Buildings[^\d]*([0-9,.]+)/i);
  if (bldgMatch) patch.buildingSumInsured = result.buildingSumInsured || formatAmount(bldgMatch[1]);

  const cntMatch = text.match(/MSME\s+Suraksha\s+Kavach\s*-\s*Contents[^\d]*([0-9,.]+)/i);
  if (cntMatch) patch.contentsSumInsured = result.contentsSumInsured || formatAmount(cntMatch[1]);

  const burgMatch = text.match(/Burglary(?:\s+Basic\s+Cover)?[^\d]*([0-9,.]+)/i);
  if (burgMatch) patch.burglarySumInsured = result.burglarySumInsured || formatAmount(burgMatch[1]);

  const fidMatch = text.match(/Fidelity(?:\s+Basic\s+Cover)?[^\d]*([0-9,.]+)/i);
  if (fidMatch) patch.fidelitySumInsured = result.fidelitySumInsured || formatAmount(fidMatch[1]);

  const sumInsuredMatch =
    text.match(/Building\s+including\s+fitting\s+and\s+fixture\s*([0-9,.]+)/i) ||
    text.match(/Fire\s+Basic\s+Covers\s*\(`\)\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Sum\s+Insured\s*[:\s₹`]*([0-9,.]+)/i) ||
    text.match(/Sum\s+Insured\s*\(`\)\s*([0-9,.]+)/i);
  if (result.sumInsured) {
    patch.sumInsured = result.sumInsured;
    patch.totalSumInsured = result.sumInsured;
  } else if (sumInsuredMatch) {
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

  const revisedMatch = text.match(/Sum\s+insured\s+under\s+the\s+policy\s+now\s+stands\s+revised\s+as\s+Rs\.?\s*([0-9][0-9,]*)/i);
  if (isEndorsement && revisedMatch) {
    patch.revisedSumInsured = formatAmount(revisedMatch[1]);
    patch.sumInsured = patch.revisedSumInsured;
    patch.totalSumInsured = patch.revisedSumInsured;
  }

  // Hypothecation & Warehouse Profile
  const financer = result.financerName || (/A\/C\s+MPWLC|MPWLC/i.test(result.hypothecationDetails || text) ? "MPWLC" : "");
  if (financer && financer !== "None") {
    patch.financerName = financer;
    patch.warehouseFinanced = true;
    if (/MPWLC/i.test(financer)) patch.mpwlcReference = "MPWLC";
  }

  patch.warehouseProfileName = cleanWarehouseBlock(
    String(patch.insuredName || "").replace(/\bA\/C\s+MPWLC\b|\bC\/O\s+MPWLC\b|\bM\/S\.?\s*/gi, ""),
  );
  patch.policySubType = isEndorsement
    ? "WAREHOUSE_MSME_ENDORSEMENT"
    : isQuotation
      ? "WAREHOUSE_MSME_QUOTATION"
      : "WAREHOUSE_MSME_POLICY";
  patch.warehousePolicySubType = patch.policySubType;
  patch.gstin = "";

  patch.extractionTrainingVersion = isEndorsement
    ? "ICICI_LOMBARD_WAREHOUSE_ENDORSEMENT_V1"
    : isQuotation
      ? "ICICI_LOMBARD_WAREHOUSE_QUOTATION_V1"
      : "ICICI_LOMBARD_WAREHOUSE_V1";

  return patch;
}

module.exports = { scope, matches, train };
