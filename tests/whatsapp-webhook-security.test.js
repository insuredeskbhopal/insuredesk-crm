// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  notification: { create: vi.fn() },
  whatsAppMessageQueue: { findFirst: vi.fn(), update: vi.fn() },
  customerProfile: { findFirst: vi.fn() },
  organization: { findFirst: vi.fn(async () => ({ id: "org-test-1" })) },
  isRenewalQuoteGroup: vi.fn(() => false),
  buildRenewalQuoteEntry: vi.fn(),
  storeRenewalQuoteEntry: vi.fn(),
  downloadWhatsAppMedia: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    notification: m.notification,
    whatsAppMessageQueue: m.whatsAppMessageQueue,
    customerProfile: m.customerProfile,
    organization: m.organization,
  },
}));

vi.mock("@/lib/whatsapp/renewal-quote-capture", () => ({
  isRenewalQuoteGroup: m.isRenewalQuoteGroup,
  buildRenewalQuoteEntry: m.buildRenewalQuoteEntry,
  storeRenewalQuoteEntry: m.storeRenewalQuoteEntry,
}));

vi.mock("@/lib/whatsapp/whatsapp-client", () => ({
  downloadWhatsAppMedia: m.downloadWhatsAppMedia,
}));

import { POST } from "@/app/api/operations/whatsapp/webhook/route";

function createMockRequest(url, body = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("WhatsApp Webhook Security (Fail-Closed Secret Enforcement)", () => {
  const originalSecret = process.env.OPENWA_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.OPENWA_WEBHOOK_SECRET = originalSecret;
    } else {
      delete process.env.OPENWA_WEBHOOK_SECRET;
    }
  });

  it("rejects request with 401 when OPENWA_WEBHOOK_SECRET is completely unset in the environment", async () => {
    delete process.env.OPENWA_WEBHOOK_SECRET;

    const req = createMockRequest("http://localhost/api/operations/whatsapp/webhook?secret=any-secret", {
      event: "stateChanged",
      state: "DISCONNECTED",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });

    // Zero database operations
    expect(m.notification.create).not.toHaveBeenCalled();
    expect(m.whatsAppMessageQueue.update).not.toHaveBeenCalled();
    expect(m.storeRenewalQuoteEntry).not.toHaveBeenCalled();
    expect(m.downloadWhatsAppMedia).not.toHaveBeenCalled();
  });

  it("rejects request with 401 when OPENWA_WEBHOOK_SECRET is an empty string", async () => {
    process.env.OPENWA_WEBHOOK_SECRET = "";

    const req = createMockRequest("http://localhost/api/operations/whatsapp/webhook?secret=any-secret", {
      event: "stateChanged",
      state: "DISCONNECTED",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });

    expect(m.notification.create).not.toHaveBeenCalled();
  });

  it("rejects request with 401 when OPENWA_WEBHOOK_SECRET is whitespace only", async () => {
    process.env.OPENWA_WEBHOOK_SECRET = "   ";

    const req = createMockRequest("http://localhost/api/operations/whatsapp/webhook?secret=any-secret", {
      event: "stateChanged",
      state: "DISCONNECTED",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });

    expect(m.notification.create).not.toHaveBeenCalled();
  });

  it("rejects request with 401 when caller omits the ?secret= query parameter", async () => {
    process.env.OPENWA_WEBHOOK_SECRET = "super-secret-token-12345";

    const req = createMockRequest("http://localhost/api/operations/whatsapp/webhook", {
      event: "stateChanged",
      state: "DISCONNECTED",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });

    expect(m.notification.create).not.toHaveBeenCalled();
  });

  it("rejects request with 401 when caller provides an incorrect secret of matching length", async () => {
    process.env.OPENWA_WEBHOOK_SECRET = "super-secret-token-12345";

    const req = createMockRequest("http://localhost/api/operations/whatsapp/webhook?secret=wrong-secret-token-99999", {
      event: "stateChanged",
      state: "DISCONNECTED",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });

    expect(m.notification.create).not.toHaveBeenCalled();
  });

  it("safely handles different-length secrets without unhandled exceptions and returns 401", async () => {
    process.env.OPENWA_WEBHOOK_SECRET = "super-secret-token-12345";

    // Shorter secret
    const reqShort = createMockRequest("http://localhost/api/operations/whatsapp/webhook?secret=short", {
      event: "stateChanged",
      state: "DISCONNECTED",
    });
    const resShort = await POST(reqShort);
    expect(resShort.status).toBe(401);
    expect(await resShort.json()).toEqual({ error: "Unauthorized" });

    // Longer secret
    const reqLong = createMockRequest("http://localhost/api/operations/whatsapp/webhook?secret=way-longer-than-the-actual-token-here", {
      event: "stateChanged",
      state: "DISCONNECTED",
    });
    const resLong = await POST(reqLong);
    expect(resLong.status).toBe(401);
    expect(await resLong.json()).toEqual({ error: "Unauthorized" });

    expect(m.notification.create).not.toHaveBeenCalled();
    expect(m.whatsAppMessageQueue.update).not.toHaveBeenCalled();
  });

  it("does not expose the configured secret in error responses or body", async () => {
    const SECRET = "confidential-production-secret-999";
    process.env.OPENWA_WEBHOOK_SECRET = SECRET;

    const req = createMockRequest("http://localhost/api/operations/whatsapp/webhook?secret=invalid", {});
    const res = await POST(req);
    const rawText = await res.text();

    expect(rawText).not.toContain(SECRET);
    expect(JSON.parse(rawText)).toEqual({ error: "Unauthorized" });
  });

  it("permits legitimate event processing when the correct secret is supplied via ?secret=", async () => {
    const SECRET = "valid-test-webhook-secret-xyz";
    process.env.OPENWA_WEBHOOK_SECRET = SECRET;

    // 1. Test stateChanged event
    const reqState = createMockRequest(
      `http://localhost/api/operations/whatsapp/webhook?secret=${encodeURIComponent(SECRET)}&orgId=org-test-1`,
      {
        event: "stateChanged",
        state: "DISCONNECTED",
      }
    );

    const resState = await POST(reqState);
    expect(resState.status).toBe(200);
    const bodyState = await resState.json();
    expect(bodyState.success).toBe(true);

    expect(m.notification.create).toHaveBeenCalledTimes(1);
    expect(m.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-test-1",
          category: "SYSTEM",
          severity: "CRITICAL",
          title: "WhatsApp Session Disconnected",
        }),
      })
    );

    // 2. Test ack delivery receipt update
    m.whatsAppMessageQueue.findFirst.mockResolvedValueOnce({ id: "queue-item-42" });

    const reqAck = createMockRequest(
      `http://localhost/api/operations/whatsapp/webhook?secret=${encodeURIComponent(SECRET)}`,
      {
        event: "ack",
        id: "msg-123",
        ack: -1,
      }
    );

    const resAck = await POST(reqAck);
    expect(resAck.status).toBe(200);

    expect(m.whatsAppMessageQueue.findFirst).toHaveBeenCalledWith({
      where: { openwaMessageId: "msg-123" },
    });
    expect(m.whatsAppMessageQueue.update).toHaveBeenCalledWith({
      where: { id: "queue-item-42" },
      data: expect.objectContaining({
        status: "FAILED",
        errorMessage: "Failed to deliver (OpenWA delivery ack -1)",
      }),
    });
  });
});
