import { prisma } from "@/lib/db/prisma";

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

/**
 * Safely normalize Indian phone numbers to canonical 10-digit format.
 * Strips non-digits and leading prefixes (0091, +91, 91, 0).
 * Rejects values that cannot be safely reduced to 10 digits.
 */
export function normalizeCanonicalPhone(value) {
  if (!value) return "";
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("0091") && digits.length === 14) digits = digits.slice(4);
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits.length === 10 ? digits : "";
}

export async function isClientPhoneUniqueInOrg({ organizationId, phone, database = prisma }) {
  const normPhone = normalizeCanonicalPhone(phone);
  if (!normPhone) return false;

  const res = await database.$queryRaw`
    SELECT COUNT(*)::int as count
    FROM client_accounts
    WHERE deleted_at IS NULL
      AND organization_id IS NOT DISTINCT FROM ${organizationId}::uuid
      AND length(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 10
      AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ${normPhone}
  `;
  return Number(res?.[0]?.count || 0) === 1;
}

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
