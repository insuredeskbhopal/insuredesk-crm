const { normalizeAmount, sumPlainAmounts } = require("../../utils/amounts.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanWarehouseBlock } = require("../../utils/text.cjs");

const scope = { insurer: "united-india", category: "warehouse" };

function matches({ text = "" }) {
  return (
    /UNITED\s+INDIA\s+INSURANCE\s+COMPANY\s+LIMITED/i.test(text) &&
    (/UNITED\s+VALUE\s+UDYAM\s+SURAKSHA\s+POLICY/i.test(text) ||
      /UNITED\s+BHARAT\s+LAGHU\s+UDYAM\s+SURAKSHA\s+POLICY/i.test(text))
  );
}

function train({ text = "", result = {} }) {
  const policyNumber =
    matchGroup(text, /Policy\s+No\.?\s*:?\s*([A-Z0-9]{10,25})/i) ||
    matchGroup(text, /POLICY\s+NO\.\s*:?\s*([A-Z0-9]{10,25})/i) ||
    result.policyNumber;

  const previousPolicyNumber =
    matchGroup(text, /RENEWAL\s+OF\s+PREVIOUS\s+POLICY\s+NO\.?\s*:?\s*([A-Z0-9]+)/i) ||
    result.previousPolicyNumber ||
    "";

  const insuredBlock = text.match(/\bInsured\s*\n\s*([^\n]+)\s*\n\s*([^\n]+)/i);
  const insuredNameRaw = insuredBlock?.[1] || "";
  const insuredName = cleanWarehouseBlock(
    insuredNameRaw.replace(/^M\/s\.?\s*/i, "").split("/")[0],
  ) || result.insuredName;

  const startDate =
    matchGroup(text, /From\s+(?:\d{1,2}:\d{2}\s+)?(?:Hrs\s+of\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    result.startDate;

  const expiryDate =
    matchGroup(text, /To\s+(?:Midnight\s+of\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
    result.expiryDate;

  const contentsSumInsured =
    normalizeAmount(matchGroup(text, /Risks\s+Covered[\s\S]{0,100}?Contents\s*([0-9,]+(?:\.\d{1,2})?)/i)) ||
    normalizeAmount(matchGroup(text, /Sum\s+Insured\(\s*₹?\s*\)[\s\S]{0,50}?Contents\s*([0-9,]+(?:\.\d{1,2})?)/i)) ||
    result.contentsSumInsured;

  const netPremium =
    normalizeAmount(matchGroup(text, /Net\s+Premium\s*:?\s*([0-9,]+(?:\.\d{1,2})?)/i)) ||
    result.netPremium;

  const cgst =
    normalizeAmount(matchGroup(text, /CGST\s*\(\s*9%\s*\)\s*:?\s*([0-9,]+(?:\.\d{1,2})?)/i)) ||
    result.cgst;

  const sgst =
    normalizeAmount(matchGroup(text, /SGST\s*\(\s*9%\s*\)\s*:?\s*([0-9,]+(?:\.\d{1,2})?)/i)) ||
    result.sgst;

  const igst =
    normalizeAmount(matchGroup(text, /IGST\s*\(\s*\d+(?:\.\d+)?%\s*\)\s*:?\s*([0-9,]+(?:\.\d{1,2})?)/i)) ||
    result.igst;

  const stampDuty =
    normalizeAmount(matchGroup(text, /Stamp\s+Duty\s*:?\s*([0-9,]+(?:\.\d{1,2})?)/i)) ||
    result.stampDuty;

  const totalPremium =
    normalizeAmount(matchGroup(text, /Total\s*:?\s*([0-9,]+(?:\.\d{1,2})?)/i)) ||
    result.totalPremium;

  const invoiceMatch = text.match(/Invoice\s+No\.\s*&\s*Date\s*:?\s*([A-Z0-9]+)\s*&\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const receiptMatch = text.match(/Receipt\s+No\.?\s*:?\s*([0-9]+)[\s\S]{0,50}?Receipt\s+Date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);

  const agentMatch = text.match(/Agent\s+Name\s*:?\s*([^\n]+)[\s\S]{0,50}?Agent\s+Code\s*:?\s*([A-Z0-9]+)/i);
  const businessAssociateCode = matchGroup(text, /\b(BAS[0-9]+)\b/i) || matchGroup(text, /Business\s+Associate\s+Code\s*:?\s*([A-Z0-9]+)/i) || result.businessAssociateCode || "";

  const fireLocMatch = text.match(/Location\s+Address[\s\S]*?Sum\s+Insured\([^)]*\)([\s\S]+?)(?=\s*Storage\s+of|\s*RENEWAL|\s*Warranties|\s*Special\s+Condition)/i);
  let rawLocationAddress = (fireLocMatch?.[1] || "").replace(/[\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  rawLocationAddress = rawLocationAddress
    .replace(/\s+(?:S\.\s*PODDAR\s*I\s*NFRA|SHREEJI\s*EXP\s*ORT)$/i, "")
    .replace(/,\s*KACHCHH\s*,\s*GUJARAT\s*,\s*Pin-?\s*\d{6}$/i, "")
    .replace(/GO\s+DOWN/gi, "GODOWN")
    .replace(/BEH\s*IN\s*D\s+ACT/gi, "BEHIND ACT")
    .replace(/BEHIN\s*D\s+ACT/gi, "BEHIND ACT")
    .replace(/N\s+O\./g, "NO.")
    .replace(/K\s+ANDLA/g, "KANDLA")
    .replace(/K\s+UTCH/g, "KUTCH")
    .replace(/GUJAR\s+AT/g, "GUJARAT")
    .replace(/KACHCH\s+H/g, "KACHCHH")
    .replace(/I\s+NFRA/g, "INFRA")
    .replace(/Pi\s+n-/g, "Pin-")
    .trim() || result.riskLocation || "";

  const tehsil = matchGroup(rawLocationAddress, /TEHSIL\s+([^,]+)/i).replace(/K\s+ANDLA/i, "KANDLA") || result.tehsil || "";
  const district = matchGroup(rawLocationAddress, /DISTRICT\s+([^,]+)/i) || result.district || "";
  const state = matchGroup(rawLocationAddress, /(GUJARAT|MADHYA\s+PRADESH|MAHARASHTRA|RAJASTHAN|UTTAR\s+PRADESH)/i).toUpperCase() || result.state || "";
  const pincode =
    matchGroup(rawLocationAddress, /(?:Pin-?|pincode:?\s*)(\d{6})\b/i) ||
    matchGroup(rawLocationAddress, /\b(\d{6})\b/) ||
    matchGroup(text, /(?:Pin-?|Pin\s*Code\s*\n?\s*)(\d{6})\b/i) ||
    matchGroup(text, /\b([1-9]\d{5})\b/) ||
    result.pincode ||
    "";

  const goodsStoredMatch = text.match(/\b(RICE|WHEAT|GRAINS|PULSES|SOYABEAN|COTTON)\s*[0-9]/i) || text.match(/Specific\s+Items\s*\n\s*([A-Z]{3,15})/i);
  const itemDescription = goodsStoredMatch?.[1]?.toUpperCase() || "RICE";

  const financialInstitutions = extractFinancialInstitutions(text);

  return {
    policyNumber,
    previousPolicyNumber,
    insuredName,
    startDate,
    expiryDate,
    contentsSumInsured,
    stockSumInsured: contentsSumInsured || result.stockSumInsured,
    sumInsured: contentsSumInsured || result.sumInsured,
    netPremium,
    cgst,
    sgst,
    igst,
    stampDuty,
    totalPremium,
    premiumIncludingGst: totalPremium,
    gstAmount: sumPlainAmounts(cgst, sgst) || igst || result.gstAmount,
    invoiceNumber: invoiceMatch?.[1] || result.invoiceNumber || "",
    invoiceDate: invoiceMatch?.[2] || result.invoiceDate || "",
    receiptNumber: receiptMatch?.[1] || result.receiptNumber || "",
    receiptDate: receiptMatch?.[2] || result.receiptDate || "",
    brokerName: cleanWarehouseBlock(agentMatch?.[1]) || result.brokerName || "",
    brokerCode: agentMatch?.[2] || result.brokerCode || "",
    businessAssociateCode,
    riskLocation: rawLocationAddress || result.riskLocation,
    mailingAddress: rawLocationAddress || result.mailingAddress,
    premisesAddress: rawLocationAddress || result.premisesAddress,
    tehsil,
    district,
    state,
    pincode,
    goodsStored: itemDescription,
    financialInstitutions: financialInstitutions.length ? financialInstitutions : result.financialInstitutions || [],
    hypothecationDetails: financialInstitutions.join(", ") || result.hypothecationDetails || "",
    warehouseFinanced: financialInstitutions.length > 0,
    extractionTrainingVersion: "UNITED_INDIA_WAREHOUSE_TRAINING_V2",
  };
}

function extractFinancialInstitutions(text = "") {
  const block = matchGroup(
    text,
    /Financier\s+Name[\s\S]*?Loan\s+Number([\s\S]*?)(?:\n\s*POLICY\s+NO\.|Location\s*\/\s*Risk\s+Details|\d\s*\/\s*12)/i,
  );
  if (!block) return [];

  const knownBanks = [
    [/HDFC\s+BANK\s+LTD/i, "HDFC BANK LTD"],
    [/AXIS\s+BANK\s+LTD/i, "AXIS BANK LTD."],
    [/YES\s+BANK\s+LTD/i, "YES BANK LTD."],
    [/UNION\s+BANK\s+OF\s+INDIA/i, "UNION BANK OF INDIA"],
    [/CENTRAL\s+BANK\s+OF\s+INDIA/i, "CENTRAL BANK OF INDIA"],
    [/PUNJAB\s+NATIONAL\s+BANK/i, "PUNJAB NATIONAL BANK"],
    [/ICICI\s+BANK\s+LTD/i, "ICICI BANK LTD"],
    [/STATE\s+BANK\s+OF\s+INDIA/i, "STATE BANK OF INDIA"],
    [/L\s*&\s*T\s+FINANCE/i, "L&T FINANCE LTD"],
  ];

  return knownBanks.filter(([pattern]) => pattern.test(block)).map(([, name]) => name);
}

module.exports = { scope, matches, train };
