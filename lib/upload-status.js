export const UPLOAD_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  APPROVED: "APPROVED",
  FAILED: "FAILED"
};

const LEGACY_UPLOAD_STATUS_MAP = {
  pending: UPLOAD_STATUS.PENDING,
  queued: UPLOAD_STATUS.PENDING,
  uploaded: UPLOAD_STATUS.PENDING,
  extracting: UPLOAD_STATUS.PROCESSING,
  processing: UPLOAD_STATUS.PROCESSING,
  classified: UPLOAD_STATUS.REVIEW_REQUIRED,
  ready_for_review: UPLOAD_STATUS.REVIEW_REQUIRED,
  needs_manual_classification: UPLOAD_STATUS.REVIEW_REQUIRED,
  review_required: UPLOAD_STATUS.REVIEW_REQUIRED,
  saved: UPLOAD_STATUS.APPROVED,
  approved: UPLOAD_STATUS.APPROVED,
  failed: UPLOAD_STATUS.FAILED
};

export function normalizeUploadStatus(status) {
  const raw = String(status || "").trim();
  if (!raw) return UPLOAD_STATUS.PENDING;

  const upper = raw.toUpperCase();
  if (Object.values(UPLOAD_STATUS).includes(upper)) return upper;

  return LEGACY_UPLOAD_STATUS_MAP[raw.toLowerCase()] || UPLOAD_STATUS.PENDING;
}
