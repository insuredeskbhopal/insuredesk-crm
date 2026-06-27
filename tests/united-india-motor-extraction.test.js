/* @vitest-environment node */
import fs from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

describe("United India motor extraction", () => {
  it("extracts commercial vehicle liability only policy correctly", async () => {
    const file = "tests/fixtures/UNITED_INDIA.pdf";
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text || "", file);

    expect(result.documentFormat).toBe("UNITED_INDIA_MOTOR_V1");
    expect(result.documentCategory).toBe("Motor Insurance");
    expect(result.insuranceCompany).toBe("United India Insurance Company Limited");
    expect(result.policyNumber).toBe("1907023126P104555834");
    expect(result.policyType).toBe("MOTOR INSURANCE - GCV PUBLIC CARRIER OTHER THAN 3 WHEELER LIABILITY ONLY POLICY");
    expect(result.insuredName).toBe("MR SUNEEL KUMAR SHUKLA");
    expect(result.startDate).toBe("25/06/2026");
    expect(result.expiryDate).toBe("24/06/2027");
    expect(result.registrationNumber).toBe("MP-17-G-1891");
    expect(result.engineNumber).toBe("GHD4M70769");
    expect(result.chassisNumber).toBe("MA1ZN2GHKE3A20253");
    expect(result.makeModel).toBe("MAHINDRA & MAHINDRA LIMITED / BOLERO PICK UP FB 2WD BSIII");
    expect(result.manufacturingYear).toBe("2013");
    expect(result.cubicCapacity).toBe("2523");
    expect(result.seatingCapacity).toBe("2");
    expect(result.grossVehicleWeight).toBe("2960");
    expect(result.totalPremium).toBe("16,969.00");
    expect(result.netPremium).toBe("16,149.00");
    expect(result.odPremium).toBe(0);
    expect(result.tpDriverOwner).toBe(16149);
    expect(result.cgst).toBe(410);
    expect(result.sgst).toBe(410);
    expect(result.gstAmount).toBe(820);
  });
});
