// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRawUnsafe: vi.fn(),
    policyRecord: { findMany: vi.fn() },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: "session-token" }) })),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));

import {
  loadScopedCustomerPolicies,
  loadScopedCustomerPolicyPage,
} from "../src/lib/records/scoped-data.js";

describe("scoped customer policy loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({
      role: "AGENT",
      userId: "user-1",
      organizationId: "org-1",
    });
    prismaMock.policyRecord.findMany.mockResolvedValue([]);
  });

  it("binds the tenant and returns one bounded customer page", async () => {
    prismaMock.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: 120 }])
      .mockResolvedValueOnce([]);

    const result = await loadScopedCustomerPolicyPage({ page: 2, limit: 500, q: "Acme" });

    expect(result).toMatchObject({ page: 2, limit: 50, totalCount: 120, totalPages: 3 });
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    for (const call of prismaMock.$queryRawUnsafe.mock.calls) {
      expect(call[1]).toBe(false);
      expect(call[2]).toBe("org-1");
      expect(call[3]).toBe("%acme%");
      expect(call[0]).toContain("pr.organization_id IS NOT DISTINCT FROM $2::uuid");
      expect(call[0]).toContain("pr.contact_person_mobile");
      expect(call[0]).toContain("pr.renewal_recipient_mobile");
    }
    expect(prismaMock.$queryRawUnsafe.mock.calls[1].slice(-2)).toEqual([50, 50]);
  });

  it("binds the tenant when opening one customer", async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);

    await loadScopedCustomerPolicies("Acme Ltd");

    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const call = prismaMock.$queryRawUnsafe.mock.calls[0];
    expect(call[1]).toBe(false);
    expect(call[2]).toBe("org-1");
    expect(call[3]).toBe("Acme Ltd");
    expect(call[0]).toContain("organization_id IS NOT DISTINCT FROM $2::uuid");
  });
});
