// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, txMock, verifyJWTMock } = vi.hoisted(() => {
  const tx = {
    policyRecord: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    task: { update: vi.fn() },
    notification: { create: vi.fn() },
  };
  return {
    txMock: tx,
    verifyJWTMock: vi.fn(),
    prismaMock: {
      task: { findFirst: vi.fn() },
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
});

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ verifyJWT: verifyJWTMock }));

const requestItem = {
  id: "10000000-0000-4000-8000-000000000001",
  organizationId: "20000000-0000-4000-8000-000000000001",
  createdById: "30000000-0000-4000-8000-000000000001",
  customerName: "Original Client",
  customerMobile: "9876543210",
  status: "OPEN",
  recordId: null,
  recordLabel: null,
  createdAt: new Date("2026-07-13T09:00:00.000Z"),
  completedAt: null,
  metadata: {
    email: "old@example.com",
    history: [{ event: "REQUESTED", at: "2026-07-13T09:00:00.000Z" }],
  },
};

describe("Client ID request correction workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyJWTMock.mockResolvedValue({
      id: "40000000-0000-4000-8000-000000000001",
      userId: "40000000-0000-4000-8000-000000000001",
      organizationId: requestItem.organizationId,
      role: "SUPER_ADMIN",
      name: "Super Admin",
    });
    prismaMock.task.findFirst.mockResolvedValue({ ...requestItem });
    txMock.policyRecord.updateMany.mockResolvedValue({ count: 2 });
    txMock.notification.create.mockResolvedValue({ id: "notification-1" });
    txMock.task.update.mockImplementation(({ data }) => Promise.resolve({ ...requestItem, ...data }));
  });

  it.each(["NEEDS_CORRECTION", "REJECT"])("requires an administrator note for %s", async (action) => {
    const { PATCH } = await import("../src/app/api/client-id-requests/route.js");
    const response = await PATCH(patchRequest({ requestId: requestItem.id, action, note: "  " }));

    expect(response.status).toBe(400);
    expect(txMock.policyRecord.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it.each(["NEEDS_CORRECTION", "REJECT"])("preserves the request and policies while recording %s", async (action) => {
    const { PATCH } = await import("../src/app/api/client-id-requests/route.js");
    const response = await PATCH(
      patchRequest({ requestId: requestItem.id, action, note: "Correct the client identity." }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(requestItem.id);
    expect(body.status).toBe("WAITING_DOCUMENTS");
    expect(txMock.policyRecord.updateMany).toHaveBeenCalledWith({
      where: { clientIdRequestId: requestItem.id, clientIdPending: true, deletedAt: null },
      data: { clientIdStatus: "ACTION_REQUIRED" },
    });
    expect(txMock.task.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: requestItem.id } }));
    const metadata = txMock.task.update.mock.calls.at(-1)[0].data.metadata;
    expect(metadata.history.at(-1)).toMatchObject({
      event: action,
      note: "Correct the client identity.",
      actorId: "40000000-0000-4000-8000-000000000001",
      identity: { name: "Original Client", phone: "9876543210", email: "old@example.com" },
    });
    expect(metadata.history.at(-1).at).toBeTruthy();
    expect(txMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: requestItem.createdById,
          severity: "WARNING",
          recordId: requestItem.id,
        }),
      }),
    );
  });

  it("synchronizes identity fields and resubmits the same request without duplicating policies", async () => {
    const waitingItem = {
      ...requestItem,
      status: "WAITING_DOCUMENTS",
      metadata: {
        ...requestItem.metadata,
        latestCorrectionNote: "Correct the phone number.",
        history: [...requestItem.metadata.history, { event: "REJECT", note: "Correct the phone number." }],
      },
    };
    prismaMock.task.findFirst.mockResolvedValue(waitingItem);
    verifyJWTMock.mockResolvedValue({
      id: requestItem.createdById,
      userId: requestItem.createdById,
      organizationId: requestItem.organizationId,
      role: "AGENT",
      name: "Requesting Agent",
    });
    txMock.policyRecord.findMany.mockResolvedValue([
      { id: "policy-1", data: { premium: "1000" }, reviewedData: { premium: "1000" }, extractedData: {} },
      { id: "policy-2", data: { premium: "2000" }, reviewedData: null, extractedData: null },
    ]);
    txMock.policyRecord.update.mockResolvedValue({});
    txMock.task.update.mockImplementation(({ data }) => Promise.resolve({ ...waitingItem, ...data }));

    const { PATCH } = await import("../src/app/api/client-id-requests/route.js");
    const response = await PATCH(
      patchRequest({
        requestId: requestItem.id,
        action: "RESUBMIT",
        name: "Corrected Client",
        phone: "9123456789",
        email: "new@example.com",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(requestItem.id);
    expect(body.status).toBe("OPEN");
    expect(txMock.policyRecord.update).toHaveBeenCalledTimes(2);
    expect(txMock.policyRecord.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "policy-1" },
        data: expect.objectContaining({
          clientIdStatus: "PENDING",
          data: expect.objectContaining({
            insuredName: "Corrected Client",
            contactNumber: "9123456789",
            email: "new@example.com",
          }),
        }),
      }),
    );
    expect(txMock.policyRecord.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { id: "policy-2" } }));
    const taskUpdate = txMock.task.update.mock.calls.at(-1)[0];
    expect(taskUpdate.where).toEqual({ id: requestItem.id });
    expect(taskUpdate.data).toMatchObject({ status: "OPEN", customerName: "Corrected Client", customerMobile: "9123456789" });
    expect(taskUpdate.data.metadata.history.at(-1)).toMatchObject({
      event: "RESUBMITTED",
      before: { name: "Original Client", phone: "9876543210", email: "old@example.com" },
      after: { name: "Corrected Client", phone: "9123456789", email: "new@example.com" },
      actorId: requestItem.createdById,
    });
    expect(txMock.notification.create).not.toHaveBeenCalled();
  });
});

function patchRequest(body) {
  return new NextRequest("http://localhost/api/client-id-requests", {
    method: "PATCH",
    headers: { cookie: "token=staff-token", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
