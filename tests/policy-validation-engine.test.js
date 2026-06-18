import { describe, expect, it } from "vitest";
import {
  validateExtractionNonDestructive,
  validatePolicyCrossFields,
  validatePolicyFields,
} from "../lib/policies/validation-engine.cjs";

describe("policy validation engine", () => {
  it("passes realistic motor policy fields without changing values", () => {
    const data = {
      policyNumber: "45140031260100001004",
      registrationNumber: "MP04TA6636",
      engineNumber: "14GVYP29539",
      chassisNumber: "MAT607331EPH19673",
      startDate: "03/05/2026",
      expiryDate: "02/05/2027",
      netPremium: "4679",
      gstAmount: "842",
      totalPremium: "5521",
    };

    expect(validateExtractionNonDestructive(data)).toEqual({
      status: "passed",
      fieldIssues: [],
      crossFieldIssues: [],
    });
    expect(data.engineNumber).toBe("14GVYP29539");
  });

  it("flags corrupted field values without deleting extraction data", () => {
    const data = {
      policyNumber: "POLICY",
      registrationNumber: "BAD",
      engineNumber: "MP04TA6636",
      chassisNumber: "CHASSIS",
      premium: "five thousand",
    };

    const issues = validatePolicyFields(data);

    expect(issues.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "registration_format",
        "chassis_format",
        "policy_number_format",
        "premium_amount_format",
      ]),
    );
    expect(data.premium).toBe("five thousand");
  });

  it("flags cross-field inconsistencies for reviewer attention", () => {
    const issues = validatePolicyCrossFields({
      registrationNumber: "MP04TA6636",
      engineNumber: "MP04TA6636",
      chassisNumber: "MP04TA6636",
      startDate: "02/05/2027",
      expiryDate: "03/05/2026",
      netPremium: "4679",
      gstAmount: "800",
      totalPremium: "5521",
      policyType: "Two Wheeler Package Policy",
      seatingCapacity: "7",
    });

    expect(issues.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "date_chronology",
        "registration_equals_engine",
        "chassis_equals_engine",
        "premium_total_mismatch",
        "two_wheeler_seating",
      ]),
    );
  });
});
