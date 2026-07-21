// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: { $queryRawUnsafe: vi.fn() },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));
vi.mock("@/app/lib/reporting/filters", () => ({
  startOfDay: () => new Date("2026-07-21T00:00:00"),
}));
vi.mock("@/lib/renewals/companies", () => ({
  normalizeRenewalInsuranceCompany: (value) => value || "",
}));

import { GET } from "../src/app/api/renewals/follow-ups/route.js";

const requestFor = (query) => ({
  url: `http://localhost/api/renewals/follow-ups?${query}`,
  cookies: { get: () => ({ value: "session-token" }) },
});

describe("renewal follow-up pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({ role: "AGENT", userId: "user-1", organizationId: "org-1" });
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql) => {
      if (sql.includes("ORDER BY follow_up_date")) {
        return [
          {
            id: "policy-1",
            insured_name: "Customer One",
            policy_number: "POL-1",
            company: "Insurer One",
            raw_follow_up: "2026-07-20T10:30",
            latest_remark: "Call again",
            assigned_to: "Agent One",
            renewal_recipient_mobile: "919876543210",
            contact_number: "9876543210",
            renewal_status: "ACTIVE",
          },
        ];
      }
      return [
        {
          today_count: 4,
          tomorrow_count: 5,
          this_week_count: 18,
          overdue_count: 31,
          selected_count: 31,
        },
      ];
    });
  });

  it("returns a lightweight tenant-scoped page with aggregate filter counts", async () => {
    const response = await GET(requestFor("filter=overdue&page=2&limit=25"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      totalCount: 31,
      pages: 2,
      currentPage: 2,
      filter: "overdue",
      filterCounts: { today: 4, tomorrow: 5, this_week: 18, overdue: 31 },
      followUps: [
        expect.objectContaining({
          id: "policy-1",
          insuredName: "Customer One",
          nextFollowUpDate: "2026-07-20T10:30",
          latestRemark: "Call again",
        }),
      ],
    });
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(2);

    for (const call of prismaMock.$queryRawUnsafe.mock.calls) {
      expect(call[0]).toContain("pr.organization_id IS NOT DISTINCT FROM $2::uuid");
      expect(call.slice(1, 5)).toEqual([false, "org-1", "2026-07-21", "overdue"]);
    }
    const dataCall = prismaMock.$queryRawUnsafe.mock.calls.find(([sql]) =>
      sql.includes("ORDER BY follow_up_date"),
    );
    expect(dataCall.slice(-2)).toEqual([25, 25]);
    expect(dataCall[0]).not.toMatch(/SELECT\s+\*/i);
  });

  it("keeps a user without an organization scoped to null-tenant records", async () => {
    verifyJWTMock.mockResolvedValue({ role: "AGENT", userId: "user-1", organizationId: null });

    const response = await GET(requestFor("filter=today&page=1&limit=999"));

    expect(response.status).toBe(200);
    for (const call of prismaMock.$queryRawUnsafe.mock.calls) {
      expect(call[1]).toBe(false);
      expect(call[2]).toBeNull();
    }
    const dataCall = prismaMock.$queryRawUnsafe.mock.calls.find(([sql]) =>
      sql.includes("ORDER BY follow_up_date"),
    );
    expect(dataCall.slice(-2)).toEqual([100, 0]);
  });

  it("loads 25 rows at a time in the UI and cancels stale requests", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/(dashboard)/dashboard/renewals/follow-ups/page.js"),
      "utf8",
    );

    expect(source).toContain("const PAGE_SIZE = 25");
    expect(source).toContain("/api/renewals/follow-ups?");
    expect(source).toContain("new window.AbortController()");
    expect(source).toContain("requestRef.current?.abort()");
    expect(source).toContain("Previous");
    expect(source).toContain("Next");
    expect(source).not.toContain("limit=500");
  });
});
