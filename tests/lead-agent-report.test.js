// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRawMock } = vi.hoisted(() => ({ queryRawMock: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { $queryRawUnsafe: queryRawMock } }));

import { loadLeadAgentReport } from "../src/lib/reports/lead-generation.js";

describe("Super Admin lead agent report", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const agentRows = [
      {
        created_by_id: "00000000-0000-4000-8000-000000000001",
        agent_name: "Agent One",
        agent_email: "agent@example.com",
        total_leads: 12,
        new_leads: 4,
        follow_up_required: 3,
        interested: 2,
        converted: 2,
        lost: 1,
        latest_lead_at: new Date("2026-07-21T00:00:00Z"),
        agent_count: 3,
      },
    ];
    queryRawMock
      .mockResolvedValueOnce(agentRows)
      .mockResolvedValueOnce([{ active_agents: 3, total_leads: 12, converted: 2 }])
      .mockResolvedValueOnce(agentRows);
  });

  it("returns creator-grouped, server-paginated lead totals", async () => {
    const report = await loadLeadAgentReport({
      session: { role: "SUPER_ADMIN", organizationId: "00000000-0000-4000-8000-000000000099" },
      page: 2,
      limit: 1,
    });

    expect(report).toMatchObject({ page: 2, limit: 1, totalAgents: 3, totalPages: 3 });
    expect(report.agents[0]).toMatchObject({ agentName: "Agent One", totalLeads: 12, converted: 2 });
    expect(queryRawMock.mock.calls[0][0]).not.toContain("cp.organization_id");
    expect(queryRawMock.mock.calls[0].at(-2)).toBe(1);
    expect(queryRawMock.mock.calls[0].at(-1)).toBe(1);
  });

  it.each(["ADMIN", "MANAGER", "AGENT", "VIEWER", "CLIENT"])("rejects %s report access without database work", async (role) => {
    await expect(
      loadLeadAgentReport({ session: { role, organizationId: null } }),
    ).rejects.toThrow("Super Admin access is required");
    expect(queryRawMock).not.toHaveBeenCalled();
  });
});
