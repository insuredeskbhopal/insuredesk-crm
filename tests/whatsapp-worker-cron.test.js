import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as whatsappWorkerGET } from "../src/app/api/cron/whatsapp-worker/route.js";

vi.mock("../src/lib/whatsapp/automations", () => ({
  triggerDailyBirthdays: vi.fn().mockResolvedValue({ queuedCount: 0 }),
  triggerInternalOperationsDigest: vi.fn().mockResolvedValue({ queuedCount: 0 }),
  triggerUpcomingRenewals: vi.fn().mockResolvedValue({ queuedCount: 0 }),
}));

vi.mock("../src/lib/whatsapp/queue-manager", () => ({
  processQueueBatch: vi.fn().mockResolvedValue({ successCount: 0, failedCount: 0 }),
}));

vi.mock("@/lib/presence/presence-monitor", () => ({
  evaluateStaffPresence: vi.fn().mockResolvedValue({ processedUsers: 0 }),
}));

describe("WhatsApp Worker Cron Access Security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("denies access in production when CRON_SECRET is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRON_SECRET;

    const request = new Request("http://localhost/api/cron/whatsapp-worker");
    const response = await whatsappWorkerGET(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("allows access in development when CRON_SECRET is missing", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.CRON_SECRET;

    const request = new Request("http://localhost/api/cron/whatsapp-worker");
    const response = await whatsappWorkerGET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("allows access in production when correct CRON_SECRET is provided", async () => {
    process.env.NODE_ENV = "production";
    process.env.CRON_SECRET = "production-secret-token";

    // 1. Check with bearer token authorization header
    const reqHeaders = new Request("http://localhost/api/cron/whatsapp-worker", {
      headers: {
        authorization: "Bearer production-secret-token",
      },
    });
    const resHeaders = await whatsappWorkerGET(reqHeaders);
    expect(resHeaders.status).toBe(200);

    // 2. Check with query parameter secret
    const reqQuery = new Request("http://localhost/api/cron/whatsapp-worker?secret=production-secret-token");
    const resQuery = await whatsappWorkerGET(reqQuery);
    expect(resQuery.status).toBe(200);
  });
});
