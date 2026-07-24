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

  it("maps specific motor sub-types for display", () => {
    const record1 = withRenewalPolicyDisplay({ policyType: "Private Car Comprehensive Policy" });
    expect(record1.policyType).toBe("Private Car");
    expect(record1.displayPolicyType).toBe("Private Car");
    expect(record1.policyFamily).toBe("Motor Policy");

    const record2 = withRenewalPolicyDisplay({ policyType: "Goods Carrying Vehicle Policy" });
    expect(record2.policyType).toBe("Commercial Vehicle");
    expect(record2.displayPolicyType).toBe("Commercial Vehicle");
    expect(record2.policyFamily).toBe("Motor Policy");
  });
});
