import { describe, expect, it } from "vitest";
import { buildCustomerId, normalizeRecord } from "../src/lib/records/index.js";
import { getReviewValidation, inferUploadSchema } from "../src/app/lib/dashboard-helpers.js";

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

  it("preserves the linked Client ID for policy record editing", () => {
    const record = normalizeRecord({
      id: "record-1",
      reviewedData: {
        insuredName: "Shashank Garg",
        clientId: "5be7a398-f0df-4603-a187-655fb7885970",
      },
    });

    expect(record.clientId).toBe("5be7a398-f0df-4603-a187-655fb7885970");
  });

  it("preserves Health identity and fields while hiding false Motor values", () => {
    const record = normalizeRecord({
      id: "health-record",
      reviewedData: {
        documentCategory: "Health Insurance",
        documentFormat: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
        insuredName: "Primary Member",
        policyNumber: "HEALTH-001",
        policyType: "FLOATER",
        policyTenure: "1 Year",
        previousPolicyNumber: "HEALTH-000",
        basicPremium: "24,612.83",
        gstAmount: "0.00",
        stampDuty: "1.00",
        nomineeName: "Family Nominee",
        nomineeRelationship: "Spouse",
        vehicleNumber: "FALSE-VEHICLE-VALUE",
        insuredMembers: [
          {
            name: "Primary Member",
            relationship: "Self",
            dateOfBirth: "01/01/1990",
          },
          {
            name: "Family Member",
            relationship: "Spouse",
            dateOfBirth: "02/02/1992",
          },
        ],
      },
    });

    expect(record).toMatchObject({
      documentCategory: "Health Insurance",
      documentFormat: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
      policyTenure: "1 Year",
      previousPolicyNumber: "HEALTH-000",
      basicPremium: "24,612.83",
      gstAmount: "0.00",
      stampDuty: "1.00",
      nomineeRelationship: "Spouse",
      numberOfInsuredMembers: 2,
    });
    expect(record.insuredMembers).toHaveLength(2);
    expect(inferUploadSchema({ extractedData: record })).toMatchObject({ groupId: "health" });

    const visibleKeys = getReviewValidation({ extractedData: record }).visibleFields.map(([, key]) => key);
    expect(visibleKeys).toEqual(
      expect.arrayContaining([
        "insuredMembers",
        "policyTenure",
        "previousPolicyNumber",
        "basicPremium",
        "nomineeRelationship",
      ]),
    );
    expect(visibleKeys).not.toEqual(
      expect.arrayContaining(["vehicleNumber", "engineNumber", "chassisNumber", "idv"]),
    );
  });
});
