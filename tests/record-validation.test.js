import { describe, expect, it } from "vitest";
import {
  sanitizeRecordPayload,
  validateContactNumber,
  validateContactPerson,
} from "../lib/records/validation";
import {
  getReviewFieldValue,
  getReviewValidation,
  shouldUseExtractedFuelType,
} from "../app/lib/dashboard-helpers";

describe("sanitizeRecordPayload", () => {
  it("normalizes whitespace and drops unsupported raw extraction fields", () => {
    const record = sanitizeRecordPayload({
      insuredName: "  Example    Client  ",
      whatsappGroupName: "  Renewal    Team  ",
      sourceText: "raw pdf text",
      riskLocation: "A".repeat(3000),
    });

    expect(record.insuredName).toBe("Example Client");
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
      },
    });

    expect(validation.requiredKeys).not.toContain("fuelType");
    expect(validation.missingRequired).not.toContain("Fuel Type");
    expect(validation.valid).toBe(true);
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
    expect(validateContactNumber("98765 43210")).toBe(
      "Contact Number must be exactly 10 digits or a masked policy contact number.",
    );
    expect(validateContactNumber("987654321")).toBe(
      "Contact Number must be exactly 10 digits or a masked policy contact number.",
    );
    expect(validateContactNumber("987654321A")).toBe(
      "Contact Number must be exactly 10 digits or a masked policy contact number.",
    );
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
          contactNumber: "98765 43210",
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
