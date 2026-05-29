export function getRecordSearchText(record) {
  return [
    record.insuredName,
    record.policyNumber,
    record.contactNumber,
    record.contactPerson,
    record.whatsappGroupName,
    record.groupName,
    record.policyType,
    record.district,
    record.tehsil,
    record.insuranceCompany,
    record.uploadedBy,
    record.uploadedByEmail,
    record.sourceFile,
    record.pdfFileName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
