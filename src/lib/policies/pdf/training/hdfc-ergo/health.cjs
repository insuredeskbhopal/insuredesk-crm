const { sumAmounts } = require("../../utils/amounts.cjs");
const { matchGroup } = require("../../utils/regex.cjs");
const { cleanHdfcValue, sliceText } = require("../../utils/text.cjs");

const scope = { insurer: "hdfc-ergo", category: "health" };
const DATE = "\\d{1,2}/\\d{1,2}/\\d{4}";
const RELATIONSHIPS = "Self|Spouse|Son|Daughter|Father|Mother|Brother|Sister|Other";

function matches({ text = "" }) {
  return (
    /\bmy\s*:\s*Optima\s+Secure\b/i.test(text) &&
    /\bHDFHLIP\d{5}[A-Z]\d{6}\b/i.test(text) &&
    /Insured\s+Person[’']s\s+Details\s+and\s+Sum\s+Insured\s*[-–]\s*Optima\s+Secure/i.test(text) &&
    /Policy\s+Type\s*:\s*Family\s+Floater/i.test(text)
  );
}

function cleanPersonName(value = "") {
  return cleanHdfcValue(value).replace(/^(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+/i, "");
}

function normalizeDate(value = "") {
  const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return match ? `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}` : "";
}

function formatAmount(value = "") {
  return value ? sumAmounts(value) : "";
}

function calculateAge(dateOfBirth = "", effectiveDate = "") {
  const [birthDay, birthMonth, birthYear] = dateOfBirth.split("/").map(Number);
  const [effectiveDay, effectiveMonth, effectiveYear] = effectiveDate.split("/").map(Number);
  if (!birthYear || !effectiveYear) return "";
  const beforeBirthday =
    effectiveMonth < birthMonth || (effectiveMonth === birthMonth && effectiveDay < birthDay);
  return String(effectiveYear - birthYear - (beforeBirthday ? 1 : 0));
}

function extractMemberRows(text = "") {
  const premiumSection = sliceText(text, /Insured\s+Person[’']s\s+Premium\s+Details/i, /\bNote\s*:/i);
  const pattern = new RegExp(
    `^([A-Za-z][A-Za-z .'-]+?)(${RELATIONSHIPS})(Male|Female|Other)(${DATE})\\d+(?:\\.\\d+)?$`,
    "gim",
  );
  return [...premiumSection.matchAll(pattern)].map((match) => ({
    name: cleanPersonName(match[1]),
    relationship: cleanHdfcValue(match[2]),
    gender: cleanHdfcValue(match[3]),
    dateOfBirth: normalizeDate(match[4]),
  }));
}

function extractInsuredMembers(text = "", policyStartDate = "") {
  const members = extractMemberRows(text);
  const schedule = sliceText(
    text,
    /Insured\s+Person[’']s\s+Details\s+and\s+Sum\s+Insured\s*[-–]\s*Optima\s+Secure/i,
    /The\s+nominee\s+must\s+be/i,
  ).replace(/\s+/g, "");

  return members.map((member, index) => {
    const marker = `${member.name}${member.relationship}${member.gender}${member.dateOfBirth}`.replace(
      /\s+/g,
      "",
    );
    const start = schedule.indexOf(marker);
    const nextMember = members[index + 1];
    const nextMarker = nextMember
      ? `${nextMember.name}${nextMember.relationship}${nextMember.gender}${nextMember.dateOfBirth}`.replace(
          /\s+/g,
          "",
        )
      : "";
    const end = nextMarker ? schedule.indexOf(nextMarker, start + marker.length) : schedule.length;
    const row = start >= 0 ? schedule.slice(start + marker.length, end >= 0 ? end : schedule.length) : "";
    const inceptionDate = normalizeDate(matchGroup(row, new RegExp(`(${DATE})`)));

    return {
      ...member,
      age: calculateAge(member.dateOfBirth, policyStartDate),
      abhaId: "",
      preExistingDiseases: "",
      firstPolicyInceptionDate: inceptionDate,
      specificConditions: "",
    };
  });
}

function extractNominee(text = "", members = []) {
  const primary = members[0];
  if (!primary) return {};
  const schedule = sliceText(
    text,
    /Insured\s+Person[’']s\s+Details\s+and\s+Sum\s+Insured\s*[-–]\s*Optima\s+Secure/i,
    /The\s+nominee\s+must\s+be/i,
  ).replace(/\s+/g, "");
  const marker = `${primary.name}${primary.relationship}${primary.gender}${primary.dateOfBirth}`.replace(
    /\s+/g,
    "",
  );
  const row = schedule.slice(schedule.indexOf(marker) + marker.length);
  const match = row.match(
    /^(.+?)(Wife|Husband|Spouse|Son|Daughter|Father|Mother)(?=\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  const compactName = match?.[1] || "";
  const personKey = (value = "") =>
    String(value)
      .replace(/[^a-z]/gi, "")
      .toLowerCase();
  const nomineeKey = personKey(compactName);
  const nomineeKeyWithoutTitle = nomineeKey.replace(/^(?:mrs|miss|mr|ms|dr)/, "");
  const linkedMember = members.find((member) =>
    [nomineeKey, nomineeKeyWithoutTitle].includes(personKey(member.name)),
  );
  return {
    name: linkedMember?.name || compactName,
    relationship: cleanHdfcValue(match?.[2] || ""),
  };
}

function extractIntermediary(text = "") {
  const row = matchGroup(
    text,
    /Intermediary\s+NameIntermediary\s+CodeIntermediary\s+Contact\s+Number\s*\n([^\n]+)/i,
  );
  const mobile = matchGroup(row, /([6-9]\d{9})$/);
  const withoutMobile = mobile ? row.slice(0, -mobile.length).replace(/(?:\+?91[-\s]?)$/, "") : row;
  const code = matchGroup(withoutMobile, /(\d{8,})$/);
  const name = cleanHdfcValue(code ? withoutMobile.slice(0, -code.length) : withoutMobile);
  return { name, code, mobile };
}

function extractMailingAddress(text = "") {
  const block = matchGroup(text, /Email\s+ID\s*:[^\n]*\n[^\n]*\n([\s\S]+?)\nContact\s+No\s*:/i);
  return cleanHdfcValue(block.replace(/\s*\n\s*/g, " "));
}

function train({ text = "", result }) {
  const schedule = sliceText(text, /Policy\s+Number\s*:/i, /Insured\s+Person[’']s\s+Details/i);
  const policyPeriod = schedule.match(
    /Period\s+of\s+Insurance\s*:\s*From\s*([0-9/]+)[\s\S]{0,40}?To\s*([0-9/]+)/i,
  );
  const startDate = normalizeDate(policyPeriod?.[1] || "");
  const expiryDate = normalizeDate(policyPeriod?.[2] || "");
  const policyholderName = cleanPersonName(
    matchGroup(schedule, /Policyholder\s+Name\s*:\s*(.+?)(?=Policy\s+Type)/i),
  );
  const insuredMembers = extractInsuredMembers(text, startDate);
  const primaryInsured = insuredMembers[0]?.name || policyholderName;
  const nominee = extractNominee(text, insuredMembers);
  const intermediary = extractIntermediary(text);
  const totalPremium = formatAmount(matchGroup(text, /received\s*an\s*amount\s*of\s*[^0-9]{0,3}([0-9,]+)/i));
  const sumInsured = formatAmount(matchGroup(text, /Sum\s+Insured\s+opted\s*:\s*([0-9,]+)/i));
  const productName = matchGroup(
    text,
    /Insured\s+Person[’']s\s+Details\s+and\s+Sum\s+Insured\s*[-–]\s*([^\n]+)/i,
  );
  const customerId = matchGroup(schedule, /Customer\s+Id\s*:\s*(\d+)/i);
  const paymentReference = matchGroup(text, /Instrument\s+details\s*([A-Z]+\d+)(?=Date|\s|$)/i);
  const bankName = matchGroup(text, /Bank\s+Name\s*([A-Z0-9 ]+?)(?=Processing\s+Centre|\n)/i);

  return {
    productName: productName || "Optima Secure",
    productUin: matchGroup(text, /UIN\s*:\s*(HDFHLIP\d{5}[A-Z]\d{6})/i),
    policyNumber:
      matchGroup(schedule, /Policy\s+Number\s*:\s*([0-9 ]+?)(?=Issuance\s+Date)/i).replace(/\s+/g, "") ||
      result.policyNumber,
    policyType: matchGroup(schedule, /Policy\s+Type\s*:\s*([^\n]+)/i) || result.policyType,
    newOrRenewal: /Renewal\s*:\s*YES/i.test(schedule) ? "Renewal" : "New",
    policyTenure: startDate && expiryDate ? "1 Year" : result.policyTenure,
    startDate: startDate || result.startDate,
    expiryDate: expiryDate || result.expiryDate,
    policyStartDate: startDate || result.startDate,
    policyEndDate: expiryDate || result.expiryDate,
    proposerName: policyholderName || result.proposerName,
    customerName: policyholderName || result.customerName,
    insuredName: primaryInsured || result.insuredName,
    contactPerson: policyholderName || result.contactPerson,
    contactNumber: "",
    mobileNumber: "",
    customerMobile: "",
    email: "",
    customerEmail: "",
    mailingAddress: extractMailingAddress(schedule) || result.mailingAddress,
    communicationAddress: extractMailingAddress(schedule) || result.communicationAddress,
    policyholderEmailMasked: matchGroup(schedule, /Email\s+ID\s*:\s*([^\n]+)/i),
    policyholderMobileMasked: matchGroup(schedule, /Contact\s+No\s*:\s*([0-9Xx*]+)/i),
    invoiceNumber: matchGroup(schedule, /Invoice\s+No\.\s*:\s*([0-9]+)/i),
    issuanceDate:
      normalizeDate(matchGroup(schedule, /Issuance\s+Date\s*:\s*([0-9/]+)/i)) || result.issuanceDate,
    customerId: customerId || result.customerId,
    sumInsured: sumInsured || result.sumInsured,
    basicPremium: totalPremium || result.basicPremium,
    netPremium: totalPremium || result.netPremium,
    taxAmount: "0.00",
    gstAmount: "0.00",
    totalPremium: totalPremium || result.totalPremium,
    premiumIncludingGst: totalPremium || result.premiumIncludingGst,
    premium: totalPremium || result.premium,
    previousPolicyNumber:
      matchGroup(schedule, /Previous\s+Policy\s*:\s*([0-9]+)/i) || result.previousPolicyNumber,
    nomineeName: nominee.name || result.nomineeName,
    nomineeRelationship: nominee.relationship || result.nomineeRelationship,
    insuredMembers,
    numberOfInsuredMembers: insuredMembers.length,
    agentName: intermediary.name || result.agentName,
    agentCode: intermediary.code || result.agentCode,
    agentMobile: intermediary.mobile || result.agentMobile,
    paymentReference: paymentReference || result.paymentReference,
    bankName: cleanHdfcValue(bankName) || result.bankName,
    servicingBranchAddress: matchGroup(text, /Branch\s*:\s*([^\n]+)/i) || result.servicingBranchAddress,
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
    policyCoverType: "",
    cscContactNumber: "",
    confidenceScore: 0.98,
    extractionMethod: "scoped_training",
    extractionQuality: {
      quality: "ready_for_review",
      schemaName: "HDFC ERGO Optima Secure Health training",
      schemaVersion: 1,
      schemaMatch: 1,
      understandingConfidence: 1,
      schemaLoadError: "",
      warnings: [],
    },
    policyUnderstanding: {},
    schemaExtraction: {},
    fieldConfidence: {},
    extractionTrainingVersion: "HDFC_ERGO_HEALTH_OPTIMA_SECURE_V1",
  };
}

module.exports = { scope, matches, train };
