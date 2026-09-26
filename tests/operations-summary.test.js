// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    leadGeneration: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findFirst: vi.fn(),
    },
    customerProfile: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    policyRecord: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));

import { GET } from "../src/app/api/operations/summary/route.js";

describe("operations summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({
      role: "AGENT",
      userId: "user-1",
      organizationId: "org-1",
    });
    prismaMock.leadGeneration.count.mockResolvedValue(4);
    prismaMock.leadGeneration.groupBy.mockResolvedValue([
      { status: "New Lead", _count: { id: 2 } },
      { status: "Follow-up Required", _count: { id: 1 } },
    ]);
    prismaMock.leadGeneration.findFirst.mockResolvedValue(null);
    prismaMock.customerProfile.count.mockResolvedValue(2);
    prismaMock.customerProfile.findFirst.mockResolvedValue(null);
    prismaMock.policyRecord.count.mockResolvedValue(8);
    prismaMock.policyRecord.findFirst.mockResolvedValue(null);
  });

  it("returns aggregates only and scopes every query to the signed-in tenant", async () => {
    const response = await GET({ cookies: { get: () => ({ value: "session-token" }) } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.summary).toEqual({
      customerProfiles: 4,
      birthdayProfiles: 2,
      policyRecords: 8,
      openActivities: 3,
      latestProfile: null,
      latestBirthday: null,
      latestPolicy: null,
    });

    const profileWhere = expect.objectContaining({
      organizationId: "org-1",
      createdById: "user-1",
      deletedAt: null,
    });
    expect(prismaMock.leadGeneration.count).toHaveBeenCalledWith({ where: profileWhere });
    expect(prismaMock.leadGeneration.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: profileWhere }),
    );
    expect(prismaMock.leadGeneration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: profileWhere }),
    );
    expect(prismaMock.customerProfile.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-1",
        deletedAt: null,
        dob: { not: null },
      }),
    });

    const policyWhere = expect.objectContaining({ organizationId: "org-1", deletedAt: null });
    expect(prismaMock.policyRecord.count).toHaveBeenCalledWith({ where: policyWhere });
    expect(prismaMock.policyRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: policyWhere }),
    );
  });
});
