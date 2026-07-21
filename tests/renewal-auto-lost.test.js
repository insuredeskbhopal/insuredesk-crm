// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    policyRecord: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import { AUTO_LOST_REASON, moveOverdueRenewalsToLost } from "../src/lib/renewals/auto-lost.js";

describe("automatic renewal loss after 30 days", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.policyRecord.updateMany.mockResolvedValue({ count: 1 });
  });

  it("moves only policies overdue by more than 30 days to Lost", async () => {
    prismaMock.policyRecord.findMany.mockResolvedValue([
      renewalRecord("overdue-31", "2026-06-20"),
      renewalRecord("overdue-30", "2026-06-21"),
      renewalRecord("invalid-expiry", "not-a-date"),
    ]);
    const referenceDate = new Date("2026-07-21T12:00:00+05:30");

    const movedCount = await moveOverdueRenewalsToLost({
      organizationId: "org-1",
      referenceDate,
    });

    expect(movedCount).toBe(1);
    expect(prismaMock.policyRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["overdue-31"] }, organizationId: "org-1" }),
        data: {
          renewalStatus: "LOST",
          isActivePolicy: false,
          lostReason: AUTO_LOST_REASON,
          renewalDate: referenceDate,
        },
      }),
    );
  });

  it("does not write when no policy is beyond the 30-day boundary", async () => {
    prismaMock.policyRecord.findMany.mockResolvedValue([renewalRecord("overdue-30", "2026-06-21")]);

    await expect(
      moveOverdueRenewalsToLost({ referenceDate: new Date("2026-07-21T12:00:00+05:30") }),
    ).resolves.toBe(0);
    expect(prismaMock.policyRecord.updateMany).not.toHaveBeenCalled();
  });

  it("keeps a legacy null-organization user inside the null tenant boundary", async () => {
    prismaMock.policyRecord.findMany.mockResolvedValue([renewalRecord("legacy-overdue", "2026-06-20")]);

    await moveOverdueRenewalsToLost({
      organizationId: null,
      referenceDate: new Date("2026-07-21T12:00:00+05:30"),
    });

    expect(prismaMock.policyRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: null }) }),
    );
    expect(prismaMock.policyRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: null }) }),
    );
  });
});

function renewalRecord(id, expiryDate) {
  return { id, data: { expiryDate }, reviewedData: null };
}
