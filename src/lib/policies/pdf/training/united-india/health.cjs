const { normalizeAmount, sumAmounts } = require("../../utils/amounts.cjs");
const { cleanHdfcValue, sliceText } = require("../../utils/text.cjs");

const scope = { insurer: "united-india", category: "health" };

function matches({ text = "" }) {
  const header = text.slice(0, 4000);
  return (
    /United\s+India\s+Insurance/i.test(text) &&
    /INDIVIDUAL\s+HEALTH\s+INSURANCE|HEALTH\s+POLICY\s+SCHEDULE|UIIHLIP/i.test(header) &&
    !/Private\s+Car|Two\s+Wheeler|Goods\s+Carrying|Commercial\s+Vehicle|Registration\s+No/i.test(header)
  );
}

function normalizeDate(value = "") {
  const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return match ? `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}` : "";
}

function formatAmount(value = "") {
  return value ? sumAmounts(value) : "";
}

function calculateAge(dateOfBirth = "", effectiveDate = "") {
  if (!dateOfBirth) return "";
  const [birthDay, birthMonth, birthYear] = dateOfBirth.split("/").map(Number);
  const [effectiveDay, effectiveMonth, effectiveYear] = (effectiveDate || "").split("/").map(Number);
  if (!birthYear) return "";
  const refYear = effectiveYear || new Date().getFullYear();
  const refMonth = effectiveMonth || (new Date().getMonth() + 1);
  const refDay = effectiveDay || new Date().getDate();

  const beforeBirthday =
    refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay);
  return String(refYear - birthYear - (beforeBirthday ? 1 : 0));
}

function cleanPersonName(value = "") {
  const lastLine = String(value).split("\n").pop() || "";
  return cleanHdfcValue(lastLine)
    .replace(/^(?:Mr|Mrs|Ms|Miss|Dr|Shri|Smt|MR|MRS|MS|MISS|DR|SHRI|SMT)\.?\s+/i, "")
    .trim();
}

function extractInsuredMembers(text = "", policyStartDate = "") {
  const membersSection = sliceText(
    text,
    /DETAILS\s+OF\s+INSURED\s+PERSONS/i,
    /SUMMARY\s+OF\s+COVERAGE/i,
  );

  const coverageSection = sliceText(
    text,
    /SUMMARY\s+OF\s+COVERAGE/i,
    /PREMIUM\s+BREAK\s+DOWN/i,
  );

  const members = [];

  const memberBlockRegex = /([A-Za-z\s.]+?)\n+(\d{2}\/\d{2}\/\d{4})\s*&\s*\n*(\d+)\s*\/\s*([MF])\s*\n*(Self|Spouse|Son|Daughter|Father|Mother|Brother|Sister|Other|[A-Za-z]+)/gi;

  let match;
  while ((match = memberBlockRegex.exec(membersSection)) !== null) {
    const rawName = match[1].trim();
    const dob = match[2].trim();
    const printedAge = match[3].trim();
    const genderCode = match[4].toUpperCase();
    const rawRelation = match[5].trim();

    const name = cleanPersonName(rawName);
    if (!name || /Insured\s+Name|DOB|ABHA/i.test(name)) continue;

    // Autocount age with DOB against policyStartDate
    const autoAge = calculateAge(dob, policyStartDate) || printedAge;
    const gender = genderCode === "F" ? "Female" : "Male";

    let relationship = "Member";
    if (/Self/i.test(rawRelation)) relationship = "Self";
    else if (/Spouse|Wife|Husband/i.test(rawRelation)) relationship = "Spouse";
    else if (/Son/i.test(rawRelation)) relationship = "Son";
    else if (/Daughter/i.test(rawRelation)) relationship = "Daughter";
    else if (/Father/i.test(rawRelation)) relationship = "Father";
    else if (/Mother/i.test(rawRelation)) relationship = "Mother";

    members.push({
      name,
      dateOfBirth: dob,
      age: autoAge,
      gender,
      relationship,
    });
  }

  // Fallback if structured block is not matched
  if (members.length === 0) {
    const nameMatches = membersSection.match(/(?:SHRI|SMT|MR|MRS|MS)\s+[A-Z\s]+/gi) || [];
    const dobMatches = membersSection.match(/(\d{2}\/\d{2}\/\d{4})/g) || [];

    nameMatches.forEach((nm, idx) => {
      const cleanNm = cleanPersonName(nm);
      const dob = dobMatches[idx] || "";
      if (cleanNm && !members.some((m) => m.name === cleanNm)) {
        members.push({
          name: cleanNm,
          dateOfBirth: dob,
          age: calculateAge(dob, policyStartDate),
          gender: /SMT|MRS|MS/i.test(nm) ? "Female" : "Male",
          relationship: idx === 0 ? "Self" : "Member",
        });
      }
    });
  }

  // Extract Sum Insured and Plan per member from SUMMARY OF COVERAGE
  const coverageLines = coverageSection.split("\n");
  coverageLines.forEach((line) => {
    const covMatch = line.trim().match(/^([A-Za-z\s.]+?)(Gold|Platinum|Silver|Bronze|Base|Diamond|Super)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)/i);
    if (covMatch) {
      const covName = cleanPersonName(covMatch[1]);
      const plan = covMatch[2] || "";
      const memberSi = normalizeAmount(covMatch[3]);
      const targetMember = members.find(
        (m) =>
          m.name.toLowerCase() === covName.toLowerCase() ||
          covName.toLowerCase().includes(m.name.toLowerCase()) ||
          m.name.toLowerCase().includes(covName.toLowerCase()),
      );
      if (targetMember) {
        targetMember.plan = plan;
        targetMember.sumInsured = memberSi ? sumAmounts(memberSi) : "";
      }
    }
  });

  return members;
}

