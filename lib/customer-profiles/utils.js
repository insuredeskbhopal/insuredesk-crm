export const CUSTOMER_PROFILE_STATUS_OPTIONS = ["New Lead", "Follow-up Required", "Interested", "Not Interested", "Converted", "Lost"];
export const CUSTOMER_PROFILE_TYPE_OPTIONS = ["Existing", "New"];
export const CUSTOMER_PROFILE_FOLLOW_UP_OUTCOMES = ["Interested", "Call Back Later", "Not Interested", "Converted", "Wrong Number", "Not Reachable"];

export function sanitizeCustomerProfilePayload(payload = {}) {
  return {
    name: asText(payload.name, 220),
    phone: normalizePhone(payload.phone),
    alternatePhone: normalizePhone(payload.alternatePhone),
    email: asText(payload.email, 180),
    address: asText(payload.address, 2000),
    city: asText(payload.city, 120),
    state: asText(payload.state, 120),
    occupation: asText(payload.occupation, 180),
    businessType: asText(payload.businessType, 180),
    contactPersonName: asText(payload.contactPersonName, 180),
    customerType: CUSTOMER_PROFILE_TYPE_OPTIONS.includes(payload.customerType) ? payload.customerType : "New",
    assignedTo: asText(payload.assignedTo, 180),
    referenceSource: asText(payload.referenceSource, 180),
    sourcePolicyId: asUuidText(payload.sourcePolicyId),
    sourcePolicyNumber: asText(payload.sourcePolicyNumber, 120),
    sourcePolicyType: asText(payload.sourcePolicyType, 180),
    sourceCompany: asText(payload.sourceCompany, 180),
    selectedLOBs: Array.isArray(payload.selectedLOBs) ? payload.selectedLOBs.map((item) => asText(item, 80)).filter(Boolean) : [],
    lobDetails: payload.lobDetails && typeof payload.lobDetails === "object" ? JSON.parse(JSON.stringify(payload.lobDetails)) : {},
    status: CUSTOMER_PROFILE_STATUS_OPTIONS.includes(payload.status) ? payload.status : "New Lead",
    followUpDate: payload.followUpDate ? new Date(payload.followUpDate) : null,
    lastFollowUpDate: payload.lastFollowUpDate ? new Date(payload.lastFollowUpDate) : null,
    nextFollowUpDate: payload.nextFollowUpDate ? new Date(payload.nextFollowUpDate) : null,
    followUpRemark: asText(payload.followUpRemark, 2000),
    followUpOutcome: CUSTOMER_PROFILE_FOLLOW_UP_OUTCOMES.includes(payload.followUpOutcome) ? payload.followUpOutcome : "",
    remarks: asText(payload.remarks, 2000)
  };
}

export function serializeCustomerProfile(profile) {
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    alternatePhone: profile.alternatePhone || "",
    email: profile.email || "",
    address: profile.address || "",
    city: profile.city || "",
    state: profile.state || "",
    occupation: profile.occupation || "",
    businessType: profile.businessType || "",
    contactPersonName: profile.contactPersonName || "",
    customerType: profile.customerType,
    assignedTo: profile.assignedTo || profile.createdBy?.name || profile.createdBy?.email || "",
    referenceSource: profile.referenceSource || "",
    sourcePolicyId: profile.sourcePolicyId || "",
    sourcePolicyNumber: profile.sourcePolicyNumber || "",
    sourcePolicyType: profile.sourcePolicyType || "",
    sourceCompany: profile.sourceCompany || "",
    selectedLOBs: profile.selectedLOBs || [],
    lobDetails: profile.lobDetails || {},
    status: profile.status,
    followUpDate: profile.followUpDate || null,
    lastFollowUpDate: profile.lastFollowUpDate || null,
    nextFollowUpDate: profile.nextFollowUpDate || null,
    followUpRemark: profile.followUpRemark || "",
    followUpOutcome: profile.followUpOutcome || "",
    remarks: profile.remarks || "",
    convertedToCustomer: profile.convertedToCustomer,
    convertedPolicyId: profile.convertedPolicyId || null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    createdBy: profile.createdBy?.name || profile.createdBy?.email || "",
    updatedBy: profile.updatedBy?.name || profile.updatedBy?.email || ""
  };
}

export function normalizeProfilePhone(value) {
  return normalizePhone(value);
}

export function normalizeIndianPhone(value) {
  if (!value) return "";

  let digits = String(value).replace(/\D/g, "");

  // Remove leading 00 country prefix: 0091XXXXXXXXXX
  if (digits.startsWith("0091") && digits.length === 14) {
    digits = digits.slice(4);
  }

  // Remove India country prefix: 91XXXXXXXXXX
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }

  // Remove leading zero: 0XXXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Accept only valid Indian mobile numbers
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return "";
  }

  return digits;
}

export function formatPhoneForWhatsapp(value) {
  const phone = normalizeIndianPhone(value);
  return phone ? `91${phone}` : "";
}

function asText(value, limit) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function asUuidText(value) {
  const text = String(value || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

export function normalizePhone(value) {
  return normalizeIndianPhone(value) || String(value || "").replace(/\D/g, "").slice(0, 10);
}
