import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { canAccessSharedResource, getTenantFilter } from "@/lib/auth/rbac";

export const ENDORSEMENT_STATUSES = [
  "Draft",
  "Letter Generated",
  "Sent to Customer",
  "Pending Insurance Company Letter",
  "Insurance Company Letter Received",
  "Approved",
  "Rejected",
  "Cancelled"
];

export const ENDORSEMENT_TYPES = [
  "Change in Address",
  "Increase in Sum Insured",
  "Decrease in Sum Insured",
  "Change in Situation / Location",
  "Addition of Warehouse / Property",
  "Deletion of Warehouse / Property",
  "Change in Occupancy",
  "Change in Stock Description",
  "Change in Hypothecation / Bank Details",
  "Correction in Insured Name",
  "Correction in Policy Details",
  "Other Endorsement"
];

export async function requireEndorsementSession(request, write = false) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };

  const session = await verifyJWT(token);
  if (!session) return { response: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  if (write && session.role === "VIEWER") {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  return { session };
}

export function getEndorsementWhere(session, action = "read") {
  return {
    ...getTenantFilter(session, action),
    deletedAt: null
  };
}

export function canWriteEndorsement(session, endorsement) {
  return canAccessSharedResource(session, "write", endorsement.organizationId);
}

export function canDeleteEndorsement(session, endorsement) {
  return canAccessSharedResource(session, "delete", endorsement.organizationId);
}

export const endorsementInclude = {
  createdBy: { select: { name: true, email: true } },
  updatedBy: { select: { name: true, email: true } },
  policy: { select: { id: true, reviewedData: true, data: true, selectedCompany: true, selectedPolicyType: true } },
  customer: { select: { id: true, name: true, phone: true, email: true } },
  documents: { orderBy: { uploadedAt: "desc" } }
};

export function sanitizeEndorsementPayload(payload = {}) {
  const status = stringValue(payload.status) || "Draft";
  return {
    endorsementNo: stringValue(payload.endorsementNo),
    policyId: uuidOrNull(payload.policyId),
    customerId: uuidOrNull(payload.customerId),
    uploadedPolicyFileId: uuidOrNull(payload.uploadedPolicyFileId),
    policyNo: stringValue(payload.policyNo),
    insuredName: stringValue(payload.insuredName, true),
    customerName: stringValue(payload.customerName),
    mailingAddress: stringValue(payload.mailingAddress),
    insuranceCompany: stringValue(payload.insuranceCompany),
    policyType: stringValue(payload.policyType),
    endorsementType: ENDORSEMENT_TYPES.includes(payload.endorsementType) ? payload.endorsementType : "Other Endorsement",
    endorsementDate: dateValue(payload.endorsementDate) || new Date(),
    effectiveDate: dateValue(payload.effectiveDate || payload.effectiveFrom),
    effectiveFrom: dateValue(payload.effectiveFrom || payload.effectiveDate),
    effectiveTo: dateValue(payload.effectiveTo),
    customerRequestDate: dateValue(payload.customerRequestDate),
    dateOfIssue: dateValue(payload.dateOfIssue),
    issuedOffice: stringValue(payload.issuedOffice),
    financerDetails: stringValue(payload.financerDetails),
    premium: stringValue(payload.premium),
    policyStartDate: dateValue(payload.policyStartDate),
    policyExpiryDate: dateValue(payload.policyExpiryDate),
    sumInsured: stringValue(payload.sumInsured),
    address: stringValue(payload.address),
    warehouseDetails: stringValue(payload.warehouseDetails),
    oldValues: objectValue(payload.oldValues),
    newValues: objectValue(payload.newValues),
    extractedPolicyData: objectValue(payload.extractedPolicyData),
    finalReviewedData: objectValue(payload.finalReviewedData),
    rawExtractedData: objectValue(payload.rawExtractedData),
    description: stringValue(payload.description),
    internalRemark: stringValue(payload.internalRemark),
    customerRemark: stringValue(payload.customerRemark),
    remark: stringValue(payload.remark),
    generatedLetterPdfUrl: stringValue(payload.generatedLetterPdfUrl),
    generatedLetterFileName: stringValue(payload.generatedLetterFileName),
    insuranceCompanyLetterPdfUrl: stringValue(payload.insuranceCompanyLetterPdfUrl),
    insuranceCompanyLetterFileName: stringValue(payload.insuranceCompanyLetterFileName),
    status: ENDORSEMENT_STATUSES.includes(status) ? status : "Draft"
  };
}

export function serializeEndorsement(record) {
  return {
    id: record.id,
    endorsementNo: record.endorsementNo,
    policyId: record.policyId || "",
    customerId: record.customerId || "",
    uploadedPolicyFileId: record.uploadedPolicyFileId || "",
    policyNo: record.policyNo || "",
    insuredName: record.insuredName || "",
    customerName: record.customerName || record.customer?.name || "",
    mailingAddress: record.mailingAddress || "",
    insuranceCompany: record.insuranceCompany || "",
    policyType: record.policyType || "",
    endorsementType: record.endorsementType || "Other Endorsement",
    endorsementDate: formatDateInput(record.endorsementDate),
    effectiveDate: formatDateInput(record.effectiveDate),
    effectiveFrom: formatDateInput(record.effectiveFrom),
    effectiveTo: formatDateInput(record.effectiveTo),
    customerRequestDate: formatDateInput(record.customerRequestDate),
    dateOfIssue: formatDateInput(record.dateOfIssue),
    issuedOffice: record.issuedOffice || "",
    financerDetails: record.financerDetails || "",
    premium: record.premium || "",
    policyStartDate: formatDateInput(record.policyStartDate),
    policyExpiryDate: formatDateInput(record.policyExpiryDate),
    sumInsured: record.sumInsured || "",
    address: record.address || "",
    warehouseDetails: record.warehouseDetails || "",
    oldValues: record.oldValues || {},
    newValues: record.newValues || {},
    extractedPolicyData: record.extractedPolicyData || {},
    finalReviewedData: record.finalReviewedData || {},
    rawExtractedData: record.rawExtractedData || {},
    description: record.description || "",
    internalRemark: record.internalRemark || "",
    customerRemark: record.customerRemark || "",
    remark: record.remark || "",
    generatedLetterPdfUrl: record.generatedLetterPdfUrl || "",
    generatedLetterFileName: record.generatedLetterFileName || "",
    insuranceCompanyLetterPdfUrl: record.insuranceCompanyLetterPdfUrl || "",
    insuranceCompanyLetterFileName: record.insuranceCompanyLetterFileName || "",
    status: record.status || "Draft",
    createdAt: record.createdAt?.toISOString?.() || record.createdAt,
    updatedAt: record.updatedAt?.toISOString?.() || record.updatedAt,
    createdBy: record.createdBy ? { name: record.createdBy.name, email: record.createdBy.email } : null,
    updatedBy: record.updatedBy ? { name: record.updatedBy.name, email: record.updatedBy.email } : null,
    documents: (record.documents || []).map((document) => ({
      id: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fileType: document.fileType || "application/pdf",
      size: document.size || 0,
      dataUrl: document.dataUrl,
      remark: document.remark || "",
      uploadedAt: document.uploadedAt?.toISOString?.() || document.uploadedAt
    }))
  };
}

export function getSummary(records) {
  return {
    total: records.length,
    draft: records.filter((item) => item.status === "Draft").length,
    generated: records.filter((item) => item.status === "Letter Generated").length,
    approved: records.filter((item) => item.status === "Approved").length,
    rejectedCancelled: records.filter((item) => item.status === "Rejected" || item.status === "Cancelled").length
  };
}

export function normalizePolicyData(data = {}) {
  const source = data.reviewedData || data.extractedData || data.data || data || {};
  return {
    policyNo: source.policyNumber || source.policyNo || "",
    insuredName: source.insuredName || source.customerName || "",
    insuranceCompany: source.insuranceCompany || data.selectedCompany || "",
    productName: source.productName || "",
    policyType: source.productName || source.policyType || data.selectedPolicyType || "",
    policyStartDate: source.policyStartDate || source.startDate || "",
    policyExpiryDate: source.policyEndDate || source.expiryDate || "",
    sumInsured: source.sumInsured || source.contentsSumInsured || source.idv || "",
    mailingAddress: source.mailingAddress || source.communicationAddress || "",
    address: source.riskLocation || source.premisesAddress || source.address || source.propertyAddress || "",
    warehouseDetails: source.warehouseDetails || source.propertyDetails || source.description || "",
    issuedAt: source.issuedAt || source.validIn || "",
    financerDetails: source.hypothecationDetails || source.financerName || "",
    premium: source.premiumIncludingGst || source.totalPremium || source.premium || "",
    coverages: source.coverages || [],
    raw: source
  };
}

export function generateEndorsementNumber() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `END-${date}-${suffix}`;
}

function stringValue(value, required = false) {
  const text = String(value || "").trim();
  if (!text && required) return "";
  return text || null;
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uuidOrNull(value) {
  const text = stringValue(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text || "") ? text : null;
}
