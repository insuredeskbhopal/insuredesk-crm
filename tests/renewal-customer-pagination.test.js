// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRawUnsafe: vi.fn(),
    policyRecord: { findMany: vi.fn() },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));

import { GET } from "../src/app/api/renewals/customers/route.js";

const requestFor = (query) => ({
  url: `http://localhost/api/renewals/customers?${query}`,
  cookies: { get: () => ({ value: "session-token" }) },
});

describe("renewal customer request consolidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({ role: "AGENT", userId: "user-1", organizationId: "org-1" });
    prismaMock.policyRecord.findMany.mockResolvedValue([]);
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql, ...params) => {
      if (/SELECT \*\s+FROM filtered_groups\s+ORDER BY/.test(sql)) return [];
      const counts = { All: 40, Motor: 12, Fire: 9, Other: 4 };
      return [{ count: counts[params[8]] ?? 0 }];
    });
  });

  it("returns all tab counts in one response without repeating the selected count query", async () => {
    const response = await GET(
      requestFor("page=1&limit=10&policyType=Motor&includeCategoryCounts=true"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      totalCount: 12,
      categoryCounts: { all: 40, motor: 12, warehouse: 9, other: 4 },
    });
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(5);
    for (const call of prismaMock.$queryRawUnsafe.mock.calls) {
      expect(call[1]).toBe(false);
      expect(call[2]).toBe("org-1");
    }
  });

  it("skips category scans when the client already has counts", async () => {
    const response = await GET(
      requestFor("page=2&limit=10&policyType=Motor&includeCategoryCounts=false"),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).not.toHaveProperty("categoryCounts");
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(2);
  });
});
