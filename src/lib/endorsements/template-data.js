export const INSURER_TEMPLATES = [
  { id: "icici-lombard", label: "ICICI Lombard", matches: ["icici", "icici lombard"] },
  { id: "tata-aig", label: "Tata AIG", matches: ["tata", "tata aig"] },
];

export const ENDORSEMENT_TYPE_CONFIG = {
  "Increase in Sum Insured": {
    requiredNewValues: ["sumInsured"],
    subject: "Sum Insured",
    action: "increased",
  },
  "Decrease in Sum Insured": {
    requiredNewValues: ["sumInsured"],
    subject: "Sum Insured",
    action: "decreased",
    premiumMode: "refund",
  },
  "Change in Address": {
    requiredNewValues: ["address"],
    subject: "Mailing Address",
    action: "changed",
  },
  "Change in Hypothecation / Bank Details": {
    requiredNewValues: ["bankDetails"],
    subject: "Financier Details",
    action: "changed",
  },
  "Correction in Insured Name": {
    requiredNewValues: ["value"],
    subject: "Insured Name",
    action: "corrected",
  },
  "Change in Stock Description": {
    requiredNewValues: ["value"],
    subject: "Stock Value",
    action: "changed",
  },
  "Change in Situation / Location": {
    requiredNewValues: ["location"],
    subject: "Risk Location",
    action: "changed",
  },
  "Addition of Warehouse / Property": {
    requiredNewValues: ["propertyDetails"],
    subject: "Warehouse / Property",
    action: "added",
  },
  "Deletion of Warehouse / Property": {
    requiredNewValues: ["propertyDetails"],
    subject: "Warehouse / Property",
    action: "deleted",
    premiumMode: "refund",
  },
  "Change in Occupancy": {
    requiredNewValues: ["value"],
    subject: "Occupancy",
    action: "changed",
  },
  "Correction in Policy Details": {
    requiredNewValues: ["value"],
    subject: "Policy Details",
    action: "corrected",
  },
};

export function resolveInsurerTemplateId(company = "") {
  const normalized = normalizeText(company);
  if (!normalized) return "";
  return (
    INSURER_TEMPLATES.find((template) => template.matches.some((item) => normalized.includes(item)))?.id || ""
  );
}

export function buildEndorsementScheduleData(form = {}) {
  const raw = form.extractedPolicyData?.raw || form.extractedPolicyData || {};
  const oldValues = form.oldValues || {};
  const newValues = form.newValues || {};
  const effectiveDate = form.effectiveDate || form.effectiveFrom;
  const data = {
    insurerTemplateId: resolveInsurerTemplateId(form.insuranceCompany),
    insurerName: form.insuranceCompany || raw.insuranceCompany || "ICICI Lombard",
    policyTitle:
      form.policyType || raw.productName || raw.policyType || "MSME Suraksha Kavach Package Policy - Advance",
    insuredName: form.insuredName || raw.insuredName || raw.customerName || "",
    mailingAddress:
      form.mailingAddress || raw.mailingAddress || raw.communicationAddress || form.address || "",
    policyNo: form.policyNo || raw.policyNumber || raw.policyNo || "",
    policyStartDateText: formatDisplayDate(form.policyStartDate || raw.policyStartDate || raw.startDate),
    policyExpiryDateText: formatDisplayDate(form.policyExpiryDate || raw.policyEndDate || raw.expiryDate),
    endorsementNo: form.endorsementNo || "",
    effectiveDateText: formatDisplayDate(effectiveDate),
    effectiveTimeText: form.effectiveTime || "00:00 Hrs",
    dateOfIssueText: formatDisplayDate(form.dateOfIssue || form.endorsementDate),
    issuedOffice: form.issuedOffice || raw.issuedAt || "",
    financer: buildFinancer(raw, form.financerDetails),
    endorsementType: form.endorsementType || "Other Endorsement",
    oldValues,
    newValues,
    premium: form.premium || raw.premiumIncludingGst || raw.totalPremium || raw.premium || "",
    effectiveDateWordingText: formatSlashDate(effectiveDate),
    gstin: raw.gstin || raw.gstIn || raw.gstNumber || "",
    gstAddress: raw.gstAddress || raw.gstinAddress || raw.billingAddress || "",
    hsnSacCode: raw.hsnSacCode || raw.hsn || raw.sacCode || "",
    finalReviewedData: buildFinalReviewedData(form),
    rawExtractedData: raw,
  };

  data.endorsementWording =
    form.endorsementWording || form.description || form.newValues?.reason || generateEndorsementWording(data);
  return data;
}

