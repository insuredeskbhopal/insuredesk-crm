import { describe, expect, it } from "vitest";
import { getRecordSearchText } from "../lib/search";

describe("getRecordSearchText", () => {
  it("indexes searchable metadata without raw payload fields", () => {
    const text = getRecordSearchText({
      insuredName: "Acme Warehouse",
      policyNumber: "POL-123",
      district: "Sehore",
      sourceText: "very large raw pdf text that must not be searched"
    });

    expect(text).toContain("acme warehouse");
    expect(text).toContain("pol-123");
    expect(text).toContain("sehore");
    expect(text).not.toContain("very large raw pdf text");
  });
});
