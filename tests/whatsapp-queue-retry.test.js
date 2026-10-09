// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  session: null,
  row: null,
  queue: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  user: { findFirst: vi.fn() },
  getWhatsAppSessions: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ verifyJWT: vi.fn(async () => m.session) }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { whatsAppMessageQueue: m.queue, user: m.user },
}));
vi.mock("@/lib/whatsapp/whatsapp-client", () => ({
  getWhatsAppSessions: m.getWhatsAppSessions,
}));

import { POST } from "@/app/api/operations/whatsapp/queue/route";

const request = (body = { messageId: "message-1" }) => ({
  cookies: { get: () => ({ value: "synthetic-staff-token" }) },
  json: async () => body,
});

function matches(where) {
  return Boolean(
    m.row &&
      m.row.id === where.id &&
      (!Object.hasOwn(where, "organizationId") || m.row.organizationId === where.organizationId) &&
      (!Object.hasOwn(where, "initiatedByUserId") || m.row.initiatedByUserId === where.initiatedByUserId) &&
      (!where.status || where.status.in.includes(m.row.status)),
  );
}

// Model one atomic conditional database write, with no await between predicate and mutation.
function updateAtomically({ where, data }) {
  if (!matches(where)) throw Object.assign(new Error("No matching queue entry"), { code: "P2025" });
  Object.assign(m.row, data);
  return globalThis.structuredClone(m.row);
}

beforeEach(() => {
  vi.resetAllMocks();
  m.session = { userId: "siya", role: "MANAGER", organizationId: "org-1" };
  m.row = {
    id: "message-1",
    organizationId: "org-1",
    initiatedByUserId: "siya",
    accountId: "claims-account",
    recipientPhone: "synthetic-recipient",
    recipientName: "Fixture customer",
    messageType: "TEXT",
    messageBody: "Fixture message",
    caption: "Fixture caption",
    mediaUrl: null,
    fileName: null,
    uniqueKey: "original-audit-key",
    openwaMessageId: "original-reference",
    sentAt: new Date("2026-10-01T00:00:00Z"),
    createdAt: new Date("2026-10-01T00:00:00Z"),
    scheduledAt: new Date("2026-10-01T00:00:00Z"),
    status: "FAILED",
    attempts: 3,
    errorMessage: "Fixture failure",
  };
  m.queue.findFirst.mockImplementation(async ({ where }) => matches(where) ? globalThis.structuredClone(m.row) : null);
  m.queue.update.mockImplementation(updateAtomically);
  m.queue.updateMany.mockResolvedValue({ count: 0 });
});