export function buildFinalReviewedData(form = {}) {
  return {
    policyNo: form.policyNo || "",
    insuredName: form.insuredName || "",
    customerName: form.customerName || "",
    mailingAddress: form.mailingAddress || "",
    insuranceCompany: form.insuranceCompany || "",
    policyType: form.policyType || "",
    policyStartDate: form.policyStartDate || "",
    policyExpiryDate: form.policyExpiryDate || "",
    sumInsured: form.sumInsured || "",
    address: form.address || "",
    warehouseDetails: form.warehouseDetails || "",
    endorsementType: form.endorsementType || "",
    endorsementNo: form.endorsementNo || "",
    effectiveDate: form.effectiveDate || form.effectiveFrom || "",
    dateOfIssue: form.dateOfIssue || form.endorsementDate || "",
    issuedOffice: form.issuedOffice || "",
    financerDetails: form.financerDetails || "",
    premium: form.premium || "",
    oldValues: form.oldValues || {},
    newValues: form.newValues || {},
    description: form.description || "",
  };
}

export function getMissingScheduleFields(obj = {}) {
  const scheduleData = obj.insurerName !== undefined ? obj : buildEndorsementScheduleData(obj);
  const checks = [
    ["Insurance Company", scheduleData.insurerName],
    ["Insured Name", scheduleData.insuredName],
    ["Mailing Address", scheduleData.mailingAddress],
    ["Policy Number", scheduleData.policyNo],
    ["Period of Insurance", scheduleData.policyStartDateText && scheduleData.policyExpiryDateText],
    ["Endorsement Number", scheduleData.endorsementNo],
    ["Endorsement Effective Date", scheduleData.effectiveDateText],
    ["Date of Issue", scheduleData.dateOfIssueText],
    ["Issued Office", scheduleData.issuedOffice],
    ["Endorsement Wording", scheduleData.endorsementWording],
  ];
  const config = ENDORSEMENT_TYPE_CONFIG[scheduleData.endorsementType] || {};
  (config.requiredNewValues || []).forEach((key) => {
    checks.push([`New ${labelize(key)}`, scheduleData.newValues?.[key]]);
  });
  return checks.filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
}

