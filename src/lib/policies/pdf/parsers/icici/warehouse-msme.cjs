"use strict";

/**
 * ICICI Lombard Warehouse / MSME Suraksha Kavach Parser
 *
 * Supports:
 * 1. Main Policy
 * 2. Endorsement Schedule
 * 3. Quotation
 */

const POLICY_FORMAT = "ICICI_WAREHOUSE_MSME_POLICY_V1";
const ENDORSEMENT_FORMAT = "ICICI_WAREHOUSE_MSME_ENDORSEMENT_V1";
const QUOTATION_FORMAT = "ICICI_WAREHOUSE_MSME_QUOTATION_V1";

function clean(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[₹`]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(text) {
  return clean(text)
    .replace(/Policy­/g, "Policy-")
    .replace(/Suraksha Kavach Package Policy­ Advance/g, "Suraksha Kavach Package Policy - Advance")
    .replace(/Suraksha Kavach Package Policy- Advance/g, "Suraksha Kavach Package Policy - Advance");
}

function pick(text, regex) {
  const match = text.match(regex);
  return match ? clean(match[1]) : null;
}



function toAmount(value) {
  if (!value) return null;

  const raw = clean(value)
    .replace(/Rs\.?/gi, "")
    .replace(/INR/gi, "")
    .replace(/\/-/g, "")
    .replace(/\//g, "")
    .replace(/-/g, "")
    .replace(/,/g, "")
    .trim();

  const number = Number(raw.match(/\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(number) ? number : null;
}

function parseDateLike(value) {
  if (!value) return null;
  return clean(value).replace(/\s+/g, " ");
}

function splitAddressParts(address) {
  const value = clean(address).toUpperCase();

  const district =
    value.match(/DIST(?:RICT)?\.?\s+([A-Z ]+?)(?:,| MADHYA| MP| PIN|$)/)?.[1]?.trim() ||
    value.match(/,\s*([A-Z ]+?)\s+MADHYA PRADESH/)?.[1]?.trim() ||
    null;

  const tehsil =
    value.match(/TEH(?:SIL)?\.?\s+([A-Z ]+?)(?:,| DIST| MADHYA|$)/)?.[1]?.trim() ||
    value.match(/TESHIL\s+([A-Z ]+?)(?:,| DIST| MADHYA|$)/)?.[1]?.trim() ||
    null;

  const village =
    value.match(/VILLAGE\s+([A-Z0-9 ]+?)(?:,| TEH| DIST| MADHYA|$)/)?.[1]?.trim() ||
    value.match(/GRAM\s+([A-Z0-9 ]+?)(?:,| TEH| DIST| MADHYA|$)/)?.[1]?.trim() ||
    null;

  const pincode =
    value.match(/\b([1-9][0-9]{5})\b/)?.[1] || null;

  return { district, tehsil, village, pincode };
}

function detectIciciWarehouseMsme(rawText) {
  const text = normalizeText(rawText);
  const lower = text.toLowerCase();

  if (!lower.includes("icici lombard")) return null;
  if (!lower.includes("msme suraksha kavach")) return null;

  if (/Endorsement Schedule/i.test(text)) return ENDORSEMENT_FORMAT;
  if (/Quotation\s*No/i.test(text)) return QUOTATION_FORMAT;
  if (/Risk Assumption Letter/i.test(text) || /Dispatch Advice Letter/i.test(text)) return POLICY_FORMAT;

  return POLICY_FORMAT;
}

function commonBase(format, sourceDocumentType, fileName) {
  return {
    documentFormat: format,
    sourceDocumentType,
    insuranceCompany: "ICICI Lombard",
    productName: "MSME Suraksha Kavach Package Policy - Advance",
    policyType: "Warehouse / MSME / Fire & Burglary package",
    fileName: fileName || null,
  };
}

function parsePolicy(rawText, fileName = "") {
  const text = normalizeText(rawText);

  const policyNumber =
    pick(text, /Policy\s*(?:No\.?|Number)\s*[:-]?\s*([0-9]{4}\/[0-9]+\/[0-9]{2}\/[0-9]{3})/i) ||
    pick(text, /attached herewith\s*([0-9]{4}\/[0-9]+\/[0-9]{2}\/[0-9]{3})/i);

  const insuredName =
    pick(text, /Name\s+of\s+the\s+Insured\s+(.+?)\s+Mailing\s+Address/i) ||
    pick(text, /following insured:\s*(.+?)\s+(?:PROP\.|NEAR|VILLAGE|GRAM|SURVEY|KHASRA|[A-Z ]+, MADHYA)/i);

  const mailingAddress =
    pick(text, /Mailing\s+Address\s+of\s+the\s+insured\s+(.+?)\s+(?:Business\s+of\s+the\s+insured|Premises?|Policy\s+Period|Period\s+of\s+Insurance|Turnover)/i) ||
    pick(text, /following insured:\s*.+?\s+(PROP\..+?)\s+Please go through/i);

  const riskLocation =
    pick(text, /Premises?\s*(?:to\s+be)?\s*Insured\s*(.+?)\s+(?:Business|Policy Period|Period\s+of\s+Insurance|Section|Premium|Coverage|Turnover)/i) ||
    mailingAddress;

  const businessDescription =
    pick(text, /Business\s+of\s+the\s+insured\s+(.+?)\s+(?:Turnover|Premise|Premises|Policy Period)/i) ||
    pick(text, /Occupancy\s+of\s+Risk\s+(.+?)\s+Policy\s+Period/i);

  const issuedAt = pick(text, /Issued\s+At\s*[:-]?\s*(.+?)\s+(?:Product Code|URN|Item Description)/i);

  const policyStartDate =
    pick(text, /Policy\s+Period\s+From:\s*(.+?)\s+To:/i) ||
    pick(text, /Period\s+of\s+Insurance\s+From:\s*(.+?)\s+To:/i);

  const policyEndDate =
    pick(text, /Policy\s+Period\s+From:.+?\s+To:\s*(.+?)(?:\s+[0-9]+\s+| Premium| Section|$)/i) ||
    pick(text, /Period\s+of\s+Insurance\s+From:.+?\s+To:\s*(.+?)(?:\s+Endorsement|\s+Date|\s+Issued|$)/i);

  const contentsSumInsured =
    toAmount(pick(text, /Total\s+Stock\s+Sum\s+Insured\s+([0-9,]+)/i)) ||
    toAmount(pick(text, /Total\s+Policy\s+Sum\s+Insured\s+([0-9,]+)/i)) ||
    toAmount(pick(text, /MSME\s+Suraksha\s+Kavach\s*-\s*Contents\s+([0-9,]+)/i));

  const burglarySumInsured =
    toAmount(pick(text, /Section\s*3:\s*Burglary.*?Total\s+Sum\s+Insured\s+([0-9,]+)/i)) ||
    toAmount(pick(text, /Burglary\s+Stock\s*[:-]?\s*([0-9,]+)/i)) ||
    toAmount(pick(text, /Burglary\s+([0-9,]+)/i));

  const fidelitySumInsured =
    toAmount(pick(text, /Section\s*5:\s*Fidelity.*?Sum\s+Insured\s+([0-9,]+)/i)) ||
    toAmount(pick(text, /Fidelity\s*[:-]?\s*([0-9,]+)/i));

  const netPremium =
    toAmount(pick(text, /Net\s+Premium\s+([0-9,]+)/i)) ||
    toAmount(pick(text, /Premium\s+Value\s+without\s+Tax\s+([0-9,]+)/i)) ||
    toAmount(pick(text, /Total\s+value\s+of\s+services\s+([0-9,]+)/i));

  const gstAmount =
    toAmount(pick(text, /GST\s*@\s*18%\s+([0-9,]+)/i)) ||
    toAmount(pick(text, /Applicable\s+GST\s+([0-9,.]+)/i)) ||
    toAmount(pick(text, /Total\s+Tax\s+Amount\s+([0-9,]+)/i));

  const premiumIncludingGst =
    toAmount(pick(text, /Total\s+Premium(?:\s+inclusive\s+Tax)?\s*[:-]?\s*([0-9,]+)/i)) ||
    (netPremium && gstAmount ? netPremium + gstAmount : null);

  const invoiceNumber = pick(text, /Invoice\s+Number\s*[:-]?\s*([0-9]+)/i);
  const invoiceDate = parseDateLike(pick(text, /Invoice\s+Date\s*[:-]?\s*([0-9A-Za-z,/ -]+)/i));

  const gstin =
    pick(text, /GSTIN(?:\s+Reg\s+no)?\s*[:-]?\s*([0-9A-Z]{15})/i) ||
    pick(text, /GSTIN\s+([0-9A-Z]{15})/i);

  const placeOfSupply = pick(text, /Place\s+[Oo]f\s+[Ss]upply\s*[:-]?\s*([A-Z ]+?)(?=\s+[A-Z][a-z]|\s*$)/);

  let hypothecationDetails =
    pick(text, /Hypothecation\s+Details\s*(.+?)\s+(?:WARRANTIES|SPECIAL|Authorized|GSTIN|Annexure|$)/i) ||
    pick(text, /Annexure:Hypothecation\/Financier\s+Details\s*(.+?)\s+(?:Subject|Authorized|$)/i);

  if (!hypothecationDetails && /A\/C\s+MPWLC/i.test(text)) {
    hypothecationDetails = "MPWLC";
  }

  const addressParts = splitAddressParts(riskLocation || mailingAddress || "");

  return {
    ...commonBase(POLICY_FORMAT, POLICY_FORMAT, fileName),

    policyNumber,
    insuredName,
    mailingAddress,
    riskLocation,
    businessDescription,
    issuedAt,

    policyStartDate: parseDateLike(policyStartDate),
    policyEndDate: parseDateLike(policyEndDate),

    district: addressParts.district,
    tehsil: addressParts.tehsil,
    village: addressParts.village,
    pincode: addressParts.pincode,

    sumInsured: contentsSumInsured,
    contentsSumInsured,
    burglarySumInsured,
    fidelitySumInsured,
    totalStockSumInsured: contentsSumInsured,
    policySumInsured: contentsSumInsured,

    premiumIncludingGst,
    premiumIncludingTax: premiumIncludingGst,
    netPremium,
    premiumExcludingTax: netPremium,
    gstAmount,

    invoiceNumber,
    invoiceDate,
    gstin,
    placeOfSupply,

    hypothecationDetails,
    financerName: /MPWLC/i.test(hypothecationDetails || "") ? "MPWLC" : null,

    brokerCode: (() => {
      const val = pick(text, /Agency\/Broker\s+Code\s*[:-]?\s*([A-Z0-9-]+)/i);
      return val === "Agency" ? null : val;
    })(),
    brokerName: (() => {
      const val = pick(text, /Agency\/Broker\s+Name\s*[:-]?\s*(.+?)\s+(?:Agency\/Broker|Mobile|Email)/i);
      return val === "Agency/Broker" ? null : val;
    })(),
    brokerMobile: pick(text, /Agency\/Broker\s+Mobile\s+No\s*[:-]?\s*([0-9]+)/i),
    brokerEmail: (() => {
      const val = pick(text, /Agency\/Broker\s+Email-ID\s*[:-]?\s*([^\s]+)/i);
      return (val && val.includes("INSUREDESK")) ? null : val;
    })(),
  };
}

function parseEndorsement(rawText, fileName = "") {
  const text = normalizeText(rawText);

  const policyNumber = pick(text, /Policy\s+Number\s+([0-9]{4}\/[0-9]+\/[0-9]{2}\/[0-9]{3})/i);
  const endorsementNumber = pick(text, /Endorsement\s+Number\s+([0-9]{4}\/[0-9]+\/[0-9]{2}\/[0-9]{3})/i);

  const insuredName = pick(text, /Insured\s+Name\s+(.+?)\s+Mailing\s+Address/i);

  const mailingAddress = pick(
    text,
    /Mailing\s+Address\s+(.+?)\s+Policy\s+Number/i
  );

  const policyStartDate = pick(text, /Period\s+of\s+Insurance\s+From:\s*(.+?)\s+To:/i);
  const policyEndDate = pick(text, /Period\s+of\s+Insurance\s+From:.+?\s+To:\s*(.+?)\s+Endorsement\s+Number/i);

  const endorsementEffectiveDate =
    pick(text, /Endorsement\s+Effective\s+Time\s*&?\s*Date\s+(.+?)\s+Date\s+of\s+Issue/i) ||
    pick(text, /Endorsement\s+Effective\s+Time\s+Date\s+(.+?)\s+Date\s+of\s+Issue/i);

  const dateOfIssue = pick(text, /Date\s+of\s+Issue\s+(.+?)\s+Issued\s+Office/i);
  const issuedOffice = pick(text, /Issued\s+Office\s+([A-Z ]+?)(?:\s+SYSESB|\s+Financer|\s+Name\s+of|$)/i);

  const financerLine = pick(
    text,
    /Name\s+of\s+the\s+Financer\s+Branch\s+Agreement\s+(.+?)\s+Endorsement\s+Wording/i
  );

  let financerName = null;
  let financerBranch = null;
  let agreementType = null;

  if (financerLine) {
    const parts = financerLine.split(/\s+/);
    agreementType = /Hypothecation/i.test(financerLine) ? "Hypothecation" : null;
    financerName = financerLine.replace(/\s+Hypothecation$/i, "").trim();
    if (/MPWLC/i.test(financerLine)) financerName = "MPWLC";
    if (/BANK OF BARODA/i.test(financerLine)) financerName = "BANK OF BARODA";
    financerBranch = parts.length > 1 ? parts.slice(1, -1).join(" ") || null : null;
  }

  const endorsementWording = pick(text, /Endorsement\s+Wording:\s*(.+?)\s+Total\s+Premium/i);

  const contentsSumInsured =
    toAmount(pick(text, /Fire\s+Stocks?\s*[:-]?\s*([0-9,]+)/i)) ||
    toAmount(pick(text, /Content\s+([0-9,]+)/i));

  const burglarySumInsured =
    toAmount(pick(text, /Burglary\s+Stock\s*[:-]?\s*([0-9,]+)/i)) ||
    toAmount(pick(text, /Burglary\s+([0-9,]+)/i));

  const fidelitySumInsured =
    toAmount(pick(text, /Fidelity\s*[:-]?\s*([0-9,]+)/i)) ||
    toAmount(pick(text, /Fidelity\s+([0-9,]+)/i));

  const increasedBy =
    toAmount(pick(text, /increased\s+by\s+an\s+amount\s+equal\s+to\s+Rs\.?\s*([0-9,]+)/i)) ||
    toAmount(pick(text, /by\s+an\s+amount\s+equal\s+to\s+Rs\.?\s*([0-9,]+)/i));

  const previousSumInsured = toAmount(pick(text, /increased\s+from\s+Rs\.?\s*([0-9,]+)/i));
  const revisedSumInsured = toAmount(pick(text, /to\s+Rs\.?\s*([0-9,]+)/i));

  const extraPremium = pick(text, /extra\s+premium\s+amounting\s+to\s+Rs\.?\s*([0-9,]+)/i);
  const premiumIncludingGst = pick(text, /Total\s+Premium\s*[:\s\\'`"3]*\s*([0-9,]+)/i);

  const addressParts = splitAddressParts(mailingAddress || "");

  return {
    ...commonBase(ENDORSEMENT_FORMAT, ENDORSEMENT_FORMAT, fileName),

    policyNumber,
    endorsementNumber,
    insuredName,
    mailingAddress,
    riskLocation: mailingAddress,

    policyStartDate: parseDateLike(policyStartDate),
    policyEndDate: parseDateLike(policyEndDate),
    endorsementEffectiveDate: parseDateLike(endorsementEffectiveDate),
    endorsementDate: parseDateLike(dateOfIssue),
    dateOfIssue: parseDateLike(dateOfIssue),
    issuedOffice,

    district: addressParts.district,
    tehsil: addressParts.tehsil,
    village: addressParts.village,
    pincode: addressParts.pincode,

    financerDetails: financerLine,
    financerName,
    financerBranch,
    agreementType,

    endorsementWording,

    previousSumInsured,
    revisedSumInsured,
    increasedBy,

    sumInsured: revisedSumInsured || contentsSumInsured,
    contentsSumInsured,
    burglarySumInsured,
    fidelitySumInsured,

    extraPremium,
    premiumIncludingGst,
    premiumIncludingTax: premiumIncludingGst,

    gstin: pick(text, /GSTIN\s+Reg\s+no\s*:\s*([0-9A-Z]{15})/i),
  };
}

function parseQuotation(rawText, fileName = "") {
  const text = normalizeText(rawText);

  const quotationNumber = pick(text, /QUOTATION\s+No:\s*([A-Z0-9-]+)/i);
  const insuredName = pick(text, /Insured\s+Name\s+(.+?)\s+Mailing\s+Address/i);
  const mailingAddress = pick(text, /Mailing\s+Address\s+with\s+Pincode\s+(.+?)\s+Occupancy\s+of\s+Risk/i);
  const occupancy = pick(text, /Occupancy\s+of\s+Risk\s+(.+?)\s+Policy\s+Period/i);

  const policyStartDate = pick(text, /Policy\s+Period\s+FROM\s+(.+?)\s+TO/i);
  const policyEndDate = pick(text, /Policy\s+Period\s+FROM\s+.+?\s+TO\s+(.+?)\s+Quotation\s+Date/i);

  const quotationDate = pick(text, /Quotation\s+Date\s+(.+?)\s+Quote\s+Valid/i);
  const quoteValidTill = pick(text, /Quote\s+Valid\s+Till\s+(.+?)\s+Intermediary/i);

  const intermediaryId = pick(text, /Intermediary\s+ID\s+([A-Z0-9-]+)/i);
  const intermediaryName = pick(text, /Intermediary\s+Name\s+(.+?)\s+Claims\s+ratio/i);

  const claimsRatio = pick(text, /Claims\s+ratio\s+(.+?)\s+Amount/i);
  const earthquakeZone = pick(text, /Highest\s+Earthquake\s+Zone\s+([IVX]+)/i);
  const basementRisk = pick(text, /Basement\s+Risk\s+(Yes|No)/i);

  const contentsSumInsured =
    toAmount(pick(text, /Total\s+Stock\s+Sum\s+Insured\s+([0-9,]+)/i)) ||
    toAmount(pick(text, /Total\s+Policy\s+Sum\s+Insured\s+([0-9,]+)/i));

  const burglarySumInsured = toAmount(
    pick(text, /Section\s*3:\s*Burglary\s+Total\s+Sum\s+Insured\s+([0-9,]+)/i)
  );

  const fidelitySumInsured = toAmount(
    pick(text, /Section\s*5:\s*Fidelity\s+Guarantee\s+Sum\s+Insured\s+([0-9,]+)/i)
  );

  const employeeCount = toAmount(pick(text, /Number\s+of\s+employees\s+covered\s+([0-9]+)/i));
  const aoaLimit = toAmount(pick(text, /AOA\s+Limit\s+([0-9,]+)/i));

  const netPremium = toAmount(pick(text, /Net\s+Premium\s+([0-9,]+)/i));
  const gstAmount = toAmount(pick(text, /GST\s*@18%\s+([0-9,]+)/i));
  const premiumIncludingGst = toAmount(pick(text, /Total\s+Premium\s+([0-9,]+)/i));

  const hypothecationDetails = pick(text, /Hypothecation\s+Details\s+(.+?)\s+WARRANTIES/i);

  const addressParts = splitAddressParts(mailingAddress || "");

  return {
    ...commonBase(QUOTATION_FORMAT, QUOTATION_FORMAT, fileName),

    quotationNumber,
    insuredName,
    mailingAddress,
    riskLocation: mailingAddress,
    occupancy,

    policyStartDate: parseDateLike(policyStartDate),
    policyEndDate: parseDateLike(policyEndDate),
    quotationDate: parseDateLike(quotationDate),
    quoteValidTill: parseDateLike(quoteValidTill),

    intermediaryId,
    intermediaryName,
    brokerCode: intermediaryId,
    brokerName: intermediaryName,

    claimsRatio,
    earthquakeZone,
    basementRisk,

    district: addressParts.district,
    tehsil: addressParts.tehsil,
    village: addressParts.village,
    pincode: addressParts.pincode,

    sumInsured: contentsSumInsured,
    contentsSumInsured,
    burglarySumInsured,
    fidelitySumInsured,
    totalStockSumInsured: contentsSumInsured,
    policySumInsured: contentsSumInsured,

    employeeCount,
    aoaLimit,

    netPremium,
    premiumExcludingTax: netPremium,
    gstAmount,
    premiumIncludingGst,
    premiumIncludingTax: premiumIncludingGst,

    hypothecationDetails,
    financerName: /MPWLC/i.test(hypothecationDetails || "") ? "MPWLC" : null,
  };
}

function parseIciciWarehouseMsme(rawText, fileName = "") {
  const text = normalizeText(rawText);
  const detected = detectIciciWarehouseMsme(text);

  if (!detected) return null;

  if (detected === ENDORSEMENT_FORMAT) {
    return parseEndorsement(text, fileName);
  }

  if (detected === QUOTATION_FORMAT) {
    return parseQuotation(text, fileName);
  }

  return parsePolicy(text, fileName);
}

module.exports = {
  POLICY_FORMAT,
  ENDORSEMENT_FORMAT,
  QUOTATION_FORMAT,
  detectIciciWarehouseMsme,
  parseIciciWarehouseMsme,
};
