const { normalizeAmount, sumAmounts } = require("../../utils/amounts.cjs");
const { cleanHdfcValue, sliceText } = require("../../utils/text.cjs");

const scope = { insurer: "care-health", category: "health" };
const MONTHS = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function matches({ text = "" }) {
  return /Care\s*Health|careinsurance\.com|Religare/i.test(text);
}

function normalizeDate(value = "") {
  if (!value) return "";
  const dmyMatch = String(value).match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, "0")}/${dmyMatch[2].padStart(2, "0")}/${dmyMatch[3]}`;
  }
  const textMatch = String(value).match(/(\d{1,2})[-/\s]+([A-Za-z]{3})[-/\s]+(\d{4})/i);
  if (textMatch) {
    const month = MONTHS[textMatch[2].toLowerCase()];
    if (month) {
      return `${textMatch[1].padStart(2, "0")}/${month}/${textMatch[3]}`;
    }
  }
  return "";
}

function formatAmount(value = "") {
  return value ? sumAmounts(value) : "";
}

function cleanPersonName(value = "") {
  return cleanHdfcValue(value)
    .replace(/^(?:Mrs|Miss|Mr|Ms|Dr|Shri|Smt)\.?\s+/i, "")
    .replace(/\s*\.\s*$/, "")
    .replace(/Sum\s+Insured\s*/gi, "")
    .replace(/Policy\s+Type.*$/i, "")
    .trim();
}

function extractInsuredMembers(text = "") {
  const s = sliceText(
    text,
    /Details\s+of\s+Insured\s+Person/i,
    /Details\s+of\s+Cover|Nominee\s+Details|Contact\s+details|Schedule\s+of\s+Benefits/i,
  );
  if (!s) return [];

  const RELS = "MEMBER|SELF|SPOUSE|WIFE|HUSBAND|SON|DAUGHTER|FATHER|MOTHER|BROTHER|SISTER|OTHER";
  const pattern = new RegExp(
    `(?:^|\\n)\\s*([A-Za-z\\s.'-]+?)\\s*([A-Z]\\d{6,8})\\s*(${RELS})\\s*(\\d{2}-[A-Za-z]{3}-\\d{4})\\s*(\\d{1,2})`,
    "gi",
  );
  const members = [];
  let m;
  while ((m = pattern.exec(s)) !== null) {
    const name = cleanPersonName(m[1].replace(/\s+/g, " "));
    const dob = normalizeDate(m[4]);
    let rel = m[3].toUpperCase();
    if (rel === "MEMBER") rel = "Self";
    else rel = rel[0] + rel.slice(1).toLowerCase();

    if (name && !members.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
      members.push({
        name,
        clientId: m[2],
        relationship: rel,
        dateOfBirth: dob,
        age: m[5],
      });
    }
  }
  return members;
}

