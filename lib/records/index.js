export function normalizeRecord(record) {
  if (!record || typeof record !== "object") return {};
  const payload = record.reviewedData || record.data || {};
  const legacy = record.data || {};
  const uploader = record.uploadedFile?.createdBy || record.createdBy || {};
  const insuredName = payload.insuredName || legacy.insuredName || payload["Insured Name"] || "";
  const contactNumber = payload.contactNumber || legacy.contactNumber || payload["Contact No."] || payload.customerMobile || legacy.customerMobile || "";
  const customerId = buildCustomerId(insuredName, contactNumber);

  return {
    id: record.id,
    savedAt: record.savedAt,
    uploadedAt: record.uploadedFile?.createdAt || record.savedAt || record.createdAt || "",
    uploadedBy: uploader.name || uploader.email || record.createdById || "",
    uploadedByEmail: uploader.email || "",
    hasPdf: Boolean(record.pdfFileName || record.pdfBytes),
    pdfFileName: record.pdfFileName || payload.sourceFile || legacy.sourceFile || payload.sourceFileName || "",
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
    contactPerson: payload.contactPerson || legacy.contactPerson || payload["Contact person name"] || "",
    whatsappGroupName: payload.whatsappGroupName || legacy.whatsappGroupName || payload["WhatsApp Group Name"] || "",
    groupName: payload.groupName || legacy.groupName || payload["Group name"] || "",
    policyType: payload.policyType || legacy.policyType || payload["Policy Type"] || "",
    premium: payload.premium || legacy.premium || payload.Premium || "",
    totalPremium: payload.totalPremium || legacy.totalPremium || payload["Total Premium"] || payload.premium || legacy.premium || "",
    netPremium: payload.netPremium || legacy.netPremium || payload["Net Premium"] || "",
    tpDriverOwner: payload.tpDriverOwner || legacy.tpDriverOwner || payload["TP + Driver + Owner"] || "",
    odPremium: payload.odPremium || legacy.odPremium || payload["OD Premium"] || "",
    dueCollection: payload.dueCollection || legacy.dueCollection || payload["Due Collection"] || "",
    collectedAmount: payload.collectedAmount || legacy.collectedAmount || payload["Collected Amount"] || "",
    modeOfPayment: payload.modeOfPayment || legacy.modeOfPayment || payload["Mode Of Payment"] || "",
    remark: payload.remark || legacy.remark || payload.Remark || "",
    sumInsured: payload.sumInsured || legacy.sumInsured || payload["Sum Insured"] || "",
    startDate: payload.startDate || payload.policyStartDate || legacy.startDate || payload["Start date"] || "",
    expiryDate: payload.expiryDate || payload.policyEndDate || legacy.expiryDate || payload["Expiry date"] || "",
    duration: payload.duration || legacy.duration || payload.Duration || "",
    riskLocation: payload.riskLocation || legacy.riskLocation || payload["Risk location"] || "",
    district: payload.district || legacy.district || payload.District || "",
    tehsil: payload.tehsil || legacy.tehsil || payload.Tehsil || "",
    insuranceCompany: payload.insuranceCompany || payload.insurerName || legacy.insuranceCompany || payload["Insurance Company"] || "",
    description: payload.description || legacy.description || payload["Description/non declaration"] || "",
    pptMpwlc: payload.pptMpwlc || legacy.pptMpwlc || payload["PPT / MPWLC"] || "",
    occupancy: payload.occupancy || legacy.occupancy || payload.Occupancy || "",
    validIn: payload.validIn || legacy.validIn || payload["Valid In"] || "",
    vehicleNumber: payload.vehicleNumber || legacy.vehicleNumber || payload["Vehicle Number"] || payload["Vehicle No."] || "",
    registrationNumber: payload.registrationNumber || legacy.registrationNumber || payload["Registration Number"] || payload["Registration No."] || "",
    makeModel: payload.makeModel || legacy.makeModel || payload["Make / Model"] || payload.Make || "",
    variant: payload.variant || legacy.variant || payload.Variant || "",
    manufacturingYear: payload.manufacturingYear || legacy.manufacturingYear || payload["Manufacturing Year"] || "",
    registrationDate: payload.registrationDate || legacy.registrationDate || payload["Registration Date"] || "",
    engineNumber: payload.engineNumber || legacy.engineNumber || payload["Engine Number"] || payload["Engine No."] || "",
    chassisNumber: payload.chassisNumber || legacy.chassisNumber || payload["Chassis Number"] || payload["Chassis No."] || "",
    fuelType: payload.fuelType || legacy.fuelType || payload["Fuel Type"] || "",
    cubicCapacity: payload.cubicCapacity || legacy.cubicCapacity || payload["Cubic Capacity"] || "",
    seatingCapacity: payload.seatingCapacity || legacy.seatingCapacity || payload["Seating Capacity"] || "",
    grossVehicleWeight: payload.grossVehicleWeight || legacy.grossVehicleWeight || payload["Gross Vehicle Weight"] || "",
    idv: payload.idv || legacy.idv || payload.IDV || "",
    ncb: payload.ncb || legacy.ncb || payload.NCB || "",
    policyCoverType: payload.policyCoverType || legacy.policyCoverType || payload["Cover Type"] || "",
    rtoLocation: payload.rtoLocation || legacy.rtoLocation || payload["RTO Location"] || "",
    nomineeName: payload.nomineeName || legacy.nomineeName || payload["Nominee Name"] || "",
    financerName: payload.financerName || legacy.financerName || payload["Financer Name"] || payload["Hypothecation"] || "",
    renewalStatus: record.renewalStatus || "ACTIVE",
    previousPolicyId: record.previousPolicyId || null,
    renewedPolicyId: record.renewedPolicyId || null,
    renewalDate: record.renewalDate || null,
    lostReason: record.lostReason || "",
    isActivePolicy: record.isActivePolicy ?? true
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
