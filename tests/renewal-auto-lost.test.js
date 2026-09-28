// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import { AUTO_LOST_REASON, moveOverdueRenewalsToLost } from "../src/lib/renewals/auto-lost.js";

describe("automatic renewal loss after 30 days", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$executeRaw.mockResolvedValue(1);
  });

  it("moves only policies overdue by more than 30 days to Lost", async () => {
    const referenceDate = new Date("2026-07-21T12:00:00+05:30");

    const movedCount = await moveOverdueRenewalsToLost({
      organizationId: "org-1",
      referenceDate,
    });

    expect(movedCount).toBe(1);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    const queryCall = prismaMock.$executeRaw.mock.calls[0];
    const sqlStrings = queryCall[0].join(" ");
    expect(sqlStrings).toContain("UPDATE pdf_records");
    expect(sqlStrings).toContain("renewal_status = 'LOST'");
    expect(queryCall).toContain(AUTO_LOST_REASON);
    expect(queryCall).toContain(referenceDate);
  });

  it("handles super admin global scope when organizationId is undefined", async () => {
    prismaMock.$executeRaw.mockResolvedValue(0);
    const referenceDate = new Date("2026-07-21T12:00:00+05:30");

    const movedCount = await moveOverdueRenewalsToLost({ referenceDate });

    expect(movedCount).toBe(0);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    const queryCall = prismaMock.$executeRaw.mock.calls[0];
    expect(queryCall).toContain(true); // isSuperAdmin is true
  });

  it("keeps a legacy null-organization user inside the null tenant boundary", async () => {
    const referenceDate = new Date("2026-07-21T12:00:00+05:30");

    await moveOverdueRenewalsToLost({
      organizationId: null,
      referenceDate,
    });

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    const queryCall = prismaMock.$executeRaw.mock.calls[0];
    expect(queryCall).toContain(false); // isSuperAdmin is false
    expect(queryCall).toContain(null); // orgId is null
  });
});

function renewalRecord(id, expiryDate) {
  return { id, data: { expiryDate }, reviewedData: null };
}
