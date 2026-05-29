import { describe, expect, it } from "vitest";
import { sanitizeRecordPayload } from "../lib/record-validation";

describe("sanitizeRecordPayload", () => {
  it("normalizes whitespace and drops unsupported raw extraction fields", () => {
    const record = sanitizeRecordPayload({
      insuredName: "  Example    Client  ",
      whatsappGroupName: "  Renewal    Team  ",
      sourceText: "raw pdf text",
      riskLocation: "A".repeat(3000)
    });

    expect(record.insuredName).toBe("Example Client");
    expect(record.whatsappGroupName).toBe("Renewal Team");
    expect(record.sourceText).toBeUndefined();
    expect(record.riskLocation).toHaveLength(2000);
  });
});
