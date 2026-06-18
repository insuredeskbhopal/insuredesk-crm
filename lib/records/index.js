import insuranceCompanyMaster from "@/lib/master/insurance-companies.cjs";

const { normalizeInsuranceCompanyName } = insuranceCompanyMaster;

export function normalizeRecord(record) {
  if (!record || typeof record !== "object") return {};
  const payload = record.reviewedData || record.data || {};
  const legacy = record.data || {};
  const uploader = record.uploadedFile?.createdBy || record.createdBy || {};
  const updater = record.updatedBy || {};
  const insuredName =
    payload.insuredName ||
    legacy.insuredName ||
    payload.customerName ||
    legacy.customerName ||
    payload["Insured Name"] ||
    "";
  const contactNumber =
    payload.contactNumber ||
    legacy.contactNumber ||
    payload.customerMobile ||
    legacy.customerMobile ||
    payload.mobileNumber ||
    legacy.mobileNumber ||
    payload.phone ||
    legacy.phone ||
    payload["Contact No."] ||
    payload["Mobile Number"] ||
    "";
  const customerId = buildCustomerId(insuredName, contactNumber);
  const insuranceCompany = normalizeInsuranceCompanyName(
    payload.insuranceCompany ||
      payload.insurerName ||
      legacy.insuranceCompany ||
      payload["Insurance Company"] ||
      record.selectedCompany ||
      record.detectedCompany ||
      "",
  );

  const renewalRemarks = Array.isArray(payload.renewalRemarks)
    ? payload.renewalRemarks
    : Array.isArray(legacy.renewalRemarks)
      ? legacy.renewalRemarks
      : [];
  const latestRenewalRemark = renewalRemarks[0] || null;
  const renewalFollowUp = payload.renewalFollowUp || legacy.renewalFollowUp || null;
  const createdByName = uploader.name || uploader.email || record.createdById || "";
  const updatedByName = updater.name || updater.email || "";
  const assignedTo =
    payload.assignedTo || legacy.assignedTo || renewalFollowUp?.assignedTo || createdByName || "";

  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    savedAt: record.savedAt,
    uploadedAt: record.uploadedFile?.createdAt || record.savedAt || record.createdAt || "",
    uploadedBy: createdByName,
    uploadedByEmail: uploader.email || "",
    createdBy: createdByName,
    createdByEmail: uploader.email || "",
    updatedBy: updatedByName,
    updatedByEmail: updater.email || "",
    assignedTo,
    assignedToId: payload.assignedToId || legacy.assignedToId || "",
    assignedDate: payload.assignedDate || legacy.assignedDate || "",
    hasPdf: Boolean(record.pdfFileName || record.pdfBytes),
    pdfFileName:
      record.pdfFileName || payload.sourceFile || legacy.sourceFile || payload.sourceFileName || "",
    extractionMethod: record.extractionMethod || legacy.extractionMethod || "",
    extractionQuality: record.extractionQuality || null,
    confidenceScore: record.confidenceScore ?? null,
    extractionLog: record.extractionLog || null,
    customerId,
    sourceFile: payload.sourceFile || legacy.sourceFile || payload.sourceFileName || "",
    status: payload.status || legacy.status || "saved",
    insuredName,
    policyNumber: payload.policyNumber || legacy.policyNumber || payload["Policy No."] || "",
    contactNumber,
    contactPerson:
      payload.contactPerson ||
      legacy.contactPerson ||
      payload.contactPersonName ||
      legacy.contactPersonName ||
      payload.customerName ||
      legacy.customerName ||
      payload["Contact person name"] ||
      payload["Contact Person Name"] ||
      payload["Contact Person"] ||
      "",
    email:
      payload.email ||
      legacy.email ||
      payload.customerEmail ||
      legacy.customerEmail ||
      payload.emailAddress ||
      legacy.emailAddress ||
      payload["Email ID"] ||
      payload["Email Address"] ||
      "",
    whatsappGroupName:
      payload.whatsappGroupName || legacy.whatsappGroupName || payload["WhatsApp Group Name"] || "",
    groupName: payload.groupName || legacy.groupName || payload["Group name"] || "",
    sourceDocumentType:
      payload.sourceDocumentType ||
      legacy.sourceDocumentType ||
      payload.documentFormat ||
      legacy.documentFormat ||
      "",
    productName: payload.productName || legacy.productName || "",
    mailingAddress:
      payload.mailingAddress ||
      legacy.mailingAddress ||
      payload.communicationAddress ||
      legacy.communicationAddress ||
      payload.address ||
      legacy.address ||
      "",
    premisesAddress:
      payload.premisesAddress || legacy.premisesAddress || payload.riskLocation || legacy.riskLocation || "",
    businessDescription:
      payload.businessDescription ||
      legacy.businessDescription ||
      payload.description ||
      legacy.description ||
      "",
    issuedAt: payload.issuedAt || legacy.issuedAt || payload.validIn || legacy.validIn || "",
    policyType: payload.policyType || legacy.policyType || payload["Policy Type"] || "",
    premium: payload.premium || legacy.premium || payload.Premium || "",
    premiumIncludingGst:
      payload.premiumIncludingGst ||
      legacy.premiumIncludingGst ||
      payload.totalPremium ||
      legacy.totalPremium ||
      payload.premium ||
      legacy.premium ||
      "",
    totalPremium:
      payload.totalPremium ||
      legacy.totalPremium ||
      payload["Total Premium"] ||
      payload.premium ||
      legacy.premium ||
      "",
    netPremium: payload.netPremium || legacy.netPremium || payload["Net Premium"] || "",
    gstAmount: payload.gstAmount || legacy.gstAmount || "",
    cgst: payload.cgst || legacy.cgst || "",
    sgst: payload.sgst || legacy.sgst || "",
    igst: payload.igst || legacy.igst || "",
    invoiceNumber: payload.invoiceNumber || legacy.invoiceNumber || "",
    invoiceDate: payload.invoiceDate || legacy.invoiceDate || "",
    gstin: payload.gstin || legacy.gstin || "",
    placeOfSupply: payload.placeOfSupply || legacy.placeOfSupply || "",
    hypothecationDetails: payload.hypothecationDetails || legacy.hypothecationDetails || "",
    bankChargeType: payload.bankChargeType || legacy.bankChargeType || "",
    brokerCode: payload.brokerCode || legacy.brokerCode || "",
    brokerName: payload.brokerName || legacy.brokerName || "",
    brokerMobile: payload.brokerMobile || legacy.brokerMobile || "",
    brokerEmail: payload.brokerEmail || legacy.brokerEmail || "",
    contentsSumInsured: payload.contentsSumInsured || legacy.contentsSumInsured || "",
    burglarySumInsured: payload.burglarySumInsured || legacy.burglarySumInsured || "",
    fidelitySumInsured: payload.fidelitySumInsured || legacy.fidelitySumInsured || "",
    coverages: Array.isArray(payload.coverages)
      ? payload.coverages
      : Array.isArray(legacy.coverages)
        ? legacy.coverages
        : [],
    clauses: Array.isArray(payload.clauses)
      ? payload.clauses
      : Array.isArray(legacy.clauses)
        ? legacy.clauses
        : [],
    specialConditions: Array.isArray(payload.specialConditions)
      ? payload.specialConditions
      : Array.isArray(legacy.specialConditions)
        ? legacy.specialConditions
        : [],
    extractionConfidence: payload.extractionConfidence ?? legacy.extractionConfidence ?? null,
    needsManualReview: Boolean(payload.needsManualReview || legacy.needsManualReview),
    tpDriverOwner: payload.tpDriverOwner || legacy.tpDriverOwner || payload["TP + Driver + Owner"] || "",
    odPremium: payload.odPremium || legacy.odPremium || payload["OD Premium"] || "",
    dueCollection: payload.dueCollection || legacy.dueCollection || payload["Due Collection"] || "",
    collectedAmount: payload.collectedAmount || legacy.collectedAmount || payload["Collected Amount"] || "",
    modeOfPayment: payload.modeOfPayment || legacy.modeOfPayment || payload["Mode Of Payment"] || "",
    remark: payload.remark || legacy.remark || payload.Remark || "",
    renewalRemarks,
    renewalFollowUp,
    latestRemark: latestRenewalRemark?.text || payload.remark || legacy.remark || payload.Remark || "",
    latestRemarkBy: latestRenewalRemark?.createdBy || renewalFollowUp?.lastRemarkBy || "",
    latestRemarkAt: latestRenewalRemark?.createdAt || renewalFollowUp?.lastRemarkAt || "",
    nextFollowUpDate: renewalFollowUp?.nextFollowUpDate || latestRenewalRemark?.nextFollowUpDate || "",
    followUpMode: renewalFollowUp?.followUpMode || latestRenewalRemark?.followUpMode || "",
    followUpStatus: renewalFollowUp?.followUpStatus || latestRenewalRemark?.followUpStatus || "",
    priority: renewalFollowUp?.priority || latestRenewalRemark?.priority || "",
    nextAction: renewalFollowUp?.nextAction || latestRenewalRemark?.nextAction || "",
    sumInsured: payload.sumInsured || legacy.sumInsured || payload["Sum Insured"] || "",
    startDate:
      payload.startDate || payload.policyStartDate || legacy.startDate || payload["Start date"] || "",
    expiryDate:
      payload.expiryDate || payload.policyEndDate || legacy.expiryDate || payload["Expiry date"] || "",
    duration: payload.duration || legacy.duration || payload.Duration || "",
    riskLocation: payload.riskLocation || legacy.riskLocation || payload["Risk location"] || "",
    district: payload.district || legacy.district || payload.District || "",
    tehsil: payload.tehsil || legacy.tehsil || payload.Tehsil || "",
    insuranceCompany,
    description: payload.description || legacy.description || payload["Description/non declaration"] || "",
    pptMpwlc: payload.pptMpwlc || legacy.pptMpwlc || payload["PPT / MPWLC"] || "",
    occupancy: payload.occupancy || legacy.occupancy || payload.Occupancy || "",
    validIn: payload.validIn || legacy.validIn || payload["Valid In"] || "",
    vehicleNumber:
      payload.vehicleNumber ||
      legacy.vehicleNumber ||
      payload["Vehicle Number"] ||
      payload["Vehicle No."] ||
      "",
    registrationNumber:
      payload.registrationNumber ||
      legacy.registrationNumber ||
      payload["Registration Number"] ||
      payload["Registration No."] ||
      "",
    makeModel: payload.makeModel || legacy.makeModel || payload["Make / Model"] || payload.Make || "",
    variant: payload.variant || legacy.variant || payload.Variant || "",
    manufacturingYear:
      payload.manufacturingYear || legacy.manufacturingYear || payload["Manufacturing Year"] || "",
    registrationDate:
      payload.registrationDate || legacy.registrationDate || payload["Registration Date"] || "",
    engineNumber:
      payload.engineNumber || legacy.engineNumber || payload["Engine Number"] || payload["Engine No."] || "",
    chassisNumber:
      payload.chassisNumber ||
      legacy.chassisNumber ||
      payload["Chassis Number"] ||
      payload["Chassis No."] ||
      "",
    fuelType: payload.fuelType || legacy.fuelType || payload["Fuel Type"] || "",
    cubicCapacity: payload.cubicCapacity || legacy.cubicCapacity || payload["Cubic Capacity"] || "",
    seatingCapacity: payload.seatingCapacity || legacy.seatingCapacity || payload["Seating Capacity"] || "",
    grossVehicleWeight:
      payload.grossVehicleWeight || legacy.grossVehicleWeight || payload["Gross Vehicle Weight"] || "",
    idv: payload.idv || legacy.idv || payload.IDV || "",
    ncb: payload.ncb || legacy.ncb || payload.NCB || "",
    policyCoverType: payload.policyCoverType || legacy.policyCoverType || payload["Cover Type"] || "",
    rtoLocation: payload.rtoLocation || legacy.rtoLocation || payload["RTO Location"] || "",
    nomineeName: payload.nomineeName || legacy.nomineeName || payload["Nominee Name"] || "",
    financerName:
      payload.financerName ||
      legacy.financerName ||
      payload["Financer Name"] ||
      payload["Hypothecation"] ||
      "",
    renewalStatus: record.renewalStatus || "ACTIVE",
    previousPolicyId: record.previousPolicyId || null,
    renewedPolicyId: record.renewedPolicyId || null,
    renewalDate: record.renewalDate || null,
    lostReason: record.lostReason || "",
    isActivePolicy: record.isActivePolicy ?? true,
  };
}

export function buildCustomerId(insuredName = "", contactNumber = "") {
  const namePart = stripNameSalutation(insuredName)
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 4)
    .toUpperCase();
  const phoneText = String(contactNumber || "");
  const phoneDigits = /[*xX•]/.test(phoneText) ? "" : phoneText.replace(/\D/g, "");
  const phonePart = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "";
  return `${namePart}${phonePart}`;
}

function stripNameSalutation(value = "") {
  return String(value || "")
    .replace(/^\s*(?:m\/s|mr|mrs|miss|ms)\.?\s+/i, "")
    .trim();
}
