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
    financerName: asText(payload.financerName, 220),
    documentFormat: asText(payload.documentFormat, 80),
    documentCategory: asText(payload.documentCategory, 120),
    companyName: asText(payload.companyName, 160),
    proposalNumber: asText(payload.proposalNumber, 120),
    invoiceNumber: asText(payload.invoiceNumber, 120),
    issuanceDate: asText(payload.issuanceDate, 40),
    customerId: asText(payload.customerId, 120),
    communicationAddress: asText(payload.communicationAddress, TEXT_LIMIT),
    customerMobile: asText(payload.customerMobile, 40),
    customerEmail: asText(payload.customerEmail, 180),
    gstin: asText(payload.gstin, 40),
    panNumber: asText(payload.panNumber, 40),
    vehicleMake: asText(payload.vehicleMake, 120),
    vehicleModel: asText(payload.vehicleModel, 220),
    rto: asText(payload.rto, 120),
    bodyType: asText(payload.bodyType, 80),
    totalIdv: asText(payload.totalIdv, 80),
    geographicalArea: asText(payload.geographicalArea, 220),
    compulsoryDeductible: asText(payload.compulsoryDeductible, 80),
    voluntaryDeductible: asText(payload.voluntaryDeductible, 80),
    basicOwnDamage: asText(payload.basicOwnDamage, 80),
    basicThirdPartyLiability: asText(payload.basicThirdPartyLiability, 80),
    netOwnDamagePremium: asText(payload.netOwnDamagePremium, 80),
    netLiabilityPremium: asText(payload.netLiabilityPremium, 80),
    totalPackagePremium: asText(payload.totalPackagePremium, 80),
    gstAmount: asText(payload.gstAmount, 80),
    totalPremium: asText(payload.totalPremium, 80),
    zeroDepreciationCover: asText(payload.zeroDepreciationCover, 80),
    engineGearboxProtection: asText(payload.engineGearboxProtection, 80),
    costOfConsumables: asText(payload.costOfConsumables, 80),
    previousPolicyNumber: asText(payload.previousPolicyNumber, 120),
    previousPolicyValidity: asText(payload.previousPolicyValidity, 160),
    previousInsurer: asText(payload.previousInsurer, 220),
    ncbPercentage: asText(payload.ncbPercentage, 40),
    paymentReference: asText(payload.paymentReference, 220),
    bankName: asText(payload.bankName, 220),
    cscName: asText(payload.cscName, 220),
    cscCode: asText(payload.cscCode, 120),
    cscContactNumber: asText(payload.cscContactNumber, 40),
    confidenceScore: asNumber(payload.confidenceScore),
    extractionMethod: asText(payload.extractionMethod, 120),
    extractionQuality: asJson(payload.extractionQuality),
    policyUnderstanding: asJson(payload.policyUnderstanding),
    schemaExtraction: asJson(payload.schemaExtraction),
    fieldConfidence: asJson(payload.fieldConfidence)
  };
}

function asText(value, limit) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asJson(value) {
  if (!value || typeof value !== "object") return null;
  return JSON.parse(JSON.stringify(value));
}
