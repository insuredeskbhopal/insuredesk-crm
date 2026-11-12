const { normalizeAmount, sumPlainAmounts } = require("../../utils/amounts.cjs");
const { normalizeWarehouseDate } = require("../../utils/dates.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanWarehouseBlock } = require("../../utils/text.cjs");

const scope = { insurer: "tata-aig", category: "warehouse" };

function extractIncreaseAmount(text, section) {
  return normalizeAmount(
    matchGroup(
      text,
      new RegExp(`${section}\\s*(?:Section)?\\s*[0-9]{1,3}(?:,[0-9]{3})+[0-9]{1,3}(?:,[0-9]{3})+([0-9]{1,3}(?:,[0-9]{3})+)`, "i"),
    ),
  );
}

function matches({ text = "" }) {
  return (
    /TATA\s*AIG/i.test(text) &&
    (/Business\s+Guard/i.test(text) || /\bENDORSEMENT\b|change\s+in\s+sum\s+insured/i.test(text.slice(0, 1500)))
  );
}

function pickClientPincode(text = "") {
  const found = String(text || "").match(/\b([1-9][0-9]{5})\b/g) || [];
  return found.find((pin) => pin !== "400013") || "";
}

function inferAnnualStartFromExpiry(expiryStr = "") {
  const m = String(expiryStr || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const dt = new Date(Date.UTC(Number(m[3]) - 1, Number(m[2]) - 1, Number(m[1])));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}/${dt.getUTCFullYear()}`;
}

function train({ text = "", result = {} }) {
  const header = String(text || "").slice(0, 1500);
  const isEndorsement = !/\bSCHEDULE\b/i.test(header) && /\bENDORSEMENT\b|change\s+in\s+sum\s+insured/i.test(header);

  if (isEndorsement) {
    const policyPeriod = text.match(/(\d{2}\/\d{2}\/\d{4})\s*To\s*(\d{2}\/\d{2}\/\d{4})\s*Policy\s+PeriodFrom/i);
    const expiryOnly = matchGroup(text, /POLICY\s+NO\.?:?\s*[0-9]{10}(\d{2}\/\d{2}\/\d{4})\s*Expiry\s+Date/i);
    const resolvedExpiry = normalizeWarehouseDate(policyPeriod?.[2] || expiryOnly || result.expiryDate);
    const resolvedStart = normalizeWarehouseDate(
      policyPeriod?.[1] || result.startDate || inferAnnualStartFromExpiry(resolvedExpiry),
    );
    const insuredName = cleanWarehouseBlock(
      matchGroup(text, /change\s+in\s+sum\s+insured\s+limit\s*\n\s*([^\n]+)/i) ||
        matchGroup(text, /Insured\s*\n\s*([^\n]+)/i) ||
        matchGroup(text, /Name\s+of\s+the\s+Insured\s*([^\n]+)/i),
    );
    const occupancy = cleanWarehouseBlock(
      matchGroup(text, /Occupancy\s*\n\s*([\s\S]+?)(?=\s*Sr\.No:)/i),
    );
    const riskBlock = cleanWarehouseBlock(
      matchGroup(text, /Risk\s+Address\s*:1\s*\n\s*([\s\S]+?)(?=\s*CoverageExisting|\n\s*Coverage)/i) ||
        result.riskLocation ||
        "",
    );
    const pincode =
      result.pincode ||
      pickClientPincode(riskBlock) ||
      pickClientPincode(result.riskLocation) ||
      pickClientPincode(header);
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
      insuredName: result.insuredName || insuredName,
      mailingAddress: result.mailingAddress || riskBlock || result.riskLocation,
      communicationAddress: result.communicationAddress || riskBlock || result.riskLocation,
      riskLocation: result.riskLocation || riskBlock,
      pincode,
      businessDescription: occupancy || result.businessDescription,
      occupancy: occupancy || result.occupancy,
      startDate: resolvedStart,
      expiryDate: resolvedExpiry,
      premiumIncludingGst: premiumIncludingGst || result.premiumIncludingGst,
      premium: premiumIncludingGst || result.premium,
      totalPremium: premiumIncludingGst || result.totalPremium,
      cgst: cgst || result.cgst,
      sgst: sgst || result.sgst,
      gstAmount: sumPlainAmounts(cgst || result.cgst, sgst || result.sgst),
      sumInsured: contentsSumInsured || burglarySumInsured || result.sumInsured,
      contentsSumInsured: contentsSumInsured || result.contentsSumInsured,
      burglarySumInsured: burglarySumInsured || result.burglarySumInsured,
      fidelitySumInsured: fidelitySumInsured || result.fidelitySumInsured,
      coverages: coverages.length ? coverages : result.coverages,
      isEndorsement: true,
      endorsementNumber:
        matchGroup(text, /\n\s*(\d{1,3})\s*\nEndorsement\s+No\.?/i) ||
        matchGroup(text, /Endorsement\s+No\.?:?\s*(\d{1,3})/i),
      endorsementEffectiveDate: normalizeWarehouseDate(
        matchGroup(text, /Endorsement\s+Effective\s+Date\s*(\d{2}\/\d{2}\/\d{4})/i) ||
          matchGroup(text, /Effective\s+Date\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i),
      ),
      extractionTrainingVersion: "TATA_AIG_WAREHOUSE_ENDORSEMENT_V1",
    };
  }

  // Standard Policy Schedule Training
  const policyNumber =
    matchGroup(text, /POLICY\s+NO\s*:?\s*([0-9]{10})/i) ||
    result.policyNumber;

  const rawInsuredName =
    matchGroup(text, /INSURED\s+NAME\s*:\s*([\s\S]+?)(?=\s*(?:CUSTOMER\s+MOBILE|CUSTOMER\s+EMAIL|COMMUNICATION\s+ADDRESS|PLACE\s+OF\s+SUPPLY|$))/i) ||
    matchGroup(text, /INSURED\s+NAME\s*:\s*([^\n]+)/i) ||
    result.insuredName;
  let insuredName = cleanWarehouseBlock(rawInsuredName);
  if (insuredName) {
    insuredName = insuredName.replace(/\s+\d+$/, "").replace(/\s+[a-zA-Z]$/, "").trim();
  }

  const customerMobile = matchGroup(text, /CUSTOMER\s+MOBILE\s+NO\s*:\s*([0-9]+)/i) || result.customerMobile || "";
  const customerEmail = matchGroup(text, /CUSTOMER\s+EMAIL\s*:\s*([^\s\n]+)/i) || result.customerEmail || "";

  const communicationAddress =
    cleanWarehouseBlock(matchGroup(text, /COMMUNICATION\s+ADDRESS\s*:\s*([\s\S]+?)\s*PLACE\s+OF\s+SUPPLY/i)) ||
    result.communicationAddress || "";

  const placeOfSupply = matchGroup(text, /PLACE\s+OF\s+SUPPLY\s*:\s*([^\n]+)/i) || "";
  const stateCode = matchGroup(text, /STATE\s+CODE\s*:\s*([0-9]+)/i) || "";

  const riskLocation =
    cleanWarehouseBlock(
      matchGroup(text, /RISK\s+LOCATION\s+ADDRESS\s*:\s*([\s\S]+?)\s*OCCUPANCY\s*:/i) ||
      matchGroup(text, /Location of Risk\s*:\s*([\s\S]+?)\s*Occupancy\s*:/i),
    ) || communicationAddress || result.riskLocation || "";

  const tehsil = matchGroup(riskLocation, /TEHSIL,?\s*([^,]+)/i) || result.tehsil || "";
  const district = matchGroup(riskLocation, /DIST\s*-?\s*([^,-]+)/i) || result.district || "";
  const state = matchGroup(riskLocation, /(MADHYA\s+PRADESH|GUJARAT|MAHARASHTRA|RAJASTHAN|UTTAR\s+PRADESH)/i).toUpperCase() || result.state || "";
  const pincode = matchGroup(riskLocation, /-\s*(\d{6})/i) || matchGroup(riskLocation, /\b(\d{6})\b/) || result.pincode || "";

  const occupancy =
    cleanWarehouseBlock(
      matchGroup(text, /OCCUPANCY\s*:\s*([\s\S]+?)\s*PERIOD\s+OF\s+INSURANCE/i) ||
      matchGroup(text, /Occupancy\s*:\s*([\s\S]+?)\s*(?:Sr\.No:|$)/i),
    ) || result.occupancy || "";

  const goodsStored = matchGroup(occupancy, /(Stock\s+of\s+[^\n.]+)/i) || "Stock of wheat and rice";

  const startDate = normalizeWarehouseDate(
    matchGroup(text, /From\s*:\s*(?:00:00hrs\s+of\s+)?([0-9-]+)/i) || result.startDate,
  );
  const expiryDate = normalizeWarehouseDate(
    matchGroup(text, /To\s*:\s*(?:Midnight\s+of\s+)?([0-9-]+)/i) || result.expiryDate,
  );

  const brokerRaw = cleanWarehouseBlock(matchGroup(text, /Agent\/Broker\s+Name\s*-\s*([^\n]+)/i));
  const brokerName = brokerRaw.replace(/-[0-9]{6,}$/, "").trim() || result.brokerName || "";
  const brokerCode = matchGroup(text, /Agent\/Broker\s+License\s+Code\s*-?\s*([0-9]+)/i) || result.brokerCode || "";
  const brokerMobile = matchGroup(text, /Agent\/Broker\s+Contact\s+No\s*-\s*([0-9X]+)/i) || result.brokerMobile || "";

  const hypothecation = cleanWarehouseBlock(matchGroup(text, /BANK\s*\/\s*FINANCIAL\s+INSTITUTION\s*:\s*([^\n]+)/i));
  const financialInstitutions = hypothecation ? [hypothecation] : result.financialInstitutions || [];

  const netPremium = normalizeAmount(matchGroup(text, /Net\s+Premium\s*:\s*Rs\.?\s*([0-9,.]+)/i)) || result.netPremium;
  const cgst = normalizeAmount(matchGroup(text, /CGST\s*Rs\.?\s*([0-9,.]+)/i)) || result.cgst;
  const sgst = normalizeAmount(matchGroup(text, /SGST\s*Rs\.?\s*([0-9,.]+)/i)) || result.sgst;
  const totalPremium = normalizeAmount(
    matchGroup(text, /Total\s+Amount\s*\(Rounded\s+Off\)\s*:\s*Rs\.?\s*([0-9,.]+)/i),
  ) || result.totalPremium;
  const gstAmount = sumPlainAmounts(cgst, sgst) || result.gstAmount;

  const gstin = matchGroup(text, /GST\s+Registration\s+No\.?\s*:\s*([0-9A-Z]{15})/i) || "";
  const sacCode = matchGroup(text, /Service\s+Accounting\s+Code\s*:?\s*([0-9]+)/i) || "997137";

  const contentsSumInsured =
    normalizeAmount(matchGroup(text, /A\.?\s*Fire[\s\S]{0,180}?([0-9][0-9,]+(?:\.\d{2})?)/i)) ||
    normalizeAmount(matchGroup(text, /Building\s*\(Refer\s+Annexure[^)]*\)\s*([0-9][0-9,]+(?:\.\d{2})?)/i)) ||
    result.contentsSumInsured;

  const burglarySumInsured =
    normalizeAmount(matchGroup(text, /B\s+Burglary[\s\S]{0,160}?([0-9][0-9,]+(?:\.\d{2})?)/i)) ||
    result.burglarySumInsured;

  const fidelitySumInsured =
    normalizeAmount(matchGroup(text, /F\s+Employee\s+Fidelity[\s\S]{0,160}?([0-9][0-9,]+(?:\.\d{2})?)/i)) ||
    normalizeAmount(matchGroup(text, /Annual\s+Aggregate\s*:\s*Rs\.?\s*([0-9][0-9,]+(?:\.\d{2})?)/i)) ||
    result.fidelitySumInsured;

  const sumInsured = contentsSumInsured || burglarySumInsured || fidelitySumInsured || result.sumInsured;

  const coverages = [
    contentsSumInsured && { sectionName: "Fire Building and/or Contents", sumInsured: contentsSumInsured },
    burglarySumInsured && { sectionName: "Burglary", sumInsured: burglarySumInsured },
    fidelitySumInsured && { sectionName: "Employee Fidelity", sumInsured: fidelitySumInsured },
  ].filter(Boolean);

  return {
    policyNumber,
    insuredName,
    customerMobile,
    customerEmail,
    communicationAddress,
    mailingAddress: communicationAddress,
    riskLocation,
    premisesAddress: riskLocation,
    placeOfSupply,
    stateCode,
    tehsil,
    district,
    state,
    pincode,
    occupancy,
    businessDescription: occupancy || "Storage of Agro goods",
    goodsStored,
    startDate,
    expiryDate,
    brokerName,
    brokerCode,
    brokerMobile,
    financialInstitutions,
    hypothecationDetails: hypothecation,
    netPremium,
    cgst,
    sgst,
    gstAmount,
    totalPremium,
    premiumIncludingGst: totalPremium,
    companyGstin: gstin,
    sacCode,
    contentsSumInsured,
    burglarySumInsured,
    fidelitySumInsured,
    sumInsured,
    coverages: coverages.length ? coverages : result.coverages,
    extractionTrainingVersion: "TATA_AIG_WAREHOUSE_SCHEDULE_V1",
  };
}

module.exports = { scope, matches, train };
