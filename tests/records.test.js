import { describe, expect, it } from "vitest";
import { buildCustomerId, normalizeRecord } from "../lib/records/index.js";

describe("record customer ID", () => {
  it("uses the first four insured-name letters and last four unmasked phone digits", () => {
    expect(buildCustomerId("Leena Sajwani", "9876543210")).toBe("LEEN3210");
    expect(buildCustomerId("AD Mark Advertising", "+91 8818889660")).toBe("ADMA9660");
  });

  it("ignores salutations before taking customer ID name letters", () => {
    expect(buildCustomerId("Mr Sunil Kumar Shukla", "9988776655")).toBe("SUNI6655");
    expect(buildCustomerId("Mrs Sarita Verma", "9123456789")).toBe("SARI6789");
    expect(buildCustomerId("Ms Leena Sajwani", "9876543210")).toBe("LEEN3210");
    expect(buildCustomerId("M/S AD Mark Advertising", "+91 8818889660")).toBe("ADMA9660");
  });

  it("does not build the phone suffix from masked digits", () => {
    expect(buildCustomerId("Leena Sajwani", "91******92")).toBe("LEEN");
  });

  it("normalizes records with generated customerId instead of serial number", () => {
    const record = normalizeRecord({
      id: "record-1",
      data: {
        srNo: "12",
        insuredName: "Vijay Kumar",
        contactNumber: "9988776655",
      },
    });

    expect(record.customerId).toBe("VIJA6655");
    expect(record.srNo).toBeUndefined();
  });
});
