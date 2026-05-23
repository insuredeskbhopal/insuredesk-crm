export function normalizeRecord(record) {
  const payload = record.data || {};

  return {
    id: record.id,
    savedAt: record.savedAt,
    hasPdf: Boolean(record.pdfFileName || record.pdfBytes),
    pdfFileName: record.pdfFileName || payload.sourceFile || payload.sourceFileName || "",
    srNo: payload.srNo || payload["Sr No"] || "",
    sourceFile: payload.sourceFile || payload.sourceFileName || "",
    status: payload.status || "saved",
    insuredName: payload.insuredName || payload["Insured Name"] || "",
    policyNumber: payload.policyNumber || payload["Policy No."] || "",
    contactNumber: payload.contactNumber || payload["Contact No."] || "",
    contactPerson: payload.contactPerson || payload["Contact person name"] || "",
    groupName: payload.groupName || payload["Group name"] || "",
    policyType: payload.policyType || payload["Policy Type"] || "",
    premium: payload.premium || payload.Premium || "",
    sumInsured: payload.sumInsured || payload["Sum Insured"] || "",
    startDate: payload.startDate || payload["Start date"] || "",
    expiryDate: payload.expiryDate || payload["Expiry date"] || "",
    duration: payload.duration || payload.Duration || "",
    riskLocation: payload.riskLocation || payload["Risk location"] || "",
    district: payload.district || payload.District || "",
    tehsil: payload.tehsil || payload.Tehsil || "",
    insuranceCompany: payload.insuranceCompany || payload["Insurance Company"] || "",
    description: payload.description || payload["Description/non declaration"] || "",
    pptMpwlc: payload.pptMpwlc || payload["PPT / MPWLC"] || "",
    occupancy: payload.occupancy || payload.Occupancy || "",
    validIn: payload.validIn || payload["Valid In"] || ""
  };
}
