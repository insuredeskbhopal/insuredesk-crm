const pdf = require("pdf-parse");

async function extractPolicyFromPdf(buffer, sourceFile = "") {
  const parsed = await pdf(buffer);
  return extractPolicyFromText(parsed.text || "", sourceFile);
}

function extractPolicyFromText(text, sourceFile = "") {
  const sourceText = cleanText(text || "");
  const insuredName =
    matchGroup(sourceText, /Name of the Insured\s*([\s\S]+?)\s*Policy No/i) ||
    matchGroup(sourceText, /following insured:\s*([\s\S]+?)\s*PROP/i);
  const policyNumber =
    matchGroup(sourceText, /Policy No\s*([A-Z0-9/.-]+)/i) ||
    matchGroup(sourceText, /Policy Number\s*([A-Z0-9/.-]+)/i) ||
    matchGroup(sourceText, /attached herewith\s*([A-Z0-9/.-]{10,})\s*which has been issued/i);
  const policyType =
    matchGroup(sourceText, /(MSME Suraksha Kavach Package Policy\s*-\s*Advance)/i) ||
    matchGroup(sourceText, /(Policy Schedule.*?)(?:Name of the Insured|Mailing Address)/i);
  const issuedAt = matchGroup(sourceText, /Issued at\s*([A-Z][A-Z\s]+?)(?:Premises to be Insured|Premium|Hypothecation|Intermediary Details|$)/i);
  const startDate = matchGroup(sourceText, /From:\s*\d{2}:\d{2}\s*Hours of\s*(\d{2}\/\d{2}\/\d{4})/i);
  const expiryDate = matchGroup(sourceText, /To:\s*Midnight of\s*(\d{2}\/\d{2}\/\d{4})/i);
  const duration = buildDuration(startDate, expiryDate);
  const riskLocation =
    matchGroup(sourceText, /Premises to be Insured\s*([\s\S]+?)\s*Premium\s*\(`/i) ||
    matchGroup(sourceText, /Risk Location\s*[–-]?\s*:\s*([\s\S]+?)\s*Description of Block/i);
  const businessDescription =
    matchGroup(sourceText, /Business of the Insured\s*([\s\S]+?)\s*Issued at/i) ||
    matchGroup(sourceText, /Description of Block\s*:?\s*([\s\S]+?)\s*Perils Covered/i);
  const premium =
    normalizeAmount(matchGroup(sourceText, /Total Premium inclusive Tax\s*\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i)) ||
    normalizeAmount(matchGroup(sourceText, /Total Premium inclusive Tax\s*\(\s*`\s*\)\s*([0-9,]+)/i)) ||
    normalizeAmount(matchGroup(sourceText, /Premium\s*\(\s*`\s*\)\s*\(Including GST\)\s*\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i)) ||
    normalizeAmount(matchGroup(sourceText, /Premium\s*\(`\)\s*\(Including GST\)\(`\)\s*([0-9,]+\.\d{2})/i));
  const sumInsured =
    normalizeAmount(matchGroup(sourceText, /MSME Suraksha Kavach\s*-\s*Contents\s*(?:Fire Basic Covers\s*)?\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i)) ||
    normalizeAmount(matchGroup(sourceText, /1\s*MSME Suraksha Kavach\s*-\s*Contents\s*\(`\)\s*([0-9,]+\.\d{2})/i)) ||
    normalizeAmount(matchGroup(sourceText, /MSME Suraksha Kavach\s*-\s*Contents[\s\S]{0,60}?\(\s*`\s*\)\s*([0-9,]+\.\d{2})/i));
  const district = extractLocationPart(sourceText, riskLocation, "district");
  const tehsil = extractLocationPart(sourceText, riskLocation, "tehsil");
  const contactNumber =
    matchGroup(sourceText, /Agency\/Broker Mobile No\s*\S*\s*([6-9]\d{9})/i) ||
    matchGroup(sourceText, /Agency\/Broker CodeAgency\/Broker NameAgency\/Broker Mobile NoAgency\/Broker Email-ID\s*\d+\s*[A-Z0-9]*\s*([6-9]\d{9})/i) ||
    matchGroup(sourceText, /Agency\/Broker Mobile No.*?([6-9]\d{9})/i) ||
    matchGroup(sourceText, /\b([6-9]\d{9})\b/);
  const contactPerson =
    matchGroup(sourceText, /PROP\.?\s+([A-Z][A-Z\s]+?)(?:,|\s+KHASRA|\s+VILLAGE)/i) ||
    matchGroup(sourceText, /Contact person name\s*[:-]?\s*([A-Z][A-Z\s]+)/i);
  const insuranceCompany =
    matchGroup(sourceText, /(ICICI Lombard General Insurance Company Limited)/i) ||
    matchGroup(sourceText, /(ICICI Lombard General Insurance Company Ltd)/i);
  const pptMpwlc = matchGroup(sourceText, /\b(MPWLC)\b/i);
  const occupancy = businessDescription;
  const validIn = issuedAt;
  const groupName = deriveGroupName(sourceText, sourceFile, insuredName, pptMpwlc);

  return {
    sourceFile: sourceFile || "Untitled.pdf",
    sourceText,
    status: "saved",
    srNo: "",
    insuredName,
    contactNumber,
    contactPerson,
    groupName,
    policyNumber,
    policyType,
    sumInsured,
    premium,
    startDate,
    expiryDate,
    duration,
    riskLocation,
    district,
    tehsil,
    insuranceCompany,
    description: businessDescription,
    pptMpwlc,
    occupancy,
    validIn
  };
}

function cleanText(text) {
  return text
    .replace(/\r/g, " ")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function matchGroup(text, pattern) {
  const match = text.match(pattern);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function normalizeAmount(value) {
  if (!value) return "";
  const cleaned = value.replace(/\s+/g, "");
  return cleaned.includes(".") ? cleaned : `${cleaned}.00`;
}

function buildDuration(startDate, expiryDate) {
  if (!startDate || !expiryDate) return "";
  const [sd, sm, sy] = startDate.split("/").map(Number);
  const [ed, em, ey] = expiryDate.split("/").map(Number);
  if (!sd || !sm || !sy || !ed || !em || !ey) return "";
  let months = (ey - sy) * 12 + (em - sm);
  if (months <= 0) months = 1;
  return `${months} month${months === 1 ? "" : "s"}`;
}

function extractLocationPart(text, riskLocation, kind) {
  const haystack = `${riskLocation || ""} ${text}`;
  if (kind === "district") {
    return (
      matchGroup(haystack, /DIST(?:RICT|ICT)\s+([A-Z][A-Z\s]+)/i) ||
      matchGroup(haystack, /MADHYA PRADESH[-\s]+([A-Z][A-Z\s]+)[-\s]+\d{6}/i)
    );
  }

  return matchGroup(haystack, /TEHSIL\s+([A-Z][A-Z\s]+)/i);
}

function deriveGroupName(text, sourceFile, insuredName, pptMpwlc) {
  if (pptMpwlc) return pptMpwlc;

  const filenameGroup = matchGroup(sourceFile, /\b([A-Z]{3,})\b/i);
  if (filenameGroup && ["PDF", "POLICY"].indexOf(filenameGroup.toUpperCase()) === -1) {
    return filenameGroup.toUpperCase();
  }

  return matchGroup(insuredName || text, /\b([A-Z]{3,})\b/i);
}

module.exports = {
  extractPolicyFromPdf,
  extractPolicyFromText
};
