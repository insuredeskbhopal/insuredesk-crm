// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
    customerProfile: {
      findFirst: vi.fn(),
    },
    policyRecord: {
      findMany: vi.fn(),
    },
    claim: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));

describe("client API data isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({
      role: "CLIENT",
      customerId: "client-1",
      organizationId: "org-1",
    });
  });

  it("does not return a profile unless the customer belongs to the token organization", async () => {
    const { GET } = await import("../src/app/api/client/profile/route.js");
    prismaMock.customerProfile.findFirst.mockResolvedValueOnce(null);

    const response = await GET(nextRequest("http://localhost/api/client/profile"));

    expect(response.status).toBe(404);
    expect(prismaMock.customerProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client-1", organizationId: "org-1", deletedAt: null },
      }),
    );
  });

  it("returns portal-safe policy fields without raw CRM data", async () => {
    const { GET } = await import("../src/app/api/client/policies/route.js");
    prismaMock.customerProfile.findFirst.mockResolvedValueOnce({ id: "client-1" });
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "policy-1" }]);
    prismaMock.policyRecord.findMany.mockResolvedValueOnce([
      {
        id: "policy-1",
        savedAt: new Date("2026-07-01T00:00:00Z"),
        selectedCompany: "Example Insurer",
        selectedPolicyType: "Motor",
        isActivePolicy: true,
        renewalDate: new Date("2027-07-01T00:00:00Z"),
        renewalStatus: "ACTIVE",
        reviewedData: {
          policyNumber: "POL-1",
          insuranceCompany: "Example Insurer",
          policyType: "Motor",
          premium: "1000",
          remark: "Internal CRM note",
          whatsappGroupName: "Internal Group",
          dueCollection: "Sensitive collection note",
        },
        data: {},
      },
    ]);

    const response = await GET(nextRequest("http://localhost/api/client/policies"));
    const body = await response.json();

    expect(body.policies).toHaveLength(1);
    expect(body.policies[0].reviewedData).toMatchObject({
      policyNumber: "POL-1",
      insuranceCompany: "Example Insurer",
      policyType: "Motor",
      premium: "1000",
    });
    expect(body.policies[0].reviewedData).not.toHaveProperty("remark");
    expect(body.policies[0].reviewedData).not.toHaveProperty("whatsappGroupName");
    expect(body.policies[0].reviewedData).not.toHaveProperty("dueCollection");
    expect(body.policies[0]).not.toHaveProperty("pdfFileName");
  });

  it("does not create a client claim for a policy outside the client account", async () => {
    const { POST } = await import("../src/app/api/client/claims/route.js");
    prismaMock.customerProfile.findFirst.mockResolvedValueOnce({
      name: "Client One",
      phone: "9876543210",
    });
    prismaMock.$queryRaw.mockResolvedValueOnce([]);

    const response = await POST(
      nextRequest("http://localhost/api/client/claims", {
        policyNo: "OTHER-POLICY",
        claimType: "Motor",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Policy not found for this client.");
    expect(prismaMock.claim.create).not.toHaveBeenCalled();
  });

  it("fetches client claims only for policy numbers linked to the client account", async () => {
    const { GET } = await import("../src/app/api/client/claims/route.js");
    prismaMock.customerProfile.findFirst.mockResolvedValueOnce({
      phone: "9876543210",
    });
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "policy-1", policy_number: "POL-1" }]);
    prismaMock.claim.findMany.mockResolvedValueOnce([]);

    await GET(nextRequest("http://localhost/api/client/claims"));

    expect(prismaMock.claim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          policyNo: { in: ["POL-1"] },
          mobileNo: { endsWith: "9876543210" },
        }),
      }),
    );
  });
});

function nextRequest(url, body) {
  return new NextRequest(url, {
    method: body ? "POST" : "GET",
    headers: {
      cookie: "token=client-token",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
