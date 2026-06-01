import { describe, expect, it } from "vitest";
import { UploadValidationError, validatePdfFile, validateUploadList } from "../lib/upload-validation";

function makeFile({ content = "%PDF-1.7\n", type = "application/pdf", name = "policy.pdf" } = {}) {
  return new File([content], name, { type });
}

describe("upload validation", () => {
  it("rejects empty upload lists", () => {
    expect(() => validateUploadList([])).toThrow(UploadValidationError);
  });

  it("accepts valid PDF signatures", async () => {
    const buffer = await validatePdfFile(makeFile());
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("rejects non-PDF signatures", async () => {
    await expect(validatePdfFile(makeFile({ content: "not a pdf" }))).rejects.toThrow(UploadValidationError);
  });

  it("accepts PDF signatures with leading spaces", async () => {
    const buffer = await validatePdfFile(makeFile({ content: "   \n%PDF-1.7\n" }));
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
