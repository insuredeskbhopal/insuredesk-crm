import { describe, expect, it } from "vitest";
import { normalizeUploadStatus, UPLOAD_STATUS } from "../src/lib/uploads/status";

describe("upload status normalization", () => {
  it("keeps supported upload statuses unchanged", () => {
    expect(normalizeUploadStatus(UPLOAD_STATUS.PENDING)).toBe(UPLOAD_STATUS.PENDING);
    expect(normalizeUploadStatus(UPLOAD_STATUS.PROCESSING)).toBe(UPLOAD_STATUS.PROCESSING);
    expect(normalizeUploadStatus(UPLOAD_STATUS.REVIEW_REQUIRED)).toBe(UPLOAD_STATUS.REVIEW_REQUIRED);
    expect(normalizeUploadStatus(UPLOAD_STATUS.APPROVED)).toBe(UPLOAD_STATUS.APPROVED);
    expect(normalizeUploadStatus(UPLOAD_STATUS.FAILED)).toBe(UPLOAD_STATUS.FAILED);
  });

  it("maps legacy lowercase upload statuses to supported statuses", () => {
    expect(normalizeUploadStatus("uploaded")).toBe(UPLOAD_STATUS.PENDING);
    expect(normalizeUploadStatus("extracting")).toBe(UPLOAD_STATUS.PROCESSING);
    expect(normalizeUploadStatus("ready_for_review")).toBe(UPLOAD_STATUS.REVIEW_REQUIRED);
    expect(normalizeUploadStatus("needs_manual_classification")).toBe(UPLOAD_STATUS.REVIEW_REQUIRED);
    expect(normalizeUploadStatus("saved")).toBe(UPLOAD_STATUS.APPROVED);
    expect(normalizeUploadStatus("failed")).toBe(UPLOAD_STATUS.FAILED);
  });
});
