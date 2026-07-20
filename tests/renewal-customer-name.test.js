import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildPolicyCustomerNameFields,
  normalizeCustomerName,
  resolvePolicyCustomerName,
} from "../src/lib/renewals/customer-name";

describe("renewal customer name persistence", () => {
  it.each([
    "Valued Customer",
    "Dear Customer",
    "Customer",
    "Insured",
    "Policy Holder",
    "Policyholder",
    "Policyholder Name",
    "Applicant",
    "Client",
    "Unknown",
    "NA",
    "N/A",
    "NIL",
    "None",
    "*",
    "30f1e9c6-7b55-4b49-a1c6-748a42df0fd8",
    "9827722712",
    "",
    "   ",
  ])("rejects placeholder name %j", (name) => {
    expect(normalizeCustomerName(name)).toBe("");
  });

  it("normalizes and accepts a real extracted name", () => {
    expect(normalizeCustomerName("  Rahul   Sharma  ")).toBe("Rahul Sharma");
  });

  it("uses contact name first and falls back to the extracted insured name", () => {
    expect(resolvePolicyCustomerName({ contactPerson: "Amit Verma", insuredName: "Rahul Sharma" })).toBe("Amit Verma");
    expect(resolvePolicyCustomerName({ contactPerson: "Customer", insuredName: "Rahul Sharma" })).toBe("Rahul Sharma");
    expect(buildPolicyCustomerNameFields({ insuredName: "Rahul Sharma" })).toEqual({
      contactPersonName: "Rahul Sharma",
      renewalRecipientName: "Rahul Sharma",
    });
  });

  it("wires automatic name persistence into every policy creation workflow", () => {
    for (const file of [
      "src/app/api/policy-records/route.js",
      "src/app/api/records/route.js",
      "src/app/api/records/upload/route.js",
      "src/app/api/renewals/import/route.js",
    ]) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toMatch(/resolvePolicyCustomerName|buildPolicyCustomerNameFields/);
    }
  });

  it("ships a non-destructive one-time backfill for existing policies and portfolios", () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), "prisma/migrations/20260720000200_backfill_extracted_customer_names/migration.sql"),
      "utf8",
    );
    expect(migration).toContain('UPDATE "pdf_records"');
    expect(migration).toContain('UPDATE "customer_profiles"');
    expect(migration).toContain('ELSE record."contact_person_name"');
    expect(migration).toContain('ELSE record."renewal_recipient_name"');
  });
});