describe("Individual WhatsApp queue retry", () => {
  it.each(["FAILED", "RETRYING"])("retries eligible %s entries without replacing sender or audit data", async (status) => {
    m.row.status = status;
    const original = globalThis.structuredClone(m.row);
    // The employee now prefers another sender; retry must use the original queued account.
    m.user.findFirst.mockResolvedValue({ primaryWhatsAppAccountId: "operations-account" });

    const response = await POST(request({ messageId: m.row.id, accountId: "operations-account" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, message: {
      ...original, status: "PENDING", attempts: 0, errorMessage: null,
      scheduledAt: expect.any(String), sentAt: original.sentAt.toISOString(), createdAt: original.createdAt.toISOString(),
    } });
    expect(m.row).toEqual({ ...original, status: "PENDING", attempts: 0, errorMessage: null, scheduledAt: expect.any(Date) });
    expect(m.queue.findFirst).toHaveBeenCalledTimes(1);
    expect(m.queue.update).toHaveBeenCalledTimes(1);
    expect(m.queue.update.mock.calls[0][0].data).toEqual({
      status: "PENDING", attempts: 0, errorMessage: null, scheduledAt: expect.any(Date),
    });
    expect(m.user.findFirst).not.toHaveBeenCalled();
    expect(m.getWhatsAppSessions).not.toHaveBeenCalled();
  });

  it.each(["SENT", "SENDING", "PENDING"])("returns 409 without modifying %s entries", async (status) => {
    m.row.status = status;
    const original = globalThis.structuredClone(m.row);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Message is no longer eligible for retry. Refresh and try again." });
    expect(m.row).toEqual(original);
  });

  it("allows only one concurrent manual retry after both requests read the same eligible row", async () => {
    let reads = 0;
    let release;
    const bothRead = new Promise((resolve) => { release = resolve; });
    m.queue.findFirst.mockImplementation(async ({ where }) => {
      const snapshot = matches(where) ? globalThis.structuredClone(m.row) : null;
      if (++reads === 2) release();
      await bothRead;
      return snapshot;
    });

    const responses = await Promise.all([POST(request()), POST(request())]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(m.queue.update).toHaveBeenCalledTimes(2);
    expect(m.row.status).toBe("PENDING");
    expect(m.row.accountId).toBe("claims-account");
  });

  it("cannot reset a worker claim made after the eligibility read", async () => {
    m.row.status = "RETRYING";
    const original = globalThis.structuredClone(m.row);
    m.queue.update.mockImplementationOnce((args) => {
      // The worker's existing conditional PENDING/RETRYING -> SENDING claim wins first.
      updateAtomically({
        where: { id: m.row.id, status: { in: ["PENDING", "RETRYING"] } },
        data: { status: "SENDING", attempts: m.row.attempts + 1 },
      });
      return updateAtomically(args);
    });

    expect((await POST(request())).status).toBe(409);
    expect(m.row).toEqual({ ...original, status: "SENDING", attempts: original.attempts + 1 });
  });

  it.each(["organizationId", "initiatedByUserId", "deleted"])("refuses a concurrent %s change at the write boundary", async (field) => {
    m.queue.update.mockImplementationOnce((args) => {
      if (field === "deleted") m.row = null;
      else m.row[field] = "other-scope";
      return updateAtomically(args);
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Message is no longer eligible for retry. Refresh and try again." });
    if (m.row) expect(m.row.status).toBe("FAILED");
  });

  it.each(["FAILED", "SENT", "SENDING"])("hides another organization's %s entry behind the existing 404", async (status) => {
    m.row.organizationId = "other-org";
    m.row.status = status;
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Message not found" });
    expect(m.queue.update).not.toHaveBeenCalled();
  });

  it.each(["FAILED", "SENT", "SENDING"])("denies another employee's %s entry without disclosing its status", async (status) => {
    m.row.initiatedByUserId = "rahul";
    m.row.status = status;
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Only the initiating employee or an administrator can retry this message" });
    expect(m.queue.update).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "SUPER_ADMIN"])("preserves %s retry access for another employee in the same organization", async (role) => {
    m.session.role = role;
    m.row.initiatedByUserId = "rahul";
    expect((await POST(request())).status).toBe(200);
    expect(m.row.initiatedByUserId).toBe("rahul");
    expect(m.row.accountId).toBe("claims-account");
  });

  it("does not grant administrators cross-organization access", async () => {
    m.session.role = "SUPER_ADMIN";
    m.row.organizationId = "other-org";
    expect((await POST(request())).status).toBe(404);
    expect(m.queue.update).not.toHaveBeenCalled();
  });

  it.each(["PDF", "IMAGE"])("protects %s entries missing their original attachment", async (messageType) => {
    m.row.messageType = messageType;
    m.row.fileName = "original-attachment";
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("Resend this attachment from its original CRM form");
    expect(m.queue.update).not.toHaveBeenCalled();
  });

  it.each(["PDF", "IMAGE"])("retains available %s media on an eligible retry", async (messageType) => {
    m.row.messageType = messageType;
    m.row.mediaUrl = "https://fixture.invalid/media";
    m.row.fileName = "original-attachment";
    expect((await POST(request())).status).toBe(200);
    expect(m.row.mediaUrl).toBe("https://fixture.invalid/media");
    expect(m.row.fileName).toBe("original-attachment");
  });

  it("preserves the existing regenerable birthday attachment exception", async () => {
    m.row.messageType = "IMAGE";
    m.row.fileName = "birthday_greeting.jpg";
    expect((await POST(request())).status).toBe(200);
  });

  it("preserves not-found and missing-ID responses", async () => {
    expect((await POST(request({ messageId: "missing" }))).status).toBe(404);
    expect((await POST(request({}))).status).toBe(400);
    expect(m.queue.update).not.toHaveBeenCalled();
  });

  it("denies unauthenticated and VIEWER attempts before reading a row", async () => {
    m.session = null;
    expect((await POST(request())).status).toBe(401);
    m.session = { userId: "viewer", role: "VIEWER", organizationId: "org-1" };
    expect((await POST(request())).status).toBe(403);
    expect(m.queue.findFirst).not.toHaveBeenCalled();
    expect(m.queue.update).not.toHaveBeenCalled();
  });

  it("preserves 500 handling for database errors unrelated to a conditional mismatch", async () => {
    m.queue.update.mockRejectedValueOnce(new Error("Synthetic database failure"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Synthetic database failure" });
    expect(m.row.status).toBe("FAILED");
  });

  it("leaves the existing retry-all operation unchanged", async () => {
    m.queue.updateMany.mockResolvedValueOnce({ count: 2 });
    const response = await POST(request({ action: "retry_all" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, count: 2 });
    expect(m.queue.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1", initiatedByUserId: "siya", status: { in: ["FAILED", "RETRYING"] },
        OR: [{ messageType: "TEXT" }, { mediaUrl: { not: null } }, { fileName: { contains: "birthday" } }],
      },
      data: { status: "PENDING", attempts: 0, errorMessage: null, scheduledAt: expect.any(Date) },
    });
    expect(m.queue.findFirst).not.toHaveBeenCalled();
    expect(m.queue.update).not.toHaveBeenCalled();
  });
});
