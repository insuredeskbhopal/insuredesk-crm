// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { logAuditMock, prismaMock, verifyJWTMock } = vi.hoisted(() => {
  const database = {
    clientAccount: { findFirst: vi.fn() },
    policyRecord: { create: vi.fn(), findMany: vi.fn() },
    task: { findFirst: vi.fn() },
    uploadedFile: { findFirst: vi.fn(), update: vi.fn() },
  };
  database.$transaction = vi.fn((operation) =>
    typeof operation === "function" ? operation(database) : Promise.all(operation),
  );
  return {
    logAuditMock: vi.fn(),
    prismaMock: database,
    verifyJWTMock: vi.fn(),
  };
});

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));
vi.mock("@/lib/audit", () => ({
  logAudit: logAuditMock,
  getAuditMetadata: () => ({ ipAddress: "127.0.0.1", userAgent: "vitest" }),
}));
vi.mock("@/lib/records", () => ({ normalizeRecord: (record) => record }));
vi.mock("@/app/lib/dashboard-helpers", () => ({
  formatReviewValidationError: () => "Review incomplete",
  getReviewValidation: () => ({
    valid: true,
    contactErrors: [],
    missingRequired: [],
    resolvedSchema: null,
  }),
}));

const CLIENT_ID = "50000000-0000-4000-8000-000000000001";
const ORGANIZATION_ID = "20000000-0000-4000-8000-000000000001";

describe("primary policy Client ID save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({
      id: "30000000-0000-4000-8000-000000000001",
      userId: "30000000-0000-4000-8000-000000000001",
      role: "AGENT",
      organizationId: ORGANIZATION_ID,
      name: "Agent",
      email: "agent@example.com",
    });
    prismaMock.clientAccount.findFirst.mockResolvedValue({
      id: CLIENT_ID,
      name: "Vijay Kumar Mishra",
      phone: "9876543210",
      email: "vijay@example.com",
      organizationId: ORGANIZATION_ID,
    });
    prismaMock.policyRecord.findMany.mockResolvedValue([]);
    prismaMock.policyRecord.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: "policy-1" }),
    );
  });

  it("saves an auto-fetched same-organization Client ID without requiring reselection", async () => {
    const { POST } = await import("../src/app/api/policy-records/route.js");
    const response = await POST(policyRequest(CLIENT_ID.toUpperCase()));

    expect(response.status).toBe(201);
    const saved = prismaMock.policyRecord.create.mock.calls[0][0].data;
    expect(saved.reviewedData.clientId).toBe(CLIENT_ID);
    expect(saved.data.clientId).toBe(CLIENT_ID);
    expect(saved.extractedData.clientId).toBe("");
    expect(saved.clientIdStatus).toBe("LINKED");
    expect(saved.clientIdRequestId).toBeNull();
  });

  it("rejects a Client ID outside the session organization before creating a policy", async () => {
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce(null);
    const { POST } = await import("../src/app/api/policy-records/route.js");
    const response = await POST(policyRequest(CLIENT_ID));

    expect(response.status).toBe(400);
    expect(prismaMock.clientAccount.findFirst).toHaveBeenCalledWith({
      where: { id: CLIENT_ID, organizationId: ORGANIZATION_ID, deletedAt: null },
      select: { id: true, name: true, phone: true, email: true, organizationId: true },
    });
    expect(prismaMock.policyRecord.create).not.toHaveBeenCalled();
  });

  it("does not let a direct link bypass an active Client ID request", async () => {
    prismaMock.task.findFirst.mockResolvedValueOnce({
      id: "10000000-0000-4000-8000-000000000001",
      module: "CLIENT_ID_REQUEST",
      status: "OPEN",
      organizationId: ORGANIZATION_ID,
      customerName: "Vijay Kumar Mishra",
      customerMobile: "9876543210",
      metadata: { email: "" },
    });
    const { POST } = await import("../src/app/api/policy-records/route.js");
    const response = await POST(
      policyRequest(CLIENT_ID, "10000000-0000-4000-8000-000000000001"),
    );

    expect(response.status).toBe(409);
    expect(prismaMock.policyRecord.create).not.toHaveBeenCalled();
  });

  it("rechecks for a newly created Client ID request before the policy write", async () => {
    prismaMock.task.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "10000000-0000-4000-8000-000000000001",
        module: "CLIENT_ID_REQUEST",
        status: "OPEN",
        organizationId: ORGANIZATION_ID,
        customerName: "Vijay Kumar Mishra",
        customerMobile: "9876543210",
        metadata: { email: "" },
      });
    const { POST } = await import("../src/app/api/policy-records/route.js");

    const response = await POST(policyRequest(CLIENT_ID));

    expect(response.status).toBe(409);
    expect(prismaMock.policyRecord.create).not.toHaveBeenCalled();
  });
});

function policyRequest(clientId, clientIdRequestId = null) {
  const policy = {
    insuredName: "Vijay Kumar Mishra",
    contactNumber: "9876543210",
    insuranceCompany: "ICICI Lombard General Insurance Company Limited",
    policyType: "Motor",
    policyNumber: "POL-1",
    clientId,
  };
  return new NextRequest("http://localhost/api/policy-records", {
    method: "POST",
    headers: { cookie: "token=staff-token", "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceFile: "manual-entry.pdf",
      extractedData: policy,
      reviewedData: policy,
      clientIdRequestId,
      extractionMethod: "manual_entry",
    }),
  });
}
