const CLIENT_POLICY_FIELDS = [
  "policyNumber",
  "policyType",
  "insuranceCompany",
  "premium",
  "totalPremium",
  "sumInsured",
  "startDate",
  "expiryDate",
  "policyExpiryDate",
  "vehicleNumber",
  "registrationNumber",
  "makeModel",
  "idv",
  "insuredName",
  "contactPerson",
  "contactNumber",
  "coverType",
  "duration",
  "make",
  "model",
  "variant",
  "engineNumber",
  "chassisNumber",
  "rtoLocation",
  "fuelType",
  "ncb",
  "nomineeName",
  "nomineeRelationship",
  "receiptNumber",
  "receiptDate",
  "paymentReference",
  "paymentLink",
  "netPremium",
  "gstAmount",
  "ownDamagePremium",
  "thirdPartyPremium",
  "personalAccidentCover",
  "deductible",
  "voluntaryDeductible",
  "geographicalArea",
  "addOns",
  "addons",
  "coverageDetails",
  "policyTerms",
];

export function buildClientPolicyPayload(source = {}) {
  return CLIENT_POLICY_FIELDS.reduce((payload, key) => {
    payload[key] = source?.[key] || "";
    return payload;
  }, {});
}

export function serializeClientPolicy(policy) {
  const payload = buildClientPolicyPayload(policy.reviewedData || policy.data || {});
  const pdfName = String(policy.pdfFileName || "").toLowerCase();
  const isExcelDoc = pdfName.endsWith(".xlsx") || pdfName.endsWith(".xls") || pdfName === "generic_renewal_template.xlsx";
  const hasDocument = Boolean(policy.uploadedFileId || (policy.pdfFileName && !isExcelDoc));

  return {
    ...payload,
    id: policy.id,
    savedAt: policy.savedAt,
    selectedCompany: policy.selectedCompany || payload.insuranceCompany || "",
    selectedPolicyType: policy.selectedPolicyType || payload.policyType || "",
    isActivePolicy: policy.isActivePolicy,
    renewalDate: policy.renewalDate,
    renewalStatus: policy.renewalStatus,
    documents: {
      policyPdf: hasDocument,
      certificate: hasDocument,
      premiumReceipt: Boolean(payload.receiptNumber || payload.paymentReference),
      renewedPolicy: Boolean(policy.renewalStatus === "RENEWED" && hasDocument),
    },
    reviewedData: payload,
    data: payload,
  };
}
