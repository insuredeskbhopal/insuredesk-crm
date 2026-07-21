import { describe, expect, it } from "vitest";
import { getUploadFailureMessage } from "../src/lib/uploads/failure.js";

describe("upload failure security", () => {
  it("does not expose Prisma database infrastructure details", () => {
    const message = getUploadFailureMessage(
      new Error(
        "Invalid `prisma.uploadedFile.create()` invocation: Can't reach database server at `internal-pooler.neon.tech:5432`.",
      ),
    );

    expect(message).toBe("Upload service is temporarily unavailable. Please retry shortly.");
    expect(message).not.toMatch(/prisma|neon\.tech|5432/i);
  });

  it("preserves actionable non-technical upload messages", () => {
    expect(getUploadFailureMessage(new Error("No text could be extracted from this PDF."))).toBe(
      "No text could be extracted from this PDF.",
    );
  });
});
