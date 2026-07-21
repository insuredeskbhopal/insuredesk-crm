// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
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

import { GET } from "../src/app/api/renewals/daily-work/route.js";

const requestFor = (query) => ({
  url: `http://localhost/api/renewals/daily-work?${query}`,
  cookies: { get: () => ({ value: "session-token" }) },
});

describe("renewal daily work pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({ role: "AGENT", userId: "user-1", organizationId: "org-1" });
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql) => {
      if (sql.includes("activity_counts AS")) {
        return [{
          total_count: 32,
          all_work: 24,
          due_today: 11,
          follow_up_today: 12,
          overdue_follow_up: 9,
          completed_today: 7,
          renewed_today: 3,
          lost_today: 2,
          all_count: 40,
          motor_count: 32,
          warehouse_count: 5,
          other_count: 3,
        }];
      }
      return [{ id: "policy-1", days_remaining: 0 }];
    });
    prismaMock.policyRecord.findMany.mockResolvedValue([
      {
        id: "policy-1",
        savedAt: new Date("2026-07-21T00:00:00Z"),
        data: {
          insuredName: "Customer One",
          policyNumber: "POL-1",
          policyType: "Motor Policy",
          expiryDate: "2026-07-21",
        },
        reviewedData: null,
        renewalStatus: "ACTIVE",
        renewalDate: null,
        isActivePolicy: true,
        selectedCompany: "Example Insurer",
        selectedPolicyType: "Motor Policy",
        customerPortfolioId: null,
        contactPersonName: "Customer One",
        contactPersonMobile: "9999999999",
        contactPersonEmail: "",
        renewalRecipientName: "Customer One",
        renewalRecipientMobile: "9999999999",
        renewalRecipientEmail: "",
        createdById: "user-1",
        createdBy: { name: "Agent One", email: "agent@example.com" },
      },
    ]);
  });

  it("returns a tenant-scoped 25-row page with aggregate task and LOB counts", async () => {
    const response = await GET(requestFor("filter=due_today&lob=motor&page=2&limit=25"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      totalCount: 32,
      pages: 2,
      currentPage: 2,
      summaryCounts: {
        allWork: 24,
        dueToday: 11,
        followUpToday: 12,
        overdueFollowUp: 9,
        completedToday: 7,
      },
      categoryCounts: { all: 40, motor: 32, warehouse: 5, other: 3 },
    });
    expect(payload.policies).toHaveLength(1);
    expect(payload.policies[0]).toMatchObject({ id: "policy-1", insuredName: "Customer One" });
    expect(payload.policies[0]).not.toHaveProperty("coverages");
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(2);

    const dataCall = prismaMock.$queryRawUnsafe.mock.calls.find((call) => !call[0].includes("activity_counts AS"));
    expect(dataCall.slice(1)).toEqual([
      false,
      "org-1",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      "due_today",
      "motor",
      "user-1",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      25,
      25,
    ]);
    expect(prismaMock.policyRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", deletedAt: null }),
      }),
    );

    const countsSql = prismaMock.$queryRawUnsafe.mock.calls.find((call) => call[0].includes("activity_counts AS"))[0];
    expect(countsSql).toContain("actor_work_policy_ids AS");
    expect(countsSql).toContain("audit.user_id = $6::uuid");
    expect(countsSql).toContain("created_at >= $7::timestamptz");
    expect(countsSql).toContain("COUNT(*) FROM actor_work_policy_ids");
  });

  it("skips aggregate scans on later pages when the client already has counts", async () => {
    const response = await GET(
      requestFor("filter=all_work&lob=all&page=3&limit=25&includeCounts=false"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).not.toHaveProperty("totalCount");
    expect(payload).not.toHaveProperty("summaryCounts");
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("keeps a user with missing organization context inside the legacy null tenant", async () => {
    verifyJWTMock.mockResolvedValue({ role: "AGENT", userId: "user-1" });
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    prismaMock.policyRecord.findMany.mockResolvedValue([]);

    const response = await GET(requestFor("filter=all_work&page=1&limit=25"));

    expect(response.status).toBe(200);
    for (const call of prismaMock.$queryRawUnsafe.mock.calls) {
      expect(call[1]).toBe(false);
      expect(call[2]).toBeNull();
    }
  });

  it("replaces the 500-row client snapshot with abortable server pagination", () => {
    const pageSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/(dashboard)/dashboard/renewals/daily-work/page.js"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/renewals/daily-work/route.js"),
      "utf8",
    );

    expect(pageSource).toContain("/api/renewals/daily-work?");
    expect(pageSource).toContain("const PAGE_SIZE = 25");
    expect(pageSource).toContain("signal: controller.signal");
    expect(pageSource).toContain("return () => controller.abort()");
    expect(pageSource).toContain("count: counts.allWork");
    expect(pageSource).not.toContain("limit=500");
    expect(pageSource).not.toContain("/api/renewals/policies?tab=all");
    expect(routeSource).toContain("(expiry_date - $3::date) BETWEEN -30 AND 30");
    for (const legacyLobTerm of [
      "bike",
      "scooter",
      "school\\\\s+bus",
      "passenger\\\\s+carrying",
      "business\\\\s+guard",
      "sookshma",
      "house\\\\s+breaking",
    ]) {
      expect(routeSource).toContain(legacyLobTerm);
    }
  });
});
