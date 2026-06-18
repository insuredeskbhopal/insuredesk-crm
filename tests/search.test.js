import { describe, expect, it } from "vitest";
import { getRecordSearchText } from "../lib/records/search";

describe("getRecordSearchText", () => {
  it("indexes searchable metadata without raw payload fields", () => {
    const text = getRecordSearchText({
      insuredName: "Acme Warehouse",
      policyNumber: "POL-123",
      district: "Sehore",
      sourceText: "very large raw pdf text that must not be searched",
    });

    expect(text).toContain("acme warehouse");
    expect(text).toContain("pol-123");
    expect(text).toContain("sehore");
    expect(text).not.toContain("very large raw pdf text");
  });

  it("indexes vehicle and RTO fields for customer search", () => {
    const text = getRecordSearchText({
      insuredName: "Ajay Soni",
      vehicleNumber: "MP04CM7166",
      registrationNumber: "MP04CM7166",
      engineNumber: "ENG12345",
      chassisNumber: "CHS67890",
      makeModel: "Maruti Suzuki Swift",
      rtoLocation: "Bhopal",
    });

    expect(text).toContain("mp04cm7166");
    expect(text).toContain("eng12345");
    expect(text).toContain("chs67890");
    expect(text).toContain("maruti suzuki swift");
    expect(text).toContain("bhopal");
  });
});
