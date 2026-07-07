/* @vitest-environment node */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");

describe("Liberty motor extraction", () => {
  it("extracts Liberty motor core fields correctly", async () => {
    const file = path.join(process.cwd(), "storage/BADAMI LAL CHOURASIA_MP04MR7706_2026-27 (1).pdf");
    const parsed = await pdf(fs.readFileSync(file));
    const result = extractPolicyFromText(parsed.text || "", "BADAMI LAL CHOURASIA_MP04MR7706_2026-27 (1).pdf");

    expect(result.documentFormat).toBe("LIBERTY_MOTOR_V1");
    expect(result.insuranceCompany).toBe("Liberty General Insurance Limited");
    expect(result.policyNumber).toBe("201620020126710520600000");
    expect(result.policyType).toBe("Two Wheeler Liability Policy");
    expect(result.insuredName).toBe("BADAMI LAL CHOURASIA");
    expect(result.registrationNumber).toBe("MP-04-MR-7706");
    expect(result.manufacturingYear).toBe("2009");
    expect(result.engineNumber).toBe("HA11EA99F07889");
    expect(result.chassisNumber).toBe("MBLHA11ED99F08659");
    expect(result.vehicleMake).toBe("HERO HONDA");
    expect(result.vehicleModel).toBe("CD DELUXE");
    expect(result.cubicCapacity).toBe("100");
    expect(result.seatingCapacity).toBe("2");
    expect(result.totalPremium).toBe("843.00");
    expect(result.netPremium).toBe("714.00");
    expect(result.gstAmount).toBe("129.00");
  });
});
