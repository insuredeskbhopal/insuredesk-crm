import { describe, expect, it } from "vitest";
import { sanitizeRecordPayload } from "../lib/record-validation";
import { getReviewValidation } from "../app/lib/dashboard-helpers";

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

  it("normalizes registration numbers without spaces or hyphens", () => {
    const record = sanitizeRecordPayload({
      vehicleNumber: "MP-04-SS-8925",
      registrationNumber: "mp 04 ss 8925"
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
        contactPerson: "LEENA SAJWANI"
      }
    });

    expect(validation.requiredKeys).not.toContain("fuelType");
    expect(validation.missingRequired).not.toContain("Fuel Type");
    expect(validation.valid).toBe(true);
  });
});