function extractNominee(text = "") {
  // Case 1: Nominee Name (Relation)
  const m1 = text.match(/Nominee\s+Name\s*\((?:Relation|Relationship)\)\s*([A-Za-z\s.'-]+?)\s*\(([^)]+)\)/i);
  if (m1) {
    return {
      name: cleanPersonName(m1[1]),
      relationship: cleanHdfcValue(m1[2]),
    };
  }

  // Case 2: Nominee Details table
  const s = sliceText(
    text,
    /Nominee\s+Details/i,
    /Contact\s+details|Intermediary\s+Details|Schedule\s+of\s+Benefits/i,
  );
  const RELS = "Husband|Wife|Spouse|Son|Daughter|Father|Mother|Brother|Sister|Other";
  const m2 = s.match(new RegExp(`\\d+\\s*([A-Za-z\\s.'-]+?)(${RELS})\\s*(\\d{1,3})`, "i"));
  if (m2) {
    return {
      name: cleanPersonName(m2[1]),
      relationship: cleanHdfcValue(m2[2]),
    };
  }

  return {};
}

function extractIntermediary(text = "") {
  const m = text.match(
    /Intermediary\s+Details\s*\n+Name\s*Code\s*Contact\s*Details\s*\n+([A-Za-z\s.'-]+?)(\d{8})([6-9]\d{9})/i,
  );
  if (m) {
    return {
      name: cleanHdfcValue(m[1]),
      code: m[2],
      mobile: m[3],
    };
  }
  return {};
}

function extractMailingAddress(text = "") {
  const m = text.match(
    /Date\s*:\s*[^\n]+\n+((?:Mr|Mrs|Ms|Miss|Dr)\.?\s+[^\n]+)\n([\s\S]+?)(?=\nState\s+Code|\nDear)/i,
  );
  if (m) return cleanHdfcValue(m[2].replace(/\n/g, " "));

  const m2 = text.match(
    /Policy\s+Certificate\s*\n+((?:Mr|Mrs|Ms|Miss|Dr)\.?\s+[^\n]+)\n([\s\S]+?)(?=\nState\s+Code|\nPolicy\s+No)/i,
  );
  return m2 ? cleanHdfcValue(m2[2].replace(/\n/g, " ")) : "";
}

function train({ text = "", result = {} }) {
  const policyNumMatch = text.match(/Policy\s+No\.?\s*[:\s]*([A-Z0-9]+)/i);
  const policyNumber = policyNumMatch ? policyNumMatch[1].trim() : result.policyNumber;

  const holderMatch =
    text.match(/Dear\s+((?:Mr|Mrs|Ms|Miss|Dr)\s+[A-Za-z\s.'-]+?)(?:,|\n|!)/i) ||
    text.match(/Policyholder\s*Gender\s*Date\s*Of\s*Birth[^\n]*\n\s*([A-Za-z\s.'-]+?)(?:Male|Female|\d)/i) ||
    text.match(/Date\s*:\s*[^\n]+\n+((?:Mr|Mrs|Ms|Miss|Dr)\s+[A-Za-z\s.'-]+?)\n/i);

  const rawHolder = holderMatch ? holderMatch[1].trim() : "";
  const cleanHolder = rawHolder ? cleanPersonName(rawHolder) : result.customerName || result.insuredName;

  const startMatch =
    text.match(/Policy\s+Period\s*-\s*Start\s+Date\s*(?:\d{2}:\d{2}\s*hrs\s*)?([0-9A-Za-z-]+)/i) ||
    text.match(/Period\s+From\s*[:\s]*([0-9A-Za-z-]+)/i);
  const endMatch =
    text.match(/Policy\s+Period\s*-\s*End\s+Date\s*(?:Midnight\s*)?([0-9A-Za-z-]+)/i) ||
    text.match(/Period\s+To\s*[:\s]*([0-9A-Za-z-]+)/i);

  const policyStartDate = startMatch ? normalizeDate(startMatch[1]) : result.policyStartDate || result.startDate;
  const policyEndDate = endMatch ? normalizeDate(endMatch[1]) : result.policyEndDate || result.expiryDate;

  const totalPremMatch =
    text.match(/Premium\s+Paid\s*Rs\.?\s*([0-9,.]+)/i) ||
    text.match(/Total\s+Premium\s*[:\s]*([0-9,.]+)/i) ||
    text.match(/Premium\s+Rs\s*([0-9,.]+)/i);

  const totalPremium = totalPremMatch ? normalizeAmount(totalPremMatch[1]) : result.totalPremium || result.grossPremium;

  const netPremMatch =
    text.match(/Premium\s+Rs\s*([0-9,.]+)/i) ||
    text.match(/Net\s+Premium\s*[:\s]*([0-9,.]+)/i);

  const netPremium = netPremMatch ? normalizeAmount(netPremMatch[1]) : totalPremium;

  // Read labelled schedule amounts, not the receipt's benefit premium columns.
  const taxes = {};
  for (const [field, label] of [["cgst", "CGST"], ["sgst", "SGST(?:\\s*/\\s*UGST)?"], ["igst", "IGST"]]) {
    const match = text.match(new RegExp(`\\b${label}\\s+Rs\\.?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)`, "i"));
    if (match) taxes[field] = formatAmount(match[1]);
  }
  if (Object.keys(taxes).length === 3) taxes.gstAmount = sumAmounts(taxes.cgst, taxes.sgst, taxes.igst);

  const sumInsMatch =
    text.match(/Sum\s+Insured\s*\n?\s*([0-9,.]+)/i) ||
    text.match(/Policy\s+Sum\s+Insured\s*\n?\s*([0-9,.]+)/i);

  const sumInsured = sumInsMatch ? normalizeAmount(sumInsMatch[1]) : result.sumInsured;

  const planMatch = text.match(/Plan\s+Name\s*([^\n]+)/i);
  const productName = planMatch ? planMatch[1].trim() : "Care Health Insurance";

  const coverTypeMatch = text.match(/Cover\s+Type\s*([A-Za-z]+)/i);
  const coverType = coverTypeMatch ? coverTypeMatch[1].trim() : "";

  const members = extractInsuredMembers(text);
  const nominee = extractNominee(text);
  const intermediary = extractIntermediary(text);
  const address = extractMailingAddress(text);

  const primaryInsured = members[0]?.name || cleanHolder;

  return {
    productName,
    policyNumber: policyNumber || result.policyNumber,
    policyType: coverType ? `Health Insurance (${coverType})` : "Health Insurance",
    policyCoverType: coverType || result.policyCoverType,
    insuredName: primaryInsured || result.insuredName,
    customerName: cleanHolder || result.customerName,
    proposerName: cleanHolder || result.proposerName,
    contactPerson: cleanHolder || result.contactPerson,
    policyStartDate,
    startDate: policyStartDate,
    policyEndDate,
    expiryDate: policyEndDate,
    totalPremium: totalPremium ? formatAmount(totalPremium) : result.totalPremium,
    grossPremium: totalPremium ? formatAmount(totalPremium) : result.grossPremium,
    premium: totalPremium ? formatAmount(totalPremium) : result.premium,
    premiumIncludingGst: totalPremium ? formatAmount(totalPremium) : result.premiumIncludingGst,
    netPremium: netPremium ? formatAmount(netPremium) : totalPremium,
    basicPremium: netPremium ? formatAmount(netPremium) : totalPremium,
    ...taxes,
    sumInsured: sumInsured ? formatAmount(sumInsured) : result.sumInsured,
    totalSumInsured: sumInsured ? formatAmount(sumInsured) : result.totalSumInsured,
    insuredMembers: members.length > 0 ? members : (cleanHolder ? [{ name: cleanHolder }] : result.insuredMembers || []),
    numberOfInsuredMembers: members.length || 1,
    nomineeName: nominee.name || result.nomineeName,
    nomineeRelationship: nominee.relationship || result.nomineeRelationship,
    agentName: intermediary.name || result.agentName,
    agentCode: intermediary.code || result.agentCode,
    agentMobile: intermediary.mobile || result.agentMobile,
    mailingAddress: address || result.mailingAddress,
    communicationAddress: address || result.communicationAddress,
    vehicleNumber: "",
    registrationNumber: "",
    makeModel: "",
    vehicleMake: "",
    vehicleModel: "",
    variant: "",
    manufacturingYear: "",
    registrationDate: "",
    engineNumber: "",
    chassisNumber: "",
    fuelType: "",
    cubicCapacity: "",
    seatingCapacity: "",
    grossVehicleWeight: "",
    idv: "",
    totalPackagePremium: "",
    ncb: "",
    rtoLocation: "",
    extractionTrainingVersion: "CARE_HEALTH_V1",
  };
}

module.exports = { scope, matches, train };
