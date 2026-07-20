import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { normalizeRecord } from "../src/lib/records";
import { groupRenewalPoliciesByRecipient } from "../src/lib/renewals/whatsapp-message";

describe("renewal portfolio and communication separation", () => {
  it("keeps portfolio identity separate from policy and renewal contacts", () => {
    const policy = normalizeRecord({
      id: "policy-1",
      customerPortfolioId: "portfolio-1",
      contactPersonName: "Abhishek Verma",
      contactPersonMobile: "8839707135",
      contactPersonEmail: "abhishek@example.com",
      renewalRecipientName: "Rahul Sharma",
      renewalRecipientMobile: "9876543210",
      renewalRecipientEmail: "rahul@example.com",
      data: { insuredName: "Anand Soni", contactNumber: "8818889660" },
    });

    expect(policy.customerPortfolioId).toBe("portfolio-1");
    expect(policy.contactPerson).toBe("Abhishek Verma");
    expect(policy.contactNumber).toBe("8839707135");
    expect(policy.renewalRecipientName).toBe("Rahul Sharma");
    expect(policy.renewalRecipientMobile).toBe("9876543210");
  });

  it("partitions one portfolio into messages by renewal recipient mobile", () => {
    const groups = groupRenewalPoliciesByRecipient([
      { id: "A", renewalRecipientName: "Anand", renewalRecipientMobile: "8818889660" },
      { id: "B", renewalRecipientName: "Anand", renewalRecipientMobile: "8818889660" },
      { id: "C", renewalRecipientName: "Abhishek", renewalRecipientMobile: "8839707135" },
      { id: "D", renewalRecipientName: "Anand", renewalRecipientMobile: "8818889660" },
      { id: "E", renewalRecipientName: "Rahul", renewalRecipientMobile: "9876543210" },
    ]);

    expect(groups.map((group) => [group.mobile, group.policies.map((policy) => policy.id)])).toEqual([
      ["8818889660", ["A", "B", "D"]],
      ["8839707135", ["C"]],
      ["9876543210", ["E"]],
    ]);
  });

  it("uses an additive migration and explicit edit modes", () => {
    const migration = fs.readFileSync(path.join(process.cwd(), "prisma/migrations/20260720000100_separate_portfolio_contacts/migration.sql"), "utf8");
    const editRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/renewals/edit/route.js"), "utf8");
    const customerRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/renewals/customers/route.js"), "utf8");

    expect(migration).toContain('ADD COLUMN "customer_portfolio_id" UUID');
    expect(migration).not.toMatch(/DROP\s+(COLUMN|TABLE)/i);
    expect(editRoute).toContain('contactUpdateMode = "policy_only"');
    expect(editRoute).toContain('contactUpdateMode === "move_existing"');
    expect(editRoute).toContain('contactUpdateMode === "create_portfolio"');
    expect(customerRoute).toContain("COALESCE(customer_portfolio_id::text, contact_number) AS portfolio_key");
  });
});
