import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { GET as whatsappWorkerGET } from "../src/app/api/cron/whatsapp-worker/route.js";
import { calculateDaysLeft, calculateRenewalStatus, parseRenewalDate } from "../src/lib/renewals/dates.js";
import { normalizeIndianPhone, sanitizeCustomerProfilePayload } from "../src/lib/customer-profiles/utils.js";
import { extractBajajAllianzMotor } from "../src/lib/policies/pdf/parsers/bajaj/index.cjs";
import { getPresetDates } from "../src/lib/records/scoped-data.js";

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

  describe("Bajaj Allianz Commercial Vehicle Package Policy Extraction", () => {
    it("extracts chassis number, engine number, policy type, manufacturing year, and seating capacity correctly from OCR text", () => {
      const ocrPath = path.join(__dirname, "bajaj_cv_ocr.txt");
      const ocrText = fs.readFileSync(ocrPath, "utf8");
      const result = extractBajajAllianzMotor(ocrText, "bajaj_cv.pdf");

      expect(result.documentDetected).toBe(true);
      expect(result.chassisNumber).toBe("MA1GH2CNHS3A10994");
      expect(result.engineNumber).toBe("CNS4A10059");
      expect(result.policyType).toBe("Commercial Vehicle Package Policy");
      expect(result.manufacturingYear).toBe("2025");
      expect(result.seatingCapacity).toBe("50");
      expect(result.fuelType).toBe("DIESEL");
      expect(result.cubicCapacity).toBe("0");
    });
  });

  describe("Shriram General Insurance Commercial Vehicle Liability Policy Extraction", () => {
    it("extracts companyName, policyNumber, policyType, insuredName, chassisNumber, engineNumber, vehicleNumber, year, and seatingCapacity correctly", () => {
      const ocrPath = path.join(__dirname, "shriram_cv_ocr.txt");
      const ocrText = fs.readFileSync(ocrPath, "utf8");
      const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
      const result = extractPolicyFromText(ocrText, "shriram_cv.pdf");

      expect(result.documentFormat).toBe("SHRIRAM_MOTOR_V1");
      expect(result.documentCategory).toBe("Motor Insurance");
      expect(result.insuranceCompany).toBe("SHRIRAM GENERAL INSURANCE COMPANY LIMITED");
      expect(result.policyNumber).toBe("209040/31/27/000523");
      expect(result.policyType).toBe("MOTOR COMMERCIAL VEHICLE (LIABILITY ONLY POLICY)");
      expect(result.insuredName).toBe("M/S. MS MAHAKAL TRANSPORTN AND CO");
      expect(result.chassisNumber).toBe("MAT447220F1K24434");
      expect(result.engineNumber).toBe("B591803251K63472202");
      expect(result.registrationNumber).toBe("RJ-21-GB-6122");
      expect(result.vehicleNumber).toBe("RJ-21-GB-6122");
      expect(result.manufacturingYear).toBe("2015");
      expect(result.seatingCapacity).toBe("3");
    });
  });

  describe("Royal Sundaram General Insurance Commercial Vehicle Liability Policy Extraction (New Layout)", () => {
    it("extracts policyNumber, insuredName, chassisNumber, engineNumber, registrationNumber, manufacturingYear, start/expiry dates, premiums, and taxes correctly", () => {
      const ocrPath = path.join(__dirname, "royal_sundaram_cv_ocr.txt");
      const ocrText = fs.readFileSync(ocrPath, "utf8");
      const { extractPolicyFromText } = require("../src/lib/policies/pdf/extractor.cjs");
      const result = extractPolicyFromText(ocrText, "royal_sundaram_cv.pdf");

      expect(result.documentFormat).toBe("ROYAL_SUNDARAM_MOTOR_V1");
      expect(result.documentCategory).toBe("Motor Insurance");
      expect(result.insuranceCompany).toBe("Royal Sundaram General Insurance Company Limited");
      expect(result.policyNumber).toBe("VGC1573257000100");
      expect(result.policyType).toBe("Goods Carrying Vehicle Policy");
      expect(result.insuredName).toBe("Mr.SHIVAM RAI");
      expect(result.chassisNumber).toBe("MAT466404B2F13207");
      expect(result.engineNumber).toBe("B591803111F63142692");
      expect(result.registrationNumber).toBe("MP09HG6001");
      expect(result.vehicleNumber).toBe("MP09HG6001");
      expect(result.manufacturingYear).toBe("2011");
      expect(result.registrationDate).toBe("18/07/2011");
      expect(result.startDate).toBe("04/07/2026");
      expect(result.expiryDate).toBe("03/07/2027");
      expect(result.premium).toBe("49,075.00");
      expect(result.totalPremium).toBe("49,075.00");
      expect(result.netPremium).toBe("44,050.00");
      expect(result.gstAmount).toBe("2,644.08");
      expect(result.cgst).toBe("1,322.04");
      expect(result.sgst).toBe("1,322.04");
      expect(result.panNumber).toBe("AABCR7106G");
      expect(result.policyCoverType).toBe("Comprehensive");
    });
  });

  describe("Date Presets Filter Helper", () => {
    it("correctly generates date ranges for today, yesterday, this-week, last-week, this-month, last-month, and this-year", () => {
      const todayRange = getPresetDates("today");
      expect(todayRange).not.toBeNull();
      expect(todayRange.start.getHours()).toBe(0);
      expect(todayRange.end.getHours()).toBe(23);

      const yesterdayRange = getPresetDates("yesterday");
      expect(yesterdayRange).not.toBeNull();

      const thisMonthRange = getPresetDates("this-month");
      expect(thisMonthRange).not.toBeNull();
      expect(thisMonthRange.start.getDate()).toBe(1);

      const lastMonthRange = getPresetDates("last-month");
      expect(lastMonthRange).not.toBeNull();
      expect(lastMonthRange.start.getDate()).toBe(1);

      const thisYearRange = getPresetDates("this-year");
      expect(thisYearRange).not.toBeNull();
      expect(thisYearRange.start.getMonth()).toBe(0);
      expect(thisYearRange.start.getDate()).toBe(1);

      expect(getPresetDates("invalid")).toBeNull();
    });
  });
});