function train({ text = "", result = {} }) {
  const policyNumMatch = text.match(/YOUR\s+POLICY\s+No\.?\s*([A-Z0-9]+)/i) ||
    text.match(/POLICY\s+NO\.?:\s*([A-Z0-9]+)/i) ||
    text.match(/Policy\s+No\.?:\s*([A-Z0-9]+)/i);

  const policyNumber = policyNumMatch ? policyNumMatch[1].trim() : result.policyNumber;

  const holderMatch = text.match(/Policyholder\s+Name\s*:\s*([^\n]+)/i) ||
    text.match(/Dear\s+((?:MR|MRS|MS|MISS|SHRI|SMT)\s+[A-Z\s]+?)(?=\n|Welcome|$)/i) ||
    text.match(/This\s+is\s+to\s+certify\s+that\s+((?:MR|MRS|MS|MISS|SHRI|SMT)\s+[A-Z\s]+?)\s+has\s+paid/i);

  const rawHolder = holderMatch ? holderMatch[1].trim() : "";
  const cleanHolder = rawHolder ? cleanPersonName(rawHolder) : result.customerName || result.insuredName;

  const periodMatch = text.match(/Period\s+of\s+Insurance\s*:\s*From\s*(?:\d{2}:\d{2}\s*hrs\s*(?:of|On)\s*)?(\d{2}\/\d{2}\/\d{4})[\s\S]{0,40}?To\s*(?:Midnight\s*(?:of|on)\s*)?(\d{2}\/\d{2}\/\d{4})/i) ||
    text.match(/From\s*(?:\d{2}:\d{2}\s*hrs\s*(?:of|On)\s*)?(\d{2}\/\d{2}\/\d{4})[\s\S]{0,30}?To\s*(?:Midnight\s*(?:of|on)\s*)?(\d{2}\/\d{2}\/\d{4})/i);

  const policyStartDate = periodMatch ? normalizeDate(periodMatch[1]) : result.policyStartDate || result.startDate;
  const policyEndDate = periodMatch ? normalizeDate(periodMatch[2]) : result.policyEndDate || result.expiryDate;

  const finalPremMatch = text.match(/(?:^|\n)\s*Premium\s*\n*:\s*\n*([0-9,.]+)/i) ||
    text.match(/Payment\s+Details[\s\S]{0,400}?Premium\s*:\s*([0-9,.]+)/i) ||
    text.match(/Total\s*\n+:\s*\n+([0-9,.]+)/i) ||
    text.match(/Total\s*:\s*([0-9,.]+)/i) ||
    text.match(/has\s+paid\s+([0-9,.]+)\s*\(/i);

  const basicPremMatch = text.match(/Total\s+Basic\s+Premium\s*\n*:\s*\n*([0-9,.]+)/i);

  const grossPremium = finalPremMatch ? normalizeAmount(finalPremMatch[1]) : result.totalPremium || result.grossPremium;
  const basicPremium = basicPremMatch ? normalizeAmount(basicPremMatch[1]) : grossPremium;

  const members = extractInsuredMembers(text, policyStartDate);

  // Calculate total Sum Insured from members or fallback
  const sumInsFromMembers = members.reduce(
    (sum, m) => sum + (Number((m.sumInsured || "0").replace(/,/g, "")) || 0),
    0,
  );

  let sumInsured = (members[0]?.sumInsured) || (sumInsFromMembers > 0 ? String(sumInsFromMembers) : "");
  if (!sumInsured) {
    const sumInsMatch = text.match(/Gold\s*([0-9,.]+)/i) ||
      text.match(/Platinum\s*([0-9,.]+)/i) ||
      text.match(/Sum\s+Insured\s*\(\)\s*([0-9,.]+)/i) ||
      text.match(/Sum\s+Insured\s*:\s*([0-9,.]+)/i);
    sumInsured = sumInsMatch ? normalizeAmount(sumInsMatch[1]) : result.sumInsured;
  }

  const primaryPlan = (members.find((m) => m.plan)?.plan) || "";
  const productName = primaryPlan
    ? `Individual Health Insurance Policy (${primaryPlan})`
    : "Individual Health Insurance Policy";

  return {
    policyType: "Individual Health Insurance",
    productName,
    policyNumber: policyNumber || result.policyNumber,
    insuredName: cleanHolder || result.insuredName,
    customerName: cleanHolder || result.customerName,
    proposerName: cleanHolder || result.proposerName,
    contactPerson: cleanHolder || result.contactPerson,
    policyStartDate,
    startDate: policyStartDate,
    policyEndDate,
    expiryDate: policyEndDate,
    totalPremium: grossPremium ? formatAmount(grossPremium) : result.totalPremium,
    grossPremium: grossPremium ? formatAmount(grossPremium) : result.grossPremium,
    premium: grossPremium ? formatAmount(grossPremium) : result.premium,
    premiumIncludingGst: grossPremium ? formatAmount(grossPremium) : result.premiumIncludingGst,
    netPremium: basicPremium ? formatAmount(basicPremium) : grossPremium,
    basicPremium: basicPremium ? formatAmount(basicPremium) : grossPremium,
    sumInsured: sumInsured ? formatAmount(sumInsured) : result.sumInsured,
    totalSumInsured: sumInsured ? formatAmount(sumInsured) : result.totalSumInsured,
    insuredMembers: members.length > 0 ? members : (cleanHolder ? [{ name: cleanHolder }] : result.insuredMembers || []),
    numberOfInsuredMembers: members.length || 1,
    extractionTrainingVersion: "UNITED_INDIA_HEALTH_V1",
  };
}

module.exports = { scope, matches, train, calculateAge };
