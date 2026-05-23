const TEXT_LIMIT = 2000;

export function sanitizeRecordPayload(payload = {}) {
  return {
    srNo: asText(payload.srNo, 80),
    sourceFile: asText(payload.sourceFile || "Untitled.pdf", 260),
    status: asText(payload.status || "pending", 40),
    insuredName: asText(payload.insuredName, 260),
    policyNumber: asText(payload.policyNumber, 120),
    contactNumber: asText(payload.contactNumber, 40),
    contactPerson: asText(payload.contactPerson, 180),
    groupName: asText(payload.groupName, 120),
    policyType: asText(payload.policyType, 260),
    premium: asText(payload.premium, 80),
    sumInsured: asText(payload.sumInsured, 80),
    startDate: asText(payload.startDate, 40),
    expiryDate: asText(payload.expiryDate, 40),
    duration: asText(payload.duration, 60),
    riskLocation: asText(payload.riskLocation, TEXT_LIMIT),
    district: asText(payload.district, 120),
    tehsil: asText(payload.tehsil, 120),
    insuranceCompany: asText(payload.insuranceCompany, 220),
    description: asText(payload.description, TEXT_LIMIT),
    pptMpwlc: asText(payload.pptMpwlc, 80),
    occupancy: asText(payload.occupancy, TEXT_LIMIT),
    validIn: asText(payload.validIn, 120)
  };
}

function asText(value, limit) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}
