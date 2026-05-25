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
    validIn: asText(payload.validIn, 120),
    vehicleNumber: asText(payload.vehicleNumber, 80),
    registrationNumber: asText(payload.registrationNumber, 80),
    makeModel: asText(payload.makeModel, 220),
    variant: asText(payload.variant, 180),
    manufacturingYear: asText(payload.manufacturingYear, 20),
    registrationDate: asText(payload.registrationDate, 40),
    engineNumber: asText(payload.engineNumber, 120),
    chassisNumber: asText(payload.chassisNumber, 120),
    fuelType: asText(payload.fuelType, 60),
    cubicCapacity: asText(payload.cubicCapacity, 40),
    seatingCapacity: asText(payload.seatingCapacity, 40),
    grossVehicleWeight: asText(payload.grossVehicleWeight, 60),
    idv: asText(payload.idv, 80),
    ncb: asText(payload.ncb, 40),
    policyCoverType: asText(payload.policyCoverType, 120),
    rtoLocation: asText(payload.rtoLocation, 160),
    nomineeName: asText(payload.nomineeName, 220),
    financerName: asText(payload.financerName, 220)
  };
}

function asText(value, limit) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}
