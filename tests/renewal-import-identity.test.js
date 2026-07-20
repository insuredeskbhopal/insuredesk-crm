import { describe, expect, it } from "vitest";
import renewalImportIdentity from "../src/lib/renewals/import-identity.cjs";

const { buildRenewalImportKey, excelDateToString, findRenewalImportMatch, mergeRenewalImportData } =
  renewalImportIdentity;

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
      buildRenewalImportKey({
        vehicleNumber: "MP-09 AB 1234",
        expiryDate: "2026-08-12",
        policyType: "Private Car",
      }),
    ).toBe(
      buildRenewalImportKey({
        registrationNumber: "mp09ab1234",
        expiryDate: "2026-08-12",
        policyType: "Private Car",
      }),
    );
  });

  it("falls back to customer and mobile identity", () => {
    expect(
      buildRenewalImportKey({
        insuredName: "M/s Example Ltd",
        contactNumber: "+91 98765 43210",
        expiryDate: "",
      }),
    ).toContain("customer:MSEXAMPLELTD|mobile:919876543210");
  });

  it("preserves named Excel dates without a timezone shift", () => {
    expect(excelDateToString("01-Aug-2026")).toBe("2026-08-01");
    expect(excelDateToString("31-Jul-2026")).toBe("2026-07-31");
  });

  it("converts Excel serial dates", () => {
    expect(excelDateToString(46235)).toBe("2026-08-01");
  });

  it("updates only nonblank imported fields and preserves renewal workflow data", () => {
    const current = {
      contactNumber: "9988776655",
      makeModel: "",
      renewalFollowUp: { priority: "HIGH" },
      renewalRemarks: [{ text: "Call tomorrow" }],
    };

    const merged = mergeRenewalImportData(current, {
      contactNumber: "",
      makeModel: "HONDA CITY",
    });

    expect(merged.data).toEqual({
      contactNumber: "9988776655",
      makeModel: "HONDA CITY",
      renewalFollowUp: { priority: "HIGH" },
      renewalRemarks: [{ text: "Call tomorrow" }],
    });
    expect(merged.changedFields).toEqual(["makeModel"]);
  });

  it("does not rewrite equivalent formatted amounts", () => {
    const merged = mergeRenewalImportData(
      { premium: "9,604", sumInsured: "1530900" },
      { premium: 9604, sumInsured: "15,30,900" },
    );

    expect(merged.changedFields).toEqual([]);
    expect(merged.data).toEqual({ premium: "9,604", sumInsured: "1530900" });
  });

  it("matches a policy with a missing stored expiry without creating a duplicate", () => {
    const record = { id: "one", reviewedData: { policyNumber: "AB-123", expiryDate: "" } };
    const match = findRenewalImportMatch({ policyNumber: "AB123", expiryDate: "2026-08-29" }, [record]);

    expect(match).toMatchObject({ status: "matched", matchType: "policy-missing-expiry", record });
  });

  it("keeps a genuinely different renewal period as a new row", () => {
    const match = findRenewalImportMatch({ policyNumber: "AB123", expiryDate: "2027-08-29" }, [
      { id: "one", reviewedData: { policyNumber: "AB123", expiryDate: "2026-08-29" } },
    ]);

    expect(match).toEqual({ status: "new" });
  });

  it("matches missing-policy renewals by a unique vehicle and expiry", () => {
    const record = {
      id: "one",
      reviewedData: { vehicleNumber: "MP-04 CV 3258", expiryDate: "2026-08-19" },
    };
    const match = findRenewalImportMatch(
      { vehicleNumber: "MP04CV3258", expiryDate: "2026-08-19", policyType: "Motor" },
      [record],
    );

    expect(match).toMatchObject({ status: "matched", matchType: "vehicle-expiry", record });
  });

  it("refuses to update when a fallback identity is ambiguous", () => {
    const records = ["one", "two"].map((id) => ({
      id,
      reviewedData: { vehicleNumber: "MP04CV3258", expiryDate: "2026-08-19" },
    }));
    const match = findRenewalImportMatch({ vehicleNumber: "MP04CV3258", expiryDate: "2026-08-19" }, records);

    expect(match).toMatchObject({ status: "ambiguous", matchType: "exact" });
  });
});
