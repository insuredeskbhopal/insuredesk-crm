import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { canAccessSharedResource, getTenantFilter } from "@/lib/auth/rbac";

export async function requireClaimSession(request, write = false) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };

  const session = await verifyJWT(token);
  if (!session)
    return { response: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  if (write && session.role === "VIEWER") {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  return { session };
}

export function getClaimWhere(session, action = "read") {
  return {
    ...getTenantFilter(session, action),
    deletedAt: null,
  };
}

export function canWriteClaim(session, claim) {
  return canAccessSharedResource(session, "write", claim.organizationId);
}

export function canDeleteClaim(session, claim) {
  return canAccessSharedResource(session, "delete", claim.organizationId);
}

export function sanitizeClaimPayload(payload = {}) {
  return {
    insuredName: stringValue(payload.insuredName, true),
    mobileNo: stringValue(payload.mobileNo),
    contactPerson: stringValue(payload.contactPerson),
    policyNo: stringValue(payload.policyNo),
    claimNo: stringValue(payload.claimNo, true),
    groupName: stringValue(payload.groupName),
    claimDescription: stringValue(payload.claimDescription),
    claimDate: dateValue(payload.claimDate),
    claimType: stringValue(payload.claimType) || "Motor",
    claimStatus: stringValue(payload.claimStatus) || "Open",
    followUpDate: dateValue(payload.followUpDate),
    currentRemark: stringValue(payload.currentRemark),
    metadata: sanitizeClaimMetadata(payload),
  };
}

export function sanitizeClaimDocuments(documents = [], actorId = null) {
  if (!Array.isArray(documents)) return [];
  return documents
    .filter((document) => document && document.name && document.fileName && document.dataUrl)
    .map((document) => ({
      name: String(document.name).trim(),
      fileName: String(document.fileName).trim(),
      fileType: stringValue(document.fileType) || "application/octet-stream",
      size: Number.isFinite(Number(document.size)) ? Number(document.size) : null,
      dataUrl: String(document.dataUrl),
      uploadedAt: dateValue(document.uploadedAt) || new Date(),
      uploadedById: actorId,
    }));
}

export function serializeClaim(claim) {
  return {
    id: claim.id,
    insuredName: claim.insuredName,
    mobileNo: claim.mobileNo || "",
    contactPerson: claim.contactPerson || "",
    policyNo: claim.policyNo || "",
    claimNo: claim.claimNo,
    groupName: claim.groupName || "",
    claimDescription: claim.claimDescription || "",
    claimDate: formatDateInput(claim.claimDate),
    claimType: claim.claimType || "Motor",
    claimStatus: claim.claimStatus || "Open",
    followUpDate: formatDateInput(claim.followUpDate),
    currentRemark: claim.currentRemark || "",
    internalClaimId: claim.metadata?.internalClaimId || claim.id,
    customerId: claim.metadata?.customerId || "",
    insuranceCompany: claim.metadata?.insuranceCompany || "",
    assignedExecutive: claim.metadata?.assignedExecutive || "",
    branchOffice: claim.metadata?.branchOffice || "",
    policyStartDate: claim.metadata?.policyStartDate || "",
    policyExpiryDate: claim.metadata?.policyExpiryDate || "",
    dateOfLoss: claim.metadata?.dateOfLoss || "",
    claimPriority: claim.metadata?.claimPriority || "Normal",
    claimDetails: isPlainObject(claim.metadata?.claimDetails) ? claim.metadata.claimDetails : {},
    surveyorDetails: isPlainObject(claim.metadata?.surveyorDetails) ? claim.metadata.surveyorDetails : {},
    createdAt: claim.createdAt?.toISOString?.() || claim.createdAt,
    updatedAt: claim.updatedAt?.toISOString?.() || claim.updatedAt,
    createdBy: claim.createdBy ? { name: claim.createdBy.name, email: claim.createdBy.email } : null,
    updatedBy: claim.updatedBy ? { name: claim.updatedBy.name, email: claim.updatedBy.email } : null,
    remarks: (claim.remarks || []).map((remark) => ({
      id: remark.id,
      text: remark.text,
      followUpDate: formatDateInput(remark.followUpDate),
      createdAt: remark.createdAt?.toISOString?.() || remark.createdAt,
    })),
    documents: (claim.documents || []).map((document) => ({
      id: document.id,
      name: document.name,
      fileName: document.fileName,
      fileType: document.fileType || "application/octet-stream",
      size: document.size || 0,
      dataUrl: document.dataUrl,
      uploadedAt: document.uploadedAt?.toISOString?.() || document.uploadedAt,
    })),
  };
}

export const claimInclude = {
  createdBy: { select: { name: true, email: true } },
  updatedBy: { select: { name: true, email: true } },
  remarks: { orderBy: { createdAt: "desc" } },
  documents: { orderBy: { uploadedAt: "desc" } },
};

function sanitizeClaimMetadata(payload = {}) {
  return {
    internalClaimId: stringValue(payload.internalClaimId),
    customerId: stringValue(payload.customerId),
    insuranceCompany: stringValue(payload.insuranceCompany),
    assignedExecutive: stringValue(payload.assignedExecutive),
    branchOffice: stringValue(payload.branchOffice),
    policyStartDate: dateStringValue(payload.policyStartDate),
    policyExpiryDate: dateStringValue(payload.policyExpiryDate),
    dateOfLoss: dateStringValue(payload.dateOfLoss),
    claimPriority: stringValue(payload.claimPriority) || "Normal",
    claimDetails: sanitizeStringRecord(payload.claimDetails),
    surveyorDetails: sanitizeStringRecord(payload.surveyorDetails),
  };
}

function sanitizeStringRecord(value) {
  if (!isPlainObject(value)) return {};
  return Object.entries(value).reduce((record, [key, entry]) => {
    const cleanKey = String(key || "").trim();
    const cleanValue = String(entry || "").trim();
    if (cleanKey && cleanValue) record[cleanKey] = cleanValue;
    return record;
  }, {});
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function dateStringValue(value) {
  return formatDateInput(dateValue(value));
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
