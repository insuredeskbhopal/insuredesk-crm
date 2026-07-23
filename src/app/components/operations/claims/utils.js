import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import {
  CLAIM_SPECIFIC_FIELDS,
  CLIENT_DETAIL_FIELDS,
  COMMON_CLAIM_FIELDS,
  EMPTY_CLAIM,
  FILTERS,
} from "./config";

export function createEmptyClaim() {
  return {
    ...EMPTY_CLAIM,
    internalClaimId: createInternalId("CLM"),
    customerId: createInternalId("CUST"),
    claimDetails: {},
    surveyorDetails: { ...EMPTY_CLAIM.surveyorDetails },
    remarks: [],
    documents: [],
  };
}

export function getClaimSpecificFields(claimType) {
  return CLAIM_SPECIFIC_FIELDS[claimType] || CLAIM_SPECIFIC_FIELDS.Other;
}

export function getMissingFieldsForStep(claim, step) {
  if (step === 0) return getMissingLabels(CLIENT_DETAIL_FIELDS, claim);
  if (step === 1) return getMissingLabels(COMMON_CLAIM_FIELDS, claim);
  return [];
}

export function matchesClaimFilter(item, filter) {
  const status = (item.claimStatus || "Open").toLowerCase();
  if (filter === "pending") return !["settled", "rejected"].includes(status);
  if (filter === "open") return status === "open";
  if (filter === "follow-up") return status === "follow up" || Boolean(item.followUpDate);
  if (filter === "documents") return status === "documents pending";
  if (filter === "settled") return status === "settled";
  if (filter === "rejected") return status === "rejected";
  return true;
}

export function getStatusTone(status) {
  const normalizedStatus = (status || "").toLowerCase();
  if (normalizedStatus === "open") return "tone-amber";
  if (normalizedStatus === "follow up") return "tone-blue";
  if (normalizedStatus === "documents pending") return "tone-red";
  if (normalizedStatus === "settled") return "tone-green";
  if (normalizedStatus === "rejected") return "tone-slate";
  return "tone-amber";
}

export function getFilterCounts(claims) {
  return FILTERS.reduce(
    (counts, filter) => ({
      ...counts,
      [filter.id]: claims.filter((claim) => matchesClaimFilter(claim, filter.id)).length,
    }),
    {},
  );
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      getUserFacingErrorMessage(payload.error, "Request could not be completed. Please try again."),
    );
  }
  return payload;
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

export function formatFileSize(size) {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function createClaimId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getMissingLabels(fields, values) {
  return fields
    .filter((field) => field.required && !String(values[field.key] || "").trim())
    .map((field) => field.label);
}

export function createInternalId(prefix) {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  return `${prefix}-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
