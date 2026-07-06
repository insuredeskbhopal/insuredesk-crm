import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as whatsappWorkerGET } from "../src/app/api/cron/whatsapp-worker/route.js";
import { calculateDaysLeft, calculateRenewalStatus, parseRenewalDate } from "../src/lib/renewals/dates.js";
import { normalizeIndianPhone, sanitizeCustomerProfilePayload } from "../src/lib/customer-profiles/utils.js";

// Mock WhatsApp workers dependencies to avoid DB/external network calls
vi.mock("../src/lib/whatsapp/automations", () => ({
  triggerDailyBirthdays: vi.fn().mockResolvedValue({ queuedCount: 0 }),
  triggerInternalOperationsDigest: vi.fn().mockResolvedValue({ queuedCount: 0 }),
  triggerUpcomingRenewals: vi.fn().mockResolvedValue({ queuedCount: 0 }),
}));

vi.mock("../src/lib/whatsapp/queue-manager", () => ({
  processQueueBatch: vi.fn().mockResolvedValue({ successCount: 0, failedCount: 0 }),
}));

describe("Production Fixes Audit Test Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("WhatsApp Worker Cron Access Security", () => {
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

  describe("Timezone Stable Days-Left Calculations (IST)", () => {
    // Expiry date of the policy: July 25, 2026
    const expiryDateStr = "25/07/2026";

    it("calculates 19 days remaining at 11:30 PM IST (July 6)", () => {
      // 2026-07-06T23:30:00+05:30 is 2026-07-06T18:00:00.000Z in UTC
      const referenceDate = new Date("2026-07-06T23:30:00+05:30");
      const daysLeft = calculateDaysLeft(expiryDateStr, referenceDate);
      expect(daysLeft).toBe(19);

      const status = calculateRenewalStatus(expiryDateStr, "", referenceDate);
      // July 25 is 19 days away, which is <= 30 so status should be expiry_soon
      expect(status).toBe("expiry_soon");
    });

    it("calculates 18 days remaining at 12:30 AM IST (July 7)", () => {
      // 2026-07-07T00:30:00+05:30 is 2026-07-06T19:00:00.000Z in UTC
      const referenceDate = new Date("2026-07-07T00:30:00+05:30");
      const daysLeft = calculateDaysLeft(expiryDateStr, referenceDate);
      expect(daysLeft).toBe(18);

      const status = calculateRenewalStatus(expiryDateStr, "", referenceDate);
      expect(status).toBe("expiry_soon");
    });

    it("evaluates correctly parsed date from various formatting strings relative to IST", () => {
      const dmyParsed = parseRenewalDate("25/07/2026");
      expect(dmyParsed).not.toBeNull();
      // Hour offset should be aligned to +05:30, which resolves to local start of day:
      // Since new Date("2026-07-25T00:00:00+05:30") maps to 2026-07-24T18:30:00Z in UTC.
      expect(dmyParsed.toISOString()).toBe("2026-07-24T18:30:00.000Z");

      const isoParsed = parseRenewalDate("2026-07-25");
      expect(isoParsed).not.toBeNull();
      expect(isoParsed.toISOString()).toBe("2026-07-24T18:30:00.000Z");
    });
  });

  describe("Customer Profile Phone Validation", () => {
    it("sanitizes alternate phone numbers correctly preserving bad numbers for validator", () => {
      // 1. Valid numbers should normalize to 10 digits
      const resValid = sanitizeCustomerProfilePayload({
        phone: "9876543210",
        alternatePhone: "09876543210",
      });
      expect(resValid.phone).toBe("9876543210");
      expect(resValid.alternatePhone).toBe("9876543210");

      // 2. Invalid alternate phone should preserve input as-is for validation detection
      const resInvalid = sanitizeCustomerProfilePayload({
        phone: "9876543210",
        alternatePhone: "12345",
      });
      expect(resInvalid.alternatePhone).toBe("12345");

      // 3. Omitted alternate phone should resolve to blank string
      const resOmitted = sanitizeCustomerProfilePayload({
        phone: "9876543210",
      });
      expect(resOmitted.alternatePhone).toBe("");
    });

    it("verifies the endpoints' validation rules for phone validation", () => {
      const validatePhone = (phone) => {
        return !!(phone && normalizeIndianPhone(phone) === phone);
      };

      const validateAltPhone = (altPhone) => {
        return !altPhone || normalizeIndianPhone(altPhone) === altPhone;
      };

      // Primary phone validation assertions
      expect(validatePhone("9876543210")).toBe(true);
      expect(validatePhone("12345")).toBe(false);
      expect(validatePhone("")).toBe(false);

      // Alternate phone validation assertions
      expect(validateAltPhone("9876543210")).toBe(true);
      expect(validateAltPhone("09876543210")).toBe(false); // must be exact normalized 10-digit format
      expect(validateAltPhone("12345")).toBe(false);
      expect(validateAltPhone("")).toBe(true); // allowed to be empty
      expect(validateAltPhone(null)).toBe(true); // allowed to be null
    });
  });
});
