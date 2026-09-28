// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, verifyJWTMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    activityLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    policyRecord: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  verifyJWTMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));
vi.mock("@/lib/auth/rbac", () => ({ getTenantFilter: () => ({}) }));
vi.mock("@/lib/audit", () => ({
  getAuditMetadata: () => ({ ipAddress: "127.0.0.1", userAgent: "vitest" }),
  logAudit: vi.fn(),
}));
vi.mock("@/lib/activities/activity-service", () => ({
  logActivity: vi.fn(),
  ACTIVITY_TYPES: { REMARK: "REMARK", CALL: "CALL", WHATSAPP: "WHATSAPP" },
}));

describe("Renewal Remarks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({
      userId: "user-123",
      name: "Abhishek Verma",
      role: "ADMIN",
      organizationId: "org-1",
    });
    prismaMock.activityLog.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
  });

  it("GET returns 200 with formatted remarks list from reviewedData and data", async () => {
    prismaMock.policyRecord.findMany.mockResolvedValue([
      {
        id: "policy-1",
        reviewedData: {
          renewalRemarks: [
            {
              id: "rem-1",
              text: "Customer asked to call back tomorrow.",
              createdBy: "Abhishek Verma",
              createdAt: "2026-09-28T05:22:08.550Z",
              followUpStatus: "Follow-Up",
              nextFollowUpDate: "2026-09-29T05:22",
            },
          ],
        },
        data: {},
      },
    ]);

    const { GET } = await import("../src/app/api/renewals/remarks/route.js");
    const request = {
      url: "http://localhost/api/renewals/remarks?policyId=policy-1",
      cookies: { get: () => ({ value: "token-123" }) },
    };

    const res = await GET(request);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.remarks).toHaveLength(1);
    expect(body.remarks[0].id).toBe("rem-1");
    expect(body.remarks[0].text).toBe("Customer asked to call back tomorrow.");
    expect(body.remarks[0].author).toBe("Abhishek Verma");
    expect(body.remarks[0].createdBy).toBe("Abhishek Verma");
    expect(body.remarks[0].followUpStatus).toBe("Follow-Up");
  });

  it("GET returns empty array when policyId has no remarks", async () => {
    prismaMock.policyRecord.findMany.mockResolvedValue([
      {
        id: "policy-empty",
        reviewedData: {},
        data: {},
      },
    ]);

    const { GET } = await import("../src/app/api/renewals/remarks/route.js");
    const request = {
      url: "http://localhost/api/renewals/remarks?policyId=policy-empty",
      cookies: { get: () => ({ value: "token-123" }) },
    };

    const res = await GET(request);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.remarks).toEqual([]);
  });

  it("POST returns created remark with author and remark text fields enriched", async () => {
    prismaMock.policyRecord.findMany.mockResolvedValue([
      {
        id: "policy-1",
        renewalStatus: "ACTIVE",
        reviewedData: {},
        data: {},
        updatedAt: new Date("2026-09-28T05:00:00Z"),
      },
    ]);
    prismaMock.policyRecord.updateMany.mockResolvedValue({ count: 1 });

    const { POST } = await import("../src/app/api/renewals/remarks/route.js");
    const request = {
      url: "http://localhost/api/renewals/remarks",
      cookies: { get: () => ({ value: "token-123" }) },
      json: async () => ({
        policyId: "policy-1",
        remark: "Customer requested quotation.",
        followUpStatus: "Follow-Up",
        followUpMode: "Call",
        nextFollowUpDate: "2026-09-29T10:00:00.000Z",
      }),
    };

    const res = await POST(request);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.remark).toBeDefined();
    expect(body.remark.text).toBe("Customer requested quotation.");
    expect(body.remark.author).toBe("Abhishek Verma");
    expect(body.remark.createdBy).toBe("Abhishek Verma");
  });
});