export function generateEndorsementWording(data) {
  const config = ENDORSEMENT_TYPE_CONFIG[data.endorsementType] || {};
  const endorsementSubject = config.subject || subjectFromType(data.endorsementType);
  const changeAction = config.action || actionFromType(data.endorsementType);
  const changeSummary = buildChangeSummary(data, endorsementSubject, changeAction);
  return [
    `At the request of the insured, it is hereby noted and agreed that with effect from ${valueOrDash(data.effectiveDateWordingText || data.effectiveDateText)}, the ${endorsementSubject} under the policy has been ${changeAction}.`,
    `Accordingly, ${changeSummary}.`,
    `${premiumSentence(data, config)}.`,
    "All other terms, conditions, clauses, warranties and exceptions of the policy remain unaltered.",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatObject(value = {}) {
  return Object.entries(value)
    .filter(([, val]) => String(val || "").trim())
    .map(([key, val]) => `${labelize(key)}: ${val}`)
    .join("; ");
}

function buildFinancer(raw, financerDetails) {
  const text = financerDetails || raw.hypothecationDetails || raw.financerName || "";
  return {
    name: raw.financerName || text || "",
    branch: raw.financerBranch || text || "",
    agreement: raw.financerAgreement || raw.agreementType || (text ? "Hypothecation" : ""),
  };
}

function premiumSentence(data, config = {}) {
  const premiumAmount = normalizePremiumAmount(data.premium);
  if (!premiumAmount || premiumAmount === "0") return "No additional premium is involved";
  const text = String(data.premium || "");
  const isRefund =
    config.premiumMode === "refund" || /^-/.test(text.trim()) || /refund|refundable/i.test(text);
  if (isRefund) return `A refund premium of Rs. ${premiumAmount}/- has been allowed`;
  return `An additional premium of Rs. ${premiumAmount}/- has been charged`;
}

function formatDisplayDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

function formatSlashDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
}

function buildChangeSummary(data, subject, action) {
  const oldValues = data.oldValues || {};
  const newValues = data.newValues || {};
  const keys = Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]))
    .filter((key) => !["reason", "differenceAmount", "premiumImpact", "premiumAmount"].includes(key))
    .filter((key) => String(oldValues[key] || newValues[key] || "").trim());

  const changes = keys
    .map((key) => changeSentence(key, oldValues[key], newValues[key], subject, action))
    .filter(Boolean);
  if (changes.length) return joinWithAnd(changes);

  const reason = String(newValues.reason || data.rawExtractedData?.description || "").trim();
  if (reason) return reason.replace(/\s+/g, " ");

  return `the ${subject} has been revised as per the insured's request`;
}

function changeSentence(key, oldValue, newValue, subject, action) {
  const label = fieldSubjectLabel(key, subject);
  const oldText = String(oldValue || "").trim();
  const newText = String(newValue || "").trim();
  if (oldText && newText) return `the ${label} has been revised from ${oldText} to ${newText}`;
  if (newText && action === "added") return `the ${label} has been added as ${newText}`;
  if (oldText && action === "deleted") return `the ${label} has been deleted from ${oldText}`;
  if (newText) return `the ${label} has been revised to ${newText}`;
  if (oldText) return `the ${label} has been revised from ${oldText}`;
  return "";
}

function fieldSubjectLabel(key, fallback) {
  const labels = {
    address: "Mailing Address",
    bankDetails: "Financier Details",
    location: "Risk Location",
    propertyDetails: "Warehouse / Property Details",
    sumInsured: "Sum Insured",
    value: fallback || "Policy Details",
  };
  return labels[key] || labelize(key);
}

function joinWithAnd(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function subjectFromType(type = "") {
  if (/sum insured/i.test(type)) return "Sum Insured";
  if (/location|situation/i.test(type)) return "Risk Location";
  if (/hypothecation|bank|financ/i.test(type)) return "Financier Details";
  if (/insured name/i.test(type)) return "Insured Name";
  if (/stock/i.test(type)) return "Stock Value";
  if (/warehouse|property/i.test(type)) return "Warehouse / Property";
  if (/occupancy/i.test(type)) return "Occupancy";
  return "Policy Details";
}

function actionFromType(type = "") {
  if (/increase/i.test(type)) return "increased";
  if (/decrease/i.test(type)) return "decreased";
  if (/correction|correct/i.test(type)) return "corrected";
  if (/addition|add/i.test(type)) return "added";
  if (/deletion|delete/i.test(type)) return "deleted";
  if (/change/i.test(type)) return "changed";
  return "revised";
}

function normalizePremiumAmount(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const cleaned = text
    .replace(/refund|refundable|rs\.?|inr|\/-|,/gi, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const normalized = cleaned.replace(/^-/, "");
  return normalized || "";
}

function labelize(value) {
  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function valueOrDash(value) {
  return String(value || "").trim() || "-";
}
