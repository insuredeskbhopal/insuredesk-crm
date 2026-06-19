import { describe, expect, it } from "vitest";
import { normalizePolicyFamily, withRenewalPolicyDisplay } from "../src/lib/policies/type-display";

describe("renewal policy type display", () => {
  it("shows broad motor policy families instead of cover wording", () => {
    expect(normalizePolicyFamily({ policyType: "Private Car Package Policy" })).toBe("Motor Policy");
    expect(
      normalizePolicyFamily({ policyType: "Goods Carrying Vehicle Policy - Liability only [Reprint]" }),
    ).toBe("Motor Policy");
    expect(normalizePolicyFamily({ policyType: "Zero Depreciation", vehicleNumber: "MP04AB1234" })).toBe(
      "Motor Policy",
    );
  });

  it("maps common non-motor policy types to families", () => {
    expect(normalizePolicyFamily({ policyType: "Standard Fire and Special Perils Policy" })).toBe(
      "Fire Policy",
    );
    expect(normalizePolicyFamily({ policyType: "Whole Life Policy" })).toBe("Life Policy");
    expect(normalizePolicyFamily({ policyType: "Family Floater Health Insurance" })).toBe("Health Policy");
  });

  it("keeps original policy type available while overriding renewal display value", () => {
    const record = withRenewalPolicyDisplay({ policyType: "Private Car Comprehensive Policy" });

    expect(record.policyType).toBe("Motor Policy");
    expect(record.displayPolicyType).toBe("Motor Policy");
    expect(record.originalPolicyType).toBe("Private Car Comprehensive Policy");
  });
});
