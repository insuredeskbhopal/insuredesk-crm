// @vitest-environment node

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { recordLoginAttendance, recordLogoutAttendance } from "@/lib/attendance/attendance-service";

describe("Attendance Decoupling & Office IP Restriction", () => {
  const originalEnv = process.env.ALLOWED_OFFICE_IPS;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ALLOWED_OFFICE_IPS = originalEnv;
    } else {
      delete process.env.ALLOWED_OFFICE_IPS;
    }
  });

  describe("IP Restriction Validation", () => {
    it("allows any IP when ALLOWED_OFFICE_IPS is not set", async () => {
      delete process.env.ALLOWED_OFFICE_IPS;
      // Missing userId should fail on validation, proving it got past IP check
      const res = await recordLoginAttendance({ userId: "", ipAddress: "192.168.1.100" });
      expect(res.error).toBe("Missing userId");
    });

    it("allows any IP when ALLOWED_OFFICE_IPS is empty or whitespace", async () => {
      process.env.ALLOWED_OFFICE_IPS = "  ";
      const res = await recordLogoutAttendance({ userId: "", ipAddress: "10.0.0.1" });
      expect(res.error).toBe("Missing userId");
    });

    it("blocks login attendance when client IP is not in ALLOWED_OFFICE_IPS", async () => {
      process.env.ALLOWED_OFFICE_IPS = "182.73.100.1, 182.73.100.2";
      const res = await recordLoginAttendance({
        userId: "user-123",
        ipAddress: "203.0.113.50",
      });
      expect(res.recorded).toBe(false);
      expect(res.reason).toBe("IP_NOT_ALLOWED");
      expect(res.message).toContain("203.0.113.50");
    });

    it("blocks punch-out attendance when client IP is not in ALLOWED_OFFICE_IPS", async () => {
      process.env.ALLOWED_OFFICE_IPS = "182.73.100.1, 182.73.100.2";
      const res = await recordLogoutAttendance({
        userId: "user-123",
        ipAddress: "203.0.113.50",
      });
      expect(res.recorded).toBe(false);
      expect(res.reason).toBe("IP_NOT_ALLOWED");
    });

    it("allows attendance when client IP matches one of ALLOWED_OFFICE_IPS", async () => {
      process.env.ALLOWED_OFFICE_IPS = "182.73.100.1, 182.73.100.2";
      // It passes IP check, so it proceeds to check userId / DB
      const res = await recordLogoutAttendance({
        userId: "",
        ipAddress: "182.73.100.2",
      });
      expect(res.error).toBe("Missing userId");
    });

    it("blocks attendance when ALLOWED_OFFICE_IPS is set but client IP cannot be determined", async () => {
      process.env.ALLOWED_OFFICE_IPS = "182.73.100.1";
      const res = await recordLoginAttendance({
        userId: "user-123",
        ipAddress: null,
      });
      expect(res.recorded).toBe(false);
      expect(res.reason).toBe("NO_IP");
    });
  });
});
