const { normalizeAmount } = require("../../utils/amounts.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanHdfcValue, sliceText } = require("../../utils/text.cjs");

const scope = { insurer: "icici-lombard", category: "health" };
const AMOUNT = "([0-9]{1,3}(?:,[0-9]{3})*\\.\\d{2})";
const MONTHS = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

function matches({ text = "" }) {
  return (
    /Product\s+Name\s*ELEVATE\b/i.test(text) &&
    /ICIHLIP\d{5}[A-Z]\d{6}/i.test(text) &&
    /\bPolicyholder\s+Details\b/i.test(text) &&
    /\bInsured\s+Details\b/i.test(text)
  );
}

function normalizeHealthDate(value = "") {
  const match = String(value).match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (!match) return "";
  const month = MONTHS[match[1].toLowerCase()];
  return month ? `${match[2].padStart(2, "0")}/${month}/${match[3]}` : "";
}

function extractDateList(value = "") {
  return (String(value).match(/[A-Za-z]+\s+\d{1,2},?\s+\d{4}/g) || []).map(normalizeHealthDate);
}

function splitDenseNames(value = "") {
  return cleanHdfcValue(value)
    .replace(/([a-z])([A-Z])/g, "$1|$2")
    .split("|")
    .map(cleanHdfcValue)
    .filter(Boolean);
}

function calculateAge(dateOfBirth = "", effectiveDate = "") {
  const [birthDay, birthMonth, birthYear] = dateOfBirth.split("/").map(Number);
  const [effectiveDay, effectiveMonth, effectiveYear] = effectiveDate.split("/").map(Number);
  if (!birthYear || !effectiveYear) return "";
  const beforeBirthday =
    effectiveMonth < birthMonth || (effectiveMonth === birthMonth && effectiveDay < birthDay);
  return String(effectiveYear - birthYear - (beforeBirthday ? 1 : 0));
}

function extractInsuredMembers(text = "", policyStartDate = "") {
  const section = sliceText(text, /Insured\s+Details/i, /\*Your\s+Sum\s+Insured/i);
  const names = splitDenseNames(matchGroup(section, /Insured\s+Name\s*([^\n]+)/i));
  const birthDates = extractDateList(matchGroup(section, /Date\s+of\s+Birth\s*([^\n]+)/i));
  const genders = matchGroup(section, /Gender\s*([^\n]+)/i).match(/Female|Male|Other/gi) || [];
  const relationships =
    matchGroup(section, /Relationship\s+with\s+Policyholder\s*([^\n]+)/i).match(
      /Self|Spouse|Son|Daughter|Father|Mother|Brother|Sister|Other/gi,
    ) || [];
  const inceptionDates = extractDateList(
    matchGroup(section, /First\s+Policy\s+Inception\s+Date\s+IL\s*([^\n]+)/i),
  );
  const abhaIds = matchGroup(section, /ABHA\s+ID\s*([^\n]*)/i).match(/\b\d{2}(?:-?\d{4}){3}\b/g) || [];
  const preExistingDiseases =
    matchGroup(section, /Pre-Existing\s+Diseases\s*([^\n]*)/i).match(/Not\s+Applicable|None|No|Yes/gi) || [];
  const specificConditions =
    matchGroup(section, /Specific\s+Conditions\s*([^\n]*)/i).match(
      /Not\s+Applicable|Applicable|None|No|Yes/gi,
    ) || [];

  return names.map((name, index) => ({
    name,
    dateOfBirth: birthDates[index] || "",
    age: calculateAge(birthDates[index] || "", policyStartDate),
    gender: genders[index] || "",
    abhaId: abhaIds[index] || "",
    relationship: relationships[index] || "",
    preExistingDiseases: preExistingDiseases[index] || "",
    firstPolicyInceptionDate: inceptionDates[index] || "",
    specificConditions: specificConditions[index] || "",
  }));
}

function extractPremiums(text = "") {
  const pattern = new RegExp(
    `Premium\\s+Details[\\s\\S]{0,350}?\\n\\s*${AMOUNT}${AMOUNT}${AMOUNT}${AMOUNT}`,
    "i",
  );
  const match = text.match(pattern);
  return {
    basicPremium: normalizeAmount(match?.[1] || ""),
    taxAmount: normalizeAmount(match?.[2] || ""),
    stampDuty: normalizeAmount(match?.[3] || ""),
    totalPremium: normalizeAmount(match?.[4] || ""),
  };
}

function extractNominee(text = "") {
  const section = sliceText(text, /Nominee\s+Details/i, /Insured\s+Details/i);
  const row = matchGroup(
    section,
    /Nominee\s+NameRelationship\s+with\s+PolicyholderDate\s+of\s+BirthAppointee\s+Name\s*\n([^\n]+)/i,
  );
  const match = row.match(
    /^(.+?)(Self|Spouse|Son|Daughter|Father|Mother|Brother|Sister|Other)([A-Za-z]+\s+\d{1,2}\s+\d{4})(.*)$/i,
  );
  return {
    name: cleanHdfcValue(match?.[1] || ""),
    relationship: cleanHdfcValue(match?.[2] || ""),
    dateOfBirth: normalizeHealthDate(match?.[3] || ""),
    appointeeName: cleanHdfcValue(match?.[4] || ""),
  };
}

function train({ text = "", result }) {
  const policyholder = sliceText(text, /Policyholder\s+Details/i, /Policy\s+Details/i);
  const policyDetails = sliceText(text, /Policy\s+Details/i, /Premium\s+Details/i);
  const insuredDetails = sliceText(text, /Insured\s+Details/i, /\*Your\s+Sum\s+Insured/i);
  const branchDetails = sliceText(text, /Branch\s+Details/i, /Table\s+of\s+Benefits/i);
  const proposerName = matchGroup(policyholder, /Proposer\s*Name\s*(.+?)(?=Email\s+ID)/i);
  const address = cleanHdfcValue(matchGroup(policyholder, /\nAddress\s*([^\n]+)/i));
  const productName = matchGroup(policyDetails, /Product\s+Name\s*([^\n]+)/i);
  const policyPeriod = policyDetails.match(
    /Policy\s+Start\s+Date\s*&\s*Time\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})[\s\S]{0,50}?Policy\s+End\s+Date\s*&\s*Time\s*([A-Za-z]+\s+\d{1,2},\s*\d{4})/i,
  );
  const startDate = normalizeHealthDate(policyPeriod?.[1] || "");
  const expiryDate = normalizeHealthDate(policyPeriod?.[2] || "");
  const premiums = extractPremiums(text);
  const nominee = extractNominee(text);
  const insuredMembers = extractInsuredMembers(text, startDate);
  const storedMembers = insuredMembers.length ? insuredMembers : result.insuredMembers || [];
  const totalPremium = premiums.totalPremium || result.totalPremium;

  return {
    productName: productName || result.productName,
    policyNumber: matchGroup(policyDetails, /Policy\s+Number\s*([A-Z0-9/-]+)/i) || result.policyNumber,
    policyType: matchGroup(policyDetails, /Policy\s+Type\s*([^\n]+)/i) || result.policyType,
    policyTenure:
      matchGroup(policyDetails, /Policy\s+Tenure\s*(.+?)(?=Policy\s+Type)/i) || result.policyTenure,
    startDate: startDate || result.startDate,
    expiryDate: expiryDate || result.expiryDate,
    zone: matchGroup(policyDetails, /Zone\s*(.+?)(?=Premium\s+Payment\s+Frequency)/i) || result.zone,
    premiumPaymentFrequency:
      matchGroup(policyDetails, /Premium\s+Payment\s+Frequency\s*([^\n]+)/i) ||
      result.premiumPaymentFrequency,
    premiumPaymentMode:
      matchGroup(policyDetails, /Premium\s+Payment\s+Mode\s*(.+?)(?=LAN\s+Number|$)/i) ||
      result.premiumPaymentMode,
    proposerName: proposerName || result.proposerName,
    customerName: proposerName || result.customerName,
    insuredName: proposerName || insuredMembers[0]?.name || result.insuredName,
    contactPerson: proposerName || result.contactPerson,
    contactNumber: "",
    mobileNumber: "",
    customerMobile: "",
    email: "",
    customerEmail: "",
    mailingAddress: address || result.mailingAddress,
    communicationAddress: address || result.communicationAddress,
    policyholderEmailMasked: matchGroup(policyholder, /Email\s+ID\s*([^\n]+)/i),
    policyholderMobileMasked: matchGroup(policyholder, /Mobile\s*Number\s*(.+?)(?=Invoice\s+Number)/i),
    invoiceNumber: matchGroup(policyholder, /Invoice\s+Number\s*([A-Z0-9/-]+)/i),
    basicPremium: premiums.basicPremium || result.basicPremium || result.netPremium,
    netPremium: premiums.basicPremium || result.netPremium,
    taxAmount: premiums.taxAmount || result.taxAmount,
    gstAmount: premiums.taxAmount || result.gstAmount,
    stampDuty: premiums.stampDuty || result.stampDuty,
    totalPremium,
    premiumIncludingGst: totalPremium || result.premiumIncludingGst,
    premium: totalPremium || result.premium,
    nomineeName: nominee.name || result.nomineeName,
    nomineeRelationship: nominee.relationship || result.nomineeRelationship,
    nomineeDateOfBirth: nominee.dateOfBirth || result.nomineeDateOfBirth,
    appointeeName: nominee.appointeeName || result.appointeeName,
    insuredMembers: storedMembers,
    numberOfInsuredMembers: storedMembers.length,
    sumInsured:
      normalizeAmount(matchGroup(insuredDetails, /Sum\s+Insured\s*\([^)]*\)\*{0,2}\s*([0-9,]+)/i)) ||
      result.sumInsured,
    loyaltyBonus: normalizeAmount(matchGroup(insuredDetails, /Loyalty\s+Bonus\s*\([^)]*\)\s*([0-9,]+)/i)),
    powerBooster: normalizeAmount(matchGroup(insuredDetails, /Power\s+Booster\s*\([^)]*\)\s*([0-9,]+)/i)),
    previousPolicyNumber:
      matchGroup(insuredDetails, /Previous\s+Policy\s+Number\s*([A-Z0-9/-]+)/i) ||
      result.previousPolicyNumber,
    servicingBranchName:
      matchGroup(branchDetails, /Policy\s+Servicing\s+Office\s+LocationAddress\s*\n([^\n]+)/i) ||
      result.servicingBranchName,
    servicingBranchAddress:
      cleanHdfcValue(
        matchGroup(
          branchDetails,
          /Policy\s+Servicing\s+Office\s+LocationAddress\s*\n[^\n]+\n([\s\S]+?)(?=Agent\s+Details)/i,
        ),
      ) || result.servicingBranchAddress,
    agentName: matchGroup(branchDetails, /Agent\s+Name\s*([^\n]+)/i) || result.agentName,
    agentCode:
      matchGroup(branchDetails, /Agent\s+Code\s*([A-Z0-9/-]+?)(?=Mobile\s+Number|\n|$)/i) || result.agentCode,
    agentMobile: matchGroup(branchDetails, /Mobile\s+Number\s*([0-9]{10})/i) || result.agentMobile,
    productUin: matchGroup(text, /UIN:\s*(ICIHLIP\d{5}[A-Z]\d{6})/i) || result.productUin,
    extractionTrainingVersion: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
  };
}

module.exports = { scope, matches, train };
