// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { normalizeCanonicalPhone, isClientPhoneUniqueInOrg } from "@/lib/client-portal/policies";
import { getOwnedPolicy, getOwnedClaim } from "@/lib/client-portal/session";

describe("ERR-002 Hardening — Canonical Phone Normalization", () => {
  it("normalizes various Indian phone formats to standard 10 digits", () => {
    expect(normalizeCanonicalPhone("9876543210")).toBe("9876543210");
    expect(normalizeCanonicalPhone("+919876543210")).toBe("9876543210");
    expect(normalizeCanonicalPhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizeCanonicalPhone("+91-98765-43210")).toBe("9876543210");
    expect(normalizeCanonicalPhone("919876543210")).toBe("9876543210");
    expect(normalizeCanonicalPhone("09876543210")).toBe("9876543210");
    expect(normalizeCanonicalPhone("00919876543210")).toBe("9876543210");
    expect(normalizeCanonicalPhone("(0) 98765-43210")).toBe("9876543210");
  });

  it("rejects invalid, short, or oversized phone numbers", () => {
    expect(normalizeCanonicalPhone("")).toBe("");
    expect(normalizeCanonicalPhone(null)).toBe("");
    expect(normalizeCanonicalPhone(undefined)).toBe("");
    expect(normalizeCanonicalPhone("12345")).toBe("");
    expect(normalizeCanonicalPhone("123456789")).toBe("");
    expect(normalizeCanonicalPhone("123456789012345")).toBe("");
    expect(normalizeCanonicalPhone("abcdefghij")).toBe("");
  });
});

describe("ERR-002 Hardening — Phone Uniqueness In Organization", () => {
  it("returns true only when exactly 1 active client account has the phone in org", async () => {
    const mockDb = {
      $queryRaw: vi.fn().mockResolvedValueOnce([{ count: 1 }]),
    };
    const isUnique = await isClientPhoneUniqueInOrg({
      organizationId: "org-1",
      phone: "+919876543210",
      database: mockDb,
    });
    expect(isUnique).toBe(true);
  });

  it("returns false when duplicate client accounts share the same phone", async () => {
    const mockDb = {
      $queryRaw: vi.fn().mockResolvedValueOnce([{ count: 2 }]),
    };
    const isUnique = await isClientPhoneUniqueInOrg({
      organizationId: "org-1",
      phone: "9876543210",
      database: mockDb,
    });
    expect(isUnique).toBe(false);
  });

  it("returns false when no accounts exist or phone is invalid", async () => {
    const mockDb = {
      $queryRaw: vi.fn().mockResolvedValueOnce([{ count: 0 }]),
    };
    expect(await isClientPhoneUniqueInOrg({ organizationId: "org-1", phone: "123", database: mockDb })).toBe(false);
    expect(await isClientPhoneUniqueInOrg({ organizationId: "org-1", phone: "9876543210", database: mockDb })).toBe(false);
  });
});

describe("ERR-002 Hardening — Policy Ownership Rules", () => {
  const policyUuid = "0f7b2525-7bd8-4f71-ae21-aee3439d4e9a";

  it("Rule 1: authorizes when explicit clientId matches authenticated client", async () => {
    const mockDb = {
      $queryRaw: vi.fn().mockResolvedValueOnce([{ id: policyUuid }]),
    };
    const result = await getOwnedPolicy({
      customerId: "client-b",
      organizationId: "org-1",
      policyId: policyUuid,
      customer: { id: "client-b", phone: "9876543210" },
      database: mockDb,
    });
    expect(result).toEqual({ id: policyUuid });
    const query = mockDb.$queryRaw.mock.calls[0][0].join(" ");
    expect(query).toContain("LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'))");
  });

  it("Rule 2: DENIES phone fallback when policy has an explicit clientId of another client", async () => {
    // When Client A queries, the query should fail because policy has Client B's clientId
    const mockDb = {
      $queryRaw: vi.fn().mockResolvedValueOnce([]),
    };
    const result = await getOwnedPolicy({
      customerId: "client-a",
      organizationId: "org-1",
      policyId: policyUuid,
      customer: { id: "client-a", phone: "9876543210" },
      database: mockDb,
    });
    expect(result).toBeNull();
    const query = mockDb.$queryRaw.mock.calls[0][0].join(" ");
    // Verify that phone fallback strictly requires policy clientId to be NULL
    expect(query).toContain("NULLIF(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'), '') IS NULL");
  });

  it("Rule 3: DENIES phone fallback when client phone is shared by multiple accounts (duplicate-phone IDOR)", async () => {
    // Database returns empty because subquery `COUNT(*) = 1` evaluates to false
    const mockDb = {
      $queryRaw: vi.fn().mockResolvedValueOnce([]),
    };
    const result = await getOwnedPolicy({
      customerId: "client-shared-1",
      organizationId: "org-1",
      policyId: "unlinked-policy-id",
      customer: { id: "client-shared-1", phone: "9999999999" },
      database: mockDb,
    });
    expect(result).toBeNull();
    const query = mockDb.$queryRaw.mock.calls[0][0].join(" ");
    expect(query).toContain("SELECT COUNT(*)::int");
    expect(query).toContain("FROM client_accounts ca_check");
  });

  it("Rule 4: ALLOWS phone fallback for unlinked policy when client phone is unique in org", async () => {
    const mockDb = {
      $queryRaw: vi.fn().mockResolvedValueOnce([{ id: "unlinked-policy-id" }]),
    };
    const result = await getOwnedPolicy({
      customerId: "client-unique",
      organizationId: "org-1",
      policyId: "unlinked-policy-id",
      customer: { id: "client-unique", phone: "9876543210" },
      database: mockDb,
    });
    expect(result).toEqual({ id: "unlinked-policy-id" });
  });

  it("Rule 5: fails closed when customer has no phone and policy has no clientId", async () => {
    const mockDb = {
      $queryRaw: vi.fn().mockResolvedValueOnce([]),
    };
    const result = await getOwnedPolicy({
      customerId: "client-no-phone",
      organizationId: "org-1",
      policyId: "unlinked-policy-id",
      customer: { id: "client-no-phone", phone: "" },
      database: mockDb,
    });
    expect(result).toBeNull();
  });
});

describe("ERR-002 Hardening — Claim Ownership Isolation", () => {
  it("denies access to a claim when metadata customerId belongs to another client", async () => {
    const mockDb = {
      claim: {
        findFirst: vi.fn().mockResolvedValueOnce({
          id: "claim-1",
          metadata: { customerId: "client-other" },
        }),
      },
    };
    const claim = await getOwnedClaim({
      claimId: "claim-1",
      organizationId: "org-1",
      customer: { id: "client-me", phone: "9876543210" },
      database: mockDb,
    });
    expect(claim).toBeNull();
  });

  it("allows access to a claim when metadata customerId matches authenticated client", async () => {
    const mockClaim = {
      id: "claim-1",
      metadata: { customerId: "client-me" },
    };
    const mockDb = {
      claim: {
        findFirst: vi.fn().mockResolvedValueOnce(mockClaim),
      },
    };
    const claim = await getOwnedClaim({
      claimId: "claim-1",
      organizationId: "org-1",
      customer: { id: "client-me", phone: "9876543210" },
      database: mockDb,
    });
    expect(claim).toEqual(mockClaim);
  });
});
