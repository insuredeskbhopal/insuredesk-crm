import { describe, expect, it } from "vitest";
import {
  sanitizeRecordPayload,
  normalizeContactNumber,
  validateContactNumber,
  validateContactPerson,
} from "../src/lib/records/validation";
import {
  getReviewFieldValue,
  getReviewValidation,
  canSaveWithPendingClientId,
  shouldUseExtractedFuelType,
} from "../src/app/lib/dashboard-helpers";

describe("sanitizeRecordPayload", () => {
  it("normalizes whitespace and drops unsupported raw extraction fields", () => {
    const record = sanitizeRecordPayload({
      insuredName: "  Example    Client  ",
      clientId: "  11111111-1111-4111-8111-111111111111  ",
      whatsappGroupName: "  Renewal    Team  ",
      sourceText: "raw pdf text",
      riskLocation: "A".repeat(3000),
    });

    expect(record.insuredName).toBe("Example Client");
    expect(record.clientId).toBe("11111111-1111-4111-8111-111111111111");
    expect(record.whatsappGroupName).toBe("Renewal Team");
    expect(record.sourceText).toBeUndefined();
    expect(record.riskLocation).toHaveLength(2000);
  });

  it("normalizes registration numbers without spaces or hyphens", () => {
    const record = sanitizeRecordPayload({
      vehicleNumber: "MP-04-SS-8925",
      registrationNumber: "mp 04 ss 8925",
    });

    expect(record.vehicleNumber).toBe("MP04SS8925");
    expect(record.registrationNumber).toBe("MP04SS8925");
  });

  it("preserves structured Health members and derives the member count", () => {
    const record = sanitizeRecordPayload({
      documentCategory: "Health Insurance",
      customerName: "Apurv Gour",
      proposerName: "Apurv Gour",
      productUin: "ICIHLIP26054V052526",
      insuredMembers: [
        {
          name: "Apurv Gour",
          dateOfBirth: "28/04/1989",
          age: "37",
          gender: "Male",
          relationship: "Self",
          firstPolicyInceptionDate: "30/07/2025",
          specificConditions: "Not Applicable",
          unsupported: "drop me",
        },
        {
          name: "Pragya Bhartiya",
          dateOfBirth: "29/10/1988",
          age: "37",
          gender: "Female",
          relationship: "Spouse",
        },
        {
          name: "Avyana Gour",
          dateOfBirth: "01/11/2021",
          age: "4",
          gender: "Female",
          relationship: "Daughter",
        },
      ],
      numberOfInsuredMembers: 99,
    });

    expect(record.numberOfInsuredMembers).toBe(3);
    expect(record.insuredMembers).toHaveLength(3);
    expect(record.insuredMembers[0]).toEqual({
      name: "Apurv Gour",
      dateOfBirth: "1989-04-28",
      age: "37",
      gender: "Male",
      abhaId: "",
      relationship: "Self",
      preExistingDiseases: "",
      firstPolicyInceptionDate: "2025-07-30",
      specificConditions: "Not Applicable",
    });
    expect(record.insuredMembers[0]).not.toHaveProperty("unsupported");
  });

  it("does not require fuel type before saving motor reviews", () => {
    const validation = getReviewValidation({
      sourceFile: "motor-policy.pdf",
      extractedData: {
        insuredName: "LEENA SAJWANI",
        policyNumber: "3001/393418852/01/000",
        insuranceCompany: "ICICI Lombard",
        premium: "6662.00",
        startDate: "26/05/2026",
        expiryDate: "25/05/2027",
        vehicleNumber: "MP04CR2712",
        engineNumber: "D4FCGM128109",
        chassisNumber: "MALC281RLGM127005",
        idv: "400000.00",
        contactNumber: "9876543210",
        contactPerson: "LEENA SAJWANI",
        clientId: "11111111-1111-4111-8111-111111111111",
      },
    });

    expect(validation.requiredKeys).not.toContain("fuelType");
    expect(validation.missingRequired).not.toContain("Fuel Type");
    expect(validation.valid).toBe(true);
  });

  it("never requires Motor identifiers when an authoritative Health category is present", () => {
    const record = sanitizeRecordPayload({
      documentCategory: "Health Insurance",
      documentFormat: "ICICI_LOMBARD_HEALTH_ELEVATE_V1",
      insuredName: "Apurv Gour",
      policyNumber: "100012108201",
      insuranceCompany: "ICICI Lombard General Insurance Company Limited",
      policyType: "FLOATER",
      premium: "24614.00",
      startDate: "30/07/2026",
      expiryDate: "29/07/2027",
      contactPerson: "Apurv Gour",
      contactNumber: "9876543210",
      clientId: "11111111-1111-4111-8111-111111111111",
      vehicleNumber: "FALSEPOSITIVE",
      makeModel: "False motor extraction noise",
      engineNumber: "",
      chassisNumber: "",
    });
    const validation = getReviewValidation({
      sourceFile: "Apurv Gour- health policy- 26-27.pdf",
      extractedData: record,
      manualFields: Object.keys(record),
    });

    expect(validation.resolvedSchema?.groupId).toBe("health");
    expect(validation.requiredKeys).not.toEqual(expect.arrayContaining(["engineNumber", "chassisNumber"]));
    expect(validation.missingRequired).not.toEqual(
      expect.arrayContaining(["Engine Number", "Chassis Number"]),
    );
    expect(validation.valid).toBe(true);
  });

  it("allows saving a complete review when only Client ID is pending through a request", () => {
    const validation = {
      valid: false,
      missingRequired: ["Client ID"],
      contactErrors: [],
    };

    expect(canSaveWithPendingClientId(validation, "10000000-0000-4000-8000-000000000001")).toBe(true);
    expect(canSaveWithPendingClientId(validation, "")).toBe(false);
    expect(
      canSaveWithPendingClientId(
        { ...validation, missingRequired: ["Client ID", "Policy Number"] },
        "request-id",
      ),
    ).toBe(false);
    expect(
      canSaveWithPendingClientId({ ...validation, contactErrors: ["Invalid phone"] }, "request-id"),
    ).toBe(false);
  });

  it("validates contact person as required and name-only", () => {
    expect(validateContactPerson("")).toBe("Contact Person is required.");
    expect(validateContactPerson("Asha Sharma")).toBe("");
    expect(validateContactPerson("A. Sharma")).toBe("");
    expect(validateContactPerson("Asha 123")).toBe("Contact Person cannot contain numbers.");
    expect(validateContactPerson("Asha-Sharma")).toBe("Contact Person cannot contain numbers.");
  });

  it("validates contact number as exactly 10 digits", () => {
    expect(validateContactNumber("")).toBe("Contact Number is required.");
    expect(validateContactNumber("9876543210")).toBe("");
    expect(validateContactNumber("XXXXXX4257")).toBe("");
    expect(validateContactNumber("91******92")).toBe("");
    expect(validateContactNumber("98765 43210")).toBe("");
    expect(validateContactNumber("987654321")).toBe(
      "Contact Number must be exactly 10 digits or a masked policy contact number.",
    );
    expect(validateContactNumber("987654321A")).toBe(
      "Contact Number must be exactly 10 digits or a masked policy contact number.",
    );
  });

  it.each([
    ["+91 8818889660", "8818889660"],
    ["88188 89660", "8818889660"],
    ["91 88188 89660", "8818889660"],
    ["918818889660", "8818889660"],
    ["08818889660", "8818889660"],
  ])("normalizes pasted Indian contact number %s", (input, expected) => {
    expect(normalizeContactNumber(input)).toBe(expected);
    expect(sanitizeRecordPayload({ contactNumber: input }).contactNumber).toBe(expected);
  });

  it("includes contact format errors in review validation", () => {
    const validation = getReviewValidation(
      {
        sourceFile: "manual-entry",
        extractedData: {
          insuredName: "Example Client",
          policyNumber: "POL-001",
          insuranceCompany: "Example Insurer",
          premium: "1000",
          startDate: "01/01/2026",
          expiryDate: "01/01/2027",
          contactPerson: "Example 42",
          contactNumber: "987654321",
        },
      },
      {
        resolvedSchema: {
          groupId: "health",
          groupLabel: "Health Policy",
          policyId: "health-individual",
          policyName: "Individual Health",
          fields: [
            "insuredName",
            "policyNumber",
            "insuranceCompany",
            "premium",
            "startDate",
            "expiryDate",
            "contactPerson",
            "contactNumber",
          ],
          requiredFields: [
            "insuredName",
            "policyNumber",
            "insuranceCompany",
            "premium",
            "startDate",
            "expiryDate",
          ],
        },
      },
    );

    expect(validation.valid).toBe(false);
    expect(validation.contactFieldErrors.contactPerson).toBe("Contact Person cannot contain numbers.");
    expect(validation.contactFieldErrors.contactNumber).toBe(
      "Contact Number must be exactly 10 digits or a masked policy contact number.",
    );
    expect(validation.contactErrors).toEqual([
      "Contact Person cannot contain numbers.",
      "Contact Number must be exactly 10 digits or a masked policy contact number.",
    ]);
  });

  it("keeps verified New India and IFFCO motor fuel types from extraction", () => {
    const newIndiaData = {
      documentFormat: "NEW_INDIA_MOTOR_V1",
      insuranceCompany: "The New India Assurance Company Limited",
      policyType: "Private Car Package Policy",
      fuelType: "Diesel",
    };
    const iffcoData = {
      documentFormat: "IFFCO_TOKIO_MOTOR_V1",
      insuranceCompany: "IFFCO-TOKIO GENERAL INSURANCE CO.LTD",
      policyType: "TWO WHEELER POLICY",
      fuelType: "Petrol",
    };

    expect(shouldUseExtractedFuelType(newIndiaData)).toBe(true);
    expect(shouldUseExtractedFuelType(iffcoData)).toBe(true);
    expect(getReviewFieldValue({ extractedData: newIndiaData, manualFields: [] }, "fuelType")).toBe("Diesel");
    expect(getReviewFieldValue({ extractedData: iffcoData, manualFields: [] }, "fuelType")).toBe("Petrol");
  });
});
