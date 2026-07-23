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
    task: { upsert: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    policyRecord: {
      findMany: vi.fn(),
    },
    claim: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    claimDocument: {
      create: vi.fn(),
      findFirst: vi.fn(),
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

  it("revokes stale client sessions when the account is not found in the token organization", async () => {
    const { GET } = await import("../src/app/api/client/profile/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce(null);

    const response = await GET(nextRequest("http://localhost/api/client/profile"));

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("token=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(prismaMock.clientAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client-1", organizationId: "org-1", deletedAt: null },
      }),
    );
  });

  it("allows legacy client sessions with a null organization boundary", async () => {
    const { GET } = await import("../src/app/api/client/profile/route.js");
    verifyJWTMock.mockResolvedValueOnce({
      role: "CLIENT",
      customerId: "client-1",
      organizationId: null,
    });
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({
      id: "client-1",
      name: "Client One",
      phone: "9876543210",
      email: "",
      createdAt: new Date("2026-07-01T00:00:00Z"),
    });

    const response = await GET(nextRequest("http://localhost/api/client/profile"));

    expect(response.status).toBe(200);
    expect(prismaMock.clientAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client-1", organizationId: null, deletedAt: null },
      }),
    );
  });

  it("revokes an old client session after the MPIN credential changes", async () => {
    const { GET } = await import("../src/app/api/client/profile/route.js");
    verifyJWTMock.mockResolvedValueOnce({
      role: "CLIENT",
      customerId: "client-1",
      organizationId: "org-1",
      credentialVersion: 1,
    });
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({
      id: "client-1",
      name: "Client One",
      phone: "9876543210",
      email: "",
      organizationId: "org-1",
    });
    prismaMock.task.findUnique.mockResolvedValueOnce({ metadata: { credentialVersion: 2 } });

    const response = await GET(nextRequest("http://localhost/api/client/profile"));

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("returns portal-safe policy fields without raw CRM data", async () => {
    const { GET } = await import("../src/app/api/client/policies/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({ id: "client-1" });
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
    expect(prismaMock.$queryRaw.mock.calls[0][0].join(" ")).toContain(
      "LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'))",
    );
  });

  it("prevents a client from taking another active Client ID's phone number", async () => {
    const { PATCH } = await import("../src/app/api/client/profile/route.js");
    prismaMock.clientAccount.findFirst
      .mockResolvedValueOnce({
        id: "client-1",
        name: "Client One",
        phone: "9876543210",
        email: "client@example.com",
        organizationId: "org-1",
      })
      .mockResolvedValueOnce({ id: "client-2" });

    const response = await PATCH(
      nextRequest("http://localhost/api/client/profile", {
        phone: "9123456789",
        email: "client@example.com",
      }),
    );

    expect(response.status).toBe(409);
    expect(prismaMock.clientAccount.update).not.toHaveBeenCalled();
  });

  it("does not create a client claim for a policy outside the client account", async () => {
    const { POST } = await import("../src/app/api/client/claims/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({
      id: "client-1",
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

  it("rechecks claim policy ownership after acquiring the policy lock", async () => {
    const { POST } = await import("../src/app/api/client/claims/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({
      id: "client-1",
      name: "Client One",
      phone: "9876543210",
      organizationId: "org-1",
    });
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ id: "policy-1", policy_number: "POL-1" }])
      .mockResolvedValueOnce([]);

    const response = await POST(
      nextRequest("http://localhost/api/client/claims", {
        policyNo: "POL-1",
        claimType: "Motor",
      }),
    );

    expect(response.status).toBe(403);
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prismaMock.claim.create).not.toHaveBeenCalled();
  });

  it("rechecks service-request policy ownership after acquiring the policy lock", async () => {
    const { POST } = await import("../src/app/api/client/service-requests/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({
      id: "client-1",
      name: "Client One",
      phone: "9876543210",
      email: "client@example.com",
      organizationId: "org-1",
    });
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "policy-1" }]).mockResolvedValueOnce([]);

    const response = await POST(
      nextRequest("http://localhost/api/client/service-requests", {
        requestType: "SUPPORT",
        policyNo: "POL-1",
        details: "Please review this policy.",
      }),
    );

    expect(response.status).toBe(403);
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  it("fetches client claims only for policy numbers linked to the client account", async () => {
    const { GET } = await import("../src/app/api/client/claims/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({
      id: "client-1",
      phone: "9876543210",
    });
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "policy-1", policy_number: "POL-1" }]);
    prismaMock.claim.findMany.mockResolvedValueOnce([]);

    await GET(nextRequest("http://localhost/api/client/claims"));

    expect(prismaMock.claim.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          OR: expect.arrayContaining([
            { metadata: { path: ["customerId"], equals: "client-1" } },
            {
              policyNo: { in: ["POL-1"] },
              mobileNo: { endsWith: "9876543210" },
            },
          ]),
        }),
      }),
    );

    const [query, organizationId, customerId] = prismaMock.$queryRaw.mock.calls[0];
    expect(query.join(" ")).toContain("organization_id IS NOT DISTINCT FROM");
    expect(query.join(" ")).toContain(
      "LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId'))",
    );
    expect(organizationId).toBe("org-1");
    expect(customerId).toBe("client-1");
  });

  it("does not expose a claim assigned to another Client ID through a recycled phone or policy", async () => {
    const { GET } = await import("../src/app/api/client/claims/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({
      id: "client-1",
      phone: "9876543210",
    });
    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "policy-1", policy_number: "POL-1" }]);
    prismaMock.claim.findMany.mockResolvedValueOnce([
      {
        id: "claim-1",
        policyNo: "POL-1",
        mobileNo: "9876543210",
        metadata: { customerId: "client-2" },
        remarks: [],
        documents: [],
      },
    ]);

    const response = await GET(nextRequest("http://localhost/api/client/claims"));
    const body = await response.json();

    expect(body.claims).toEqual([]);
  });

  it("denies claim document access when claim metadata belongs to another Client ID", async () => {
    const { GET } = await import("../src/app/api/client/claims/[id]/documents/route.js");
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({
      id: "client-1",
      name: "Client One",
      phone: "9876543210",
      organizationId: "org-1",
    });
    prismaMock.claim.findFirst.mockResolvedValueOnce({
      id: "claim-1",
      policyNo: "POL-1",
      mobileNo: "9876543210",
      metadata: { customerId: "client-2" },
    });

    const response = await GET(
      nextRequest("http://localhost/api/client/claims/claim-1/documents?documentId=document-1"),
      { params: Promise.resolve({ id: "claim-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Claim not found");
    expect(prismaMock.claimDocument.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
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
