const { normalizeAmount, sumPlainAmounts } = require("../../utils/amounts.cjs");
const { normalizeWarehouseDate } = require("../../utils/dates.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanWarehouseBlock } = require("../../utils/text.cjs");
const { extractTataWarehouse: extractBaseTataWarehouse } = require("./index.cjs");

function extractIncreaseAmount(text, section) {
  return normalizeAmount(
    matchGroup(
      text,
      new RegExp(`${section}\\s*(?:Section)?\\s*[0-9]{1,3}(?:,[0-9]{3})+[0-9]{1,3}(?:,[0-9]{3})+([0-9]{1,3}(?:,[0-9]{3})+)`, "i"),
    ),
  );
}

function extractTataWarehouse(text) {
  const base = extractBaseTataWarehouse(text);
  if (!base.documentDetected || !/\bENDORSEMENT\b|change\s+in\s+sum\s+insured/i.test(text)) return base;

  const policyPeriod = text.match(/(\d{2}\/\d{2}\/\d{4})\s*To\s*(\d{2}\/\d{2}\/\d{4})\s*Policy\s+PeriodFrom/i);
  const insuredName = cleanWarehouseBlock(
    matchGroup(text, /change\s+in\s+sum\s+insured\s+limit\s*\n\s*([^\n]+)/i) ||
      matchGroup(text, /Insured\s*\n\s*([^\n]+)/i) ||
      matchGroup(text, /Name\s+of\s+the\s+Insured\s*([^\n]+)/i),
  );
  const occupancy = cleanWarehouseBlock(
    matchGroup(text, /Occupancy\s*\n\s*([\s\S]+?)(?=\s*Sr\.No:)/i),
  );
  const contentsSumInsured = extractIncreaseAmount(text, "Fire");
  const burglarySumInsured = extractIncreaseAmount(text, "Burglary");
  const fidelitySumInsured = extractIncreaseAmount(text, "Fidelity");
  const cgst = normalizeAmount(matchGroup(text, /CGST\s*@\(\d+%\)\s*Rs\.?\s*([0-9,.]+)/i));
  const sgst = normalizeAmount(matchGroup(text, /(?:UGST\/)?SGST\s*@\(\d+%\)\s*Rs\.?\s*([0-9,.]+)/i));
  const premiumIncludingGst = normalizeAmount(matchGroup(text, /Premium\s+Payable\s*Rs\.?\s*([0-9,.]+)/i));
  const coverages = [
    contentsSumInsured && { sectionName: "Fire Building and/or Contents", sumInsured: contentsSumInsured },
    burglarySumInsured && { sectionName: "Burglary", sumInsured: burglarySumInsured },
    fidelitySumInsured && { sectionName: "Employee Fidelity", sumInsured: fidelitySumInsured },
  ].filter(Boolean);

  return {
    ...base,
    insuredName: base.insuredName || insuredName,
    mailingAddress: base.mailingAddress || base.riskLocation,
    businessDescription: occupancy || base.businessDescription,
    occupancy: occupancy || base.occupancy,
    startDate: normalizeWarehouseDate(policyPeriod?.[1] || base.startDate),
    expiryDate: normalizeWarehouseDate(policyPeriod?.[2] || base.expiryDate),
    premiumIncludingGst: premiumIncludingGst || base.premiumIncludingGst,
    cgst: cgst || base.cgst,
    sgst: sgst || base.sgst,
    gstAmount: sumPlainAmounts(cgst || base.cgst, sgst || base.sgst),
    sumInsured: contentsSumInsured || burglarySumInsured || base.sumInsured,
    contentsSumInsured: contentsSumInsured || base.contentsSumInsured,
    burglarySumInsured: burglarySumInsured || base.burglarySumInsured,
    fidelitySumInsured: fidelitySumInsured || base.fidelitySumInsured,
    coverages: coverages.length ? coverages : base.coverages,
    isEndorsement: true,
    endorsementNumber:
      matchGroup(text, /\n\s*(\d{1,3})\s*\nEndorsement\s+No\.?/i) ||
      matchGroup(text, /Endorsement\s+No\.?\s*(\d{1,3})/i),
    endorsementEffectiveDate: normalizeWarehouseDate(
      matchGroup(text, /Endorsement\s+Effective\s+Date\s*(\d{2}\/\d{2}\/\d{4})/i),
    ),
    extractionTrainingVersion: "TATA_AIG_WAREHOUSE_ENDORSEMENT_V1",
  };
}

module.exports = { extractTataWarehouse };
