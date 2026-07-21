// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    claim: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));

import { GET } from "../src/app/api/claims/route.js";

describe("claims list pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({ role: "AGENT", userId: "user-1", organizationId: "org-1" });
    prismaMock.claim.findMany.mockResolvedValue([
      {
        id: "claim-1",
        insuredName: "Customer One",
        claimNo: "CL-1",
        claimStatus: "Open",
        metadata: {},
        createdAt: new Date("2026-07-20T00:00:00Z"),
        updatedAt: new Date("2026-07-21T00:00:00Z"),
        _count: { documents: 3, remarks: 2 },
      },
    ]);
    prismaMock.claim.count.mockResolvedValueOnce(7).mockResolvedValueOnce(2);
    prismaMock.claim.groupBy.mockResolvedValue([
      { claimStatus: "Open", _count: { id: 5 } },
      { claimStatus: "OPEN", _count: { id: 3 } },
      { claimStatus: "Settled", _count: { id: 2 } },
    ]);
  });

  it("returns lightweight rows, aggregate counters, and tenant-scoped pages", async () => {
    const request = {
      url: "http://localhost/api/claims?page=1&limit=25&filter=all",
      cookies: { get: () => ({ value: "session-token" }) },
    };
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.claims[0]).toMatchObject({
      id: "claim-1",
      isSummary: true,
      documentCount: 3,
      remarkCount: 2,
      documents: [],
      remarks: [],
    });
    expect(JSON.stringify(payload)).not.toContain("dataUrl");
    expect(payload.filterCounts).toMatchObject({ all: 10, open: 8, settled: 2, "follow-up": 2 });
    expect(prismaMock.claim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", deletedAt: null }),
        take: 25,
        skip: 0,
        select: expect.objectContaining({ _count: expect.any(Object) }),
      }),
    );
    expect(prismaMock.claim.findMany.mock.calls[0][0]).not.toHaveProperty("include");
  });
});
