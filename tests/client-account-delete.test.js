// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
    clientAccount: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    claim: { findFirst: vi.fn() },
    task: { findFirst: vi.fn() },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(), getAuditMetadata: () => ({}) }));
vi.mock("@/lib/auth/rbac", () => ({
  getTenantFilter: (session) => ({ organizationId: session.organizationId }),
}));

const CLIENT_ID = "50000000-0000-4000-8000-000000000001";
const ORGANIZATION_ID = "20000000-0000-4000-8000-000000000001";

describe("Client ID deletion dependencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({
      id: "30000000-0000-4000-8000-000000000001",
      userId: "30000000-0000-4000-8000-000000000001",
      role: "SUPER_ADMIN",
      organizationId: ORGANIZATION_ID,
    });
    prismaMock.clientAccount.findFirst.mockResolvedValue({
      id: CLIENT_ID,
      name: "Vijay Kumar Mishra",
      phone: "9876543210",
      organizationId: ORGANIZATION_ID,
      deletedAt: null,
    });
    prismaMock.claim.findFirst.mockResolvedValue(null);
    prismaMock.task.findFirst.mockResolvedValue(null);
  });

  it("blocks deletion when a legacy policy stores the Client ID in uppercase", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "policy-1" }]);
    const { DELETE } = await import("../src/app/api/client-accounts/[id]/route.js");

    const response = await DELETE(
      new NextRequest(`http://localhost/api/client-accounts/${CLIENT_ID}`, {
        method: "DELETE",
        headers: { cookie: "token=staff-token" },
      }),
      { params: Promise.resolve({ id: CLIENT_ID }) },
    );

    expect(response.status).toBe(409);
    expect(prismaMock.clientAccount.update).not.toHaveBeenCalled();
    const [query, organizationId, clientId] = prismaMock.$queryRaw.mock.calls[0];
    expect(query.join(" ")).toContain(
      "LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'))",
    );
    expect(query.join(" ")).not.toContain("extracted_data");
    expect(organizationId).toBe(ORGANIZATION_ID);
    expect(clientId).toBe(CLIENT_ID);
  });
});
