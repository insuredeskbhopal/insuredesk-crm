import { describe, expect, it } from "vitest";
import renewalImportIdentity from "../src/lib/renewals/import-identity.cjs";

const { buildRenewalImportKey, excelDateToString } = renewalImportIdentity;

describe("renewal import identity", () => {
  it("normalizes policy number formatting", () => {
    expect(buildRenewalImportKey({ policyNumber: " AB-12 / 34 ", expiryDate: "2026-08-12" })).toBe(
      buildRenewalImportKey({ policyNumber: "ab1234", expiryDate: "2026-08-12" }),
    );
  });

  it("keeps different renewal periods for the same policy", () => {
    expect(buildRenewalImportKey({ policyNumber: "AB1234", expiryDate: "2026-08-12" })).not.toBe(
      buildRenewalImportKey({ policyNumber: "AB1234", expiryDate: "2027-08-12" }),
    );
  });

  it("uses vehicle identity when a policy number is missing", () => {
    expect(
      buildRenewalImportKey({ vehicleNumber: "MP-09 AB 1234", expiryDate: "2026-08-12", policyType: "Private Car" }),
    ).toBe(
      buildRenewalImportKey({ registrationNumber: "mp09ab1234", expiryDate: "2026-08-12", policyType: "Private Car" }),
    );
  });

  it("falls back to customer and mobile identity", () => {
    expect(
      buildRenewalImportKey({ insuredName: "M/s Example Ltd", contactNumber: "+91 98765 43210", expiryDate: "" }),
    ).toContain("customer:MSEXAMPLELTD|mobile:919876543210");
  });

  it("preserves named Excel dates without a timezone shift", () => {
    expect(excelDateToString("01-Aug-2026")).toBe("2026-08-01");
    expect(excelDateToString("31-Jul-2026")).toBe("2026-07-31");
  });

  it("converts Excel serial dates", () => {
    expect(excelDateToString(46235)).toBe("2026-08-01");
  });
});
