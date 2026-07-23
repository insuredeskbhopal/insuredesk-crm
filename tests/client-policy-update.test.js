// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    clientAccount: { findFirst: vi.fn() },
    policyRecord: { findFirst: vi.fn(), update: vi.fn() },
    task: { findFirst: vi.fn() },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(), getAuditMetadata: () => ({}) }));
vi.mock("@/lib/records", () => ({ normalizeRecord: (record) => record }));
vi.mock("@/app/lib/dashboard-helpers", () => ({
  formatReviewValidationError: () => "Review incomplete",
  getReviewValidation: () => ({ valid: true, contactErrors: [], missingRequired: [] }),
}));

const CLIENT_ID = "50000000-0000-4000-8000-000000000001";
const OTHER_CLIENT_ID = "50000000-0000-4000-8000-000000000002";
const ORGANIZATION_ID = "20000000-0000-4000-8000-000000000001";
const POLICY_ID = "60000000-0000-4000-8000-000000000001";
const REQUEST_ID = "10000000-0000-4000-8000-000000000001";

describe("policy Client ID update authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({
      id: "agent-1",
      userId: "agent-1",
      role: "AGENT",
      organizationId: ORGANIZATION_ID,
    });
    prismaMock.policyRecord.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...existingPolicy(), ...data }),
    );
  });

  it("does not let an agent clear an existing active Client ID", async () => {
    prismaMock.policyRecord.findFirst.mockResolvedValueOnce(existingPolicy({
      reviewedData: policyData(CLIENT_ID),
      data: policyData(CLIENT_ID),
    }));
    prismaMock.clientAccount.findFirst.mockResolvedValueOnce({ id: CLIENT_ID });
    const { PUT } = await import("../src/app/api/policy-records/[id]/route.js");

    const response = await PUT(updateRequest(policyData("")), {
      params: Promise.resolve({ id: POLICY_ID }),
    });

    expect(response.status).toBe(403);
    expect(prismaMock.policyRecord.update).not.toHaveBeenCalled();
  });

  it("does not let direct selection detach a policy from an active Client ID request", async () => {
    prismaMock.policyRecord.findFirst.mockResolvedValueOnce(existingPolicy({
      reviewedData: policyData(""),
      data: policyData(""),
      clientIdRequestId: REQUEST_ID,
      clientIdPending: true,
    }));
    prismaMock.task.findFirst.mockResolvedValueOnce({
      id: REQUEST_ID,
      module: "CLIENT_ID_REQUEST",
      status: "OPEN",
      organizationId: ORGANIZATION_ID,
      customerName: "Vijay Kumar Mishra",
      customerMobile: "9876543210",
      metadata: { email: "" },
    });
    const { PUT } = await import("../src/app/api/policy-records/[id]/route.js");

    const response = await PUT(updateRequest(policyData(CLIENT_ID)), {
      params: Promise.resolve({ id: POLICY_ID }),
    });

    expect(response.status).toBe(409);
    expect(prismaMock.policyRecord.update).not.toHaveBeenCalled();
  });

  it("does not mistake a raw legacy PDF reference for an existing portal link", async () => {
    prismaMock.policyRecord.findFirst.mockResolvedValue(existingPolicy({
      reviewedData: policyData(""),
      data: policyData("INSURER-REFERENCE-123"),
    }));
    prismaMock.clientAccount.findFirst.mockResolvedValue({
      id: CLIENT_ID,
      name: "Vijay Kumar Mishra",
      phone: "9876543210",
      email: null,
      organizationId: ORGANIZATION_ID,
    });
    const { PUT } = await import("../src/app/api/policy-records/[id]/route.js");

    const response = await PUT(updateRequest(policyData(CLIENT_ID)), {
      params: Promise.resolve({ id: POLICY_ID }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.policyRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewedData: expect.objectContaining({ clientId: CLIENT_ID }),
        }),
      }),
    );
  });

  it("protects a valid legacy Client ID stored in policy data", async () => {
    prismaMock.policyRecord.findFirst.mockResolvedValueOnce(existingPolicy({
      reviewedData: policyData(""),
      data: policyData(OTHER_CLIENT_ID),
    }));
    prismaMock.clientAccount.findFirst
      .mockResolvedValueOnce({ id: CLIENT_ID })
      .mockResolvedValueOnce({ id: OTHER_CLIENT_ID });
    const { PUT } = await import("../src/app/api/policy-records/[id]/route.js");

    const response = await PUT(updateRequest(policyData(CLIENT_ID)), {
      params: Promise.resolve({ id: POLICY_ID }),
    });

    expect(response.status).toBe(403);
    expect(prismaMock.policyRecord.update).not.toHaveBeenCalled();
  });

  it("blocks direct linking when an unattached active request exists", async () => {
    prismaMock.policyRecord.findFirst.mockResolvedValueOnce(existingPolicy({
      reviewedData: policyData(""),
      data: policyData(""),
    }));
    prismaMock.task.findFirst.mockResolvedValueOnce({ id: REQUEST_ID });
    const { PUT } = await import("../src/app/api/policy-records/[id]/route.js");

    const response = await PUT(updateRequest(policyData(CLIENT_ID)), {
      params: Promise.resolve({ id: POLICY_ID }),
    });

    expect(response.status).toBe(409);
    expect(prismaMock.policyRecord.update).not.toHaveBeenCalled();
  });

  it("rejects a stale edit instead of overwriting a newer policy update", async () => {
    const firstVersion = new Date("2026-07-23T10:00:00.000Z");
    prismaMock.policyRecord.findFirst
      .mockResolvedValueOnce(existingPolicy({ updatedAt: firstVersion }))
      .mockResolvedValueOnce({ updatedAt: new Date("2026-07-23T10:01:00.000Z") });
    prismaMock.clientAccount.findFirst.mockResolvedValue({ id: CLIENT_ID });
    const { PUT } = await import("../src/app/api/policy-records/[id]/route.js");

    const response = await PUT(updateRequest(policyData(CLIENT_ID)), {
      params: Promise.resolve({ id: POLICY_ID }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "This policy changed while you were editing it. Reload and try again.",
    });
    expect(prismaMock.policyRecord.update).not.toHaveBeenCalled();
  });
});

function existingPolicy(overrides = {}) {
  return {
    id: POLICY_ID,
    organizationId: ORGANIZATION_ID,
    createdById: "agent-1",
    sourceFile: "policy.pdf",
    selectedCompany: "ICICI Lombard General Insurance Company Limited",
    selectedPolicyType: "Motor",
    selectedBankSource: "",
    selectedServiceCategory: "",
    clientIdRequestId: null,
    clientIdPending: false,
    clientIdStatus: "LINKED",
    deletedAt: null,
    extractedData: { ...policyData(""), clientId: "" },
    ...overrides,
  };
}

function policyData(clientId) {
  return {
    insuredName: "Vijay Kumar Mishra",
    contactNumber: "9876543210",
    insuranceCompany: "ICICI Lombard General Insurance Company Limited",
    policyType: "Motor",
    policyNumber: "POL-1",
    clientId,
  };
}

function updateRequest(reviewedData) {
  return new NextRequest(`http://localhost/api/policy-records/${POLICY_ID}`, {
    method: "PUT",
    headers: { cookie: "token=staff-token", "Content-Type": "application/json" },
    body: JSON.stringify({ reviewedData }),
  });
}
