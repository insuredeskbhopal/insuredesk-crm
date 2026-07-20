// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, verifyJWTMock, logAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
    auditLog: {
      findMany: vi.fn(),
    },
    customerProfile: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    policyRecord: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  verifyJWTMock: vi.fn(),
  logAuditMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));
vi.mock("@/lib/auth/rbac", () => ({ getTenantFilter: () => ({}) }));
vi.mock("@/lib/audit", () => ({
  getAuditMetadata: () => ({ ipAddress: "test", userAgent: "vitest" }),
  logAudit: logAuditMock,
}));
vi.mock("@/lib/records", () => ({
  normalizeRecord: (record) => record.normalized || record,
}));
vi.mock("@/lib/policies/type-display", () => ({
  withRenewalPolicyDisplay: (policy) => policy,
}));
vi.mock("@/lib/renewals/dates", () => ({
  sortByDaysLeftAscending: (a, b) => Number(a.daysRemaining) - Number(b.daysRemaining),
  withRenewalWindowDisplay: (policy) => policy,
}));

describe("renewal action isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({
      userId: "user-1",
      name: "Renewal User",
      role: "SUPER_ADMIN",
      organizationId: null,
    });
    prismaMock.customerProfile.findFirst.mockResolvedValue(null);
    prismaMock.customerProfile.create.mockResolvedValue({ id: "portfolio-1" });
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    prismaMock.policyRecord.findUnique.mockResolvedValue(null);
  });

  it("keeps the explicitly selected policy first even outside the normal renewal window", async () => {
    const requested = renewalRecord("policy-requested", 75);
    const otherDuePolicy = renewalRecord("policy-other", 5);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: requested.id }, { id: otherDuePolicy.id }]);
    prismaMock.policyRecord.findMany.mockResolvedValue([requested, otherDuePolicy]);

    const { GET } = await import("../src/app/api/renewals/customers/[phone]/route.js");
    const response = await GET(
      renewalRequest("http://localhost/api/renewals/customers/9876543210?policyId=policy-requested"),
      { params: Promise.resolve({ phone: "9876543210" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.policies.map((policy) => policy.id)).toEqual(["policy-requested", "policy-other"]);
  });

  it("uses policy history outside the renewal window to resolve the portfolio contact", async () => {
    const correctHistoricalContact = renewalRecord("policy-history", 365, {
      contactPerson: "Anand Soni",
    });
    const duePolicyWithWrongContact = renewalRecord("policy-due", 5, {
      contactPerson: "Siddharth Chouhan",
    });
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { id: correctHistoricalContact.id },
      { id: duePolicyWithWrongContact.id },
    ]);
    prismaMock.policyRecord.findMany.mockResolvedValue([
      correctHistoricalContact,
      duePolicyWithWrongContact,
    ]);

    const { GET } = await import("../src/app/api/renewals/customers/[phone]/route.js");
    const response = await GET(
      renewalRequest("http://localhost/api/renewals/customers/8818889660"),
      { params: Promise.resolve({ phone: "8818889660" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.profile.contactPerson).toBe("Anand Soni");
    expect(payload.policies.map((policy) => policy.id)).toEqual(["policy-due"]);
  });

  it("preserves contact, premium, and original data when an edit leaves optional fields blank", async () => {
    prismaMock.policyRecord.findFirst.mockResolvedValue({
      id: "policy-1",
      data: {
        insuredName: "Example Industries",
        contactPersonName: "Existing Contact",
        premium: "On request",
        expiryDate: "invalid-old-date",
        engineNumber: "ENGINE-1",
      },
      reviewedData: { remark: "Existing remark" },
      renewalStatus: "ACTIVE",
      isActivePolicy: true,
    });
    prismaMock.policyRecord.update.mockResolvedValue({ id: "policy-1" });

    const { POST } = await import("../src/app/api/renewals/edit/route.js");
    const response = await POST(renewalRequest("http://localhost/api/renewals/edit", {
      policyId: "policy-1",
      insuredName: "Example Industries",
      contactNumber: "",
      policyNumber: "POLICY-1",
      insuranceCompany: "Example Insurer",
      policyType: "Fire",
      premium: "",
      expiryDate: "2026-08-31",
      renewalStatus: "ACTIVE",
    }));
    const update = prismaMock.policyRecord.update.mock.calls[0][0].data;

    expect(response.status).toBe(200);
    expect(update.reviewedData).toMatchObject({
      contactPersonName: "Existing Contact",
      premium: "On request",
      engineNumber: "ENGINE-1",
      remark: "Existing remark",
      expiryDate: "2026-08-31",
    });
  });

  it("rejects invalid portfolio phone assignment before matching any policies", async () => {
    const { POST } = await import("../src/app/api/renewals/assign/route.js");
    const response = await POST(renewalRequest("http://localhost/api/renewals/assign", {
      phone: "not-a-phone",
      assignedToUserId: "agent-1",
    }));

    expect(response.status).toBe(400);
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});

function renewalRecord(id, daysRemaining, overrides = {}) {
  return {
    id,
    renewedPolicyId: null,
    normalized: {
      id,
      insuredName: "Example Industries",
      contactNumber: "9876543210",
      daysRemaining,
      expiryDate: "2026-08-31",
      isActivePolicy: true,
      renewalStatus: "ACTIVE",
      premium: 1000,
      sumInsured: 100000,
      ...overrides,
    },
  };
}

function renewalRequest(url, body) {
  return {
    url,
    cookies: { get: () => ({ value: "test-token" }) },
    headers: { get: () => null },
    json: async () => body,
  };
}
