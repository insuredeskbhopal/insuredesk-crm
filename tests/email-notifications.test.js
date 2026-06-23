import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isEmailConfigured, sendFollowUpReminderEmail } from "../src/lib/email/mailer";
import { sendDueFollowUpEmails } from "../src/lib/operations-center/engine";
import nodemailer from "nodemailer";
import { prisma } from "../src/lib/db/prisma";

// Mock nodemailer
vi.mock("nodemailer", () => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: "test-id" });
  return {
    default: {
      createTransport: vi.fn().mockReturnValue({
        sendMail: sendMailMock,
      }),
    },
  };
});

// Mock prisma client
vi.mock("../src/lib/db/prisma", () => {
  return {
    prisma: {
      task: {
        findMany: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      activityLog: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
    },
  };
});

describe("Notification Mailing and Email Flow", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("mailer.js - isEmailConfigured", () => {
    it("returns false if SMTP credentials are not set", () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      expect(isEmailConfigured()).toBe(false);
    });

    it("returns true if SMTP credentials are set", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "password";
      expect(isEmailConfigured()).toBe(true);
    });
  });

  describe("mailer.js - sendFollowUpReminderEmail", () => {
    it("returns skipped true if not configured", async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const result = await sendFollowUpReminderEmail({
        to: "recipient@example.com",
        name: "Test User",
        title: "Reminder",
        message: "This is a test message",
        actionUrl: "/work-center",
      });

      expect(result.sent).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("SMTP is not configured");
    });

    it("calls nodemailer.sendMail if SMTP is configured", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "password";
      process.env.SMTP_FROM = "sender@example.com";

      const mockSendMail = nodemailer.createTransport().sendMail;

      const result = await sendFollowUpReminderEmail({
        to: "recipient@example.com",
        name: "Test User",
        title: "Reminder",
        message: "This is a test message",
        actionUrl: "/work-center",
      });

      expect(result.sent).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe("recipient@example.com");
      expect(callArgs.from).toBe("sender@example.com");
      expect(callArgs.subject).toBe("Reminder");
      expect(callArgs.text).toContain("This is a test message");
      expect(callArgs.html).toContain("This is a test message");
    });

    it("includes client details and a direct call button if client info is provided", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "password";
      process.env.SMTP_FROM = "sender@example.com";

      const mockSendMail = nodemailer.createTransport().sendMail;

      const result = await sendFollowUpReminderEmail({
        to: "recipient@example.com",
        name: "Test User",
        title: "Renewal Reminder",
        message: "Your policy is expiring",
        actionUrl: "/work-center",
        customerName: "Ramesh Kumar",
        customerMobile: "+919876543210",
        policyNumber: "POL1000298",
        amount: 25000.50,
      });

      expect(result.sent).toBe(true);
      const callArgs = mockSendMail.mock.calls[0][0];
      
      // Verify HTML content
      expect(callArgs.html).toContain("Client Details");
      expect(callArgs.html).toContain("Ramesh Kumar");
      expect(callArgs.html).toContain("POL1000298");
      expect(callArgs.html).toContain("₹25,000.50");
      expect(callArgs.html).toContain('href="tel:+919876543210"');
      
      // Verify plain text content
      expect(callArgs.text).toContain("Client Name: Ramesh Kumar");
      expect(callArgs.text).toContain("Policy Number: POL1000298");
      expect(callArgs.text).toContain("Amount: ₹25,000.50");
      expect(callArgs.text).toContain("Contact: +919876543210");
    });
  });

  describe("engine.js - sendDueFollowUpEmails", () => {
    it("does not send email if task has no assigned user", async () => {
      prisma.task.findMany.mockResolvedValue([
        {
          id: "task-1",
          userId: null,
          title: "Follow up task",
          type: "FOLLOW_UP",
          dueAt: new Date(),
          organizationId: "org-1",
          module: "CRM",
          recordId: "rec-1",
          recordLabel: "record-1",
        },
      ]);

      const result = await sendDueFollowUpEmails();
      expect(result.checked).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.sent).toBe(0);
    });

    it("sends email if task has user and due date, and records activity", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "password";

      prisma.task.findMany.mockResolvedValue([
        {
          id: "task-2",
          userId: "user-1",
          title: "Test Task",
          type: "FOLLOW_UP",
          dueAt: new Date(),
          organizationId: "org-1",
          module: "CRM",
          recordId: "rec-1",
          recordLabel: "record-1",
          assignments: [],
        },
      ]);

      prisma.activityLog.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        id: "user-1",
        email: "user1@example.com",
        name: "User One",
      });

      prisma.activityLog.upsert.mockResolvedValue({});

      const result = await sendDueFollowUpEmails();

      expect(result.checked).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);

      const mockSendMail = nodemailer.createTransport().sendMail;
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe("insuredeskbhopal@gmail.com");

      expect(prisma.activityLog.upsert).toHaveBeenCalledTimes(1);
      const activityArgs = prisma.activityLog.upsert.mock.calls[0][0];
      expect(activityArgs.create.action).toBe("Follow-up Email Sent");
    });

    it("skips task if email was already sent (activity log exists)", async () => {
      prisma.task.findMany.mockResolvedValue([
        {
          id: "task-3",
          userId: "user-1",
          title: "Test Task 3",
          type: "FOLLOW_UP",
          dueAt: new Date(),
          organizationId: "org-1",
          module: "CRM",
          recordId: "rec-1",
          recordLabel: "record-1",
          assignments: [],
        },
      ]);

      prisma.activityLog.findFirst.mockResolvedValue({ id: "activity-already-sent" });

      const result = await sendDueFollowUpEmails();
      expect(result.checked).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("handles mailer exceptions and records failure log", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "password";

      prisma.task.findMany.mockResolvedValue([
        {
          id: "task-4",
          userId: "user-1",
          title: "Test Task 4",
          type: "FOLLOW_UP",
          dueAt: new Date(),
          organizationId: "org-1",
          module: "CRM",
          recordId: "rec-1",
          recordLabel: "record-1",
          assignments: [],
        },
      ]);

      prisma.activityLog.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        id: "user-1",
        email: "user1@example.com",
        name: "User One",
      });

      const mockSendMail = nodemailer.createTransport().sendMail;
      mockSendMail.mockRejectedValueOnce(new Error("SMTP server down"));

      prisma.activityLog.upsert.mockResolvedValue({});

      const result = await sendDueFollowUpEmails();
      expect(result.checked).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);

      expect(prisma.activityLog.upsert).toHaveBeenCalledTimes(1);
      const activityArgs = prisma.activityLog.upsert.mock.calls[0][0];
      expect(activityArgs.create.action).toBe("Follow-up Email Failed");
    });
  });

  describe("POST /api/contact", () => {
    it("returns 400 if required fields are missing", async () => {
      const { POST } = await import("../src/app/api/contact/route");
      const request = new Request("http://localhost/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: "John Doe",
          // missing phone and message
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Missing required fields");
    });

    it("sends email and returns 200 on success", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "user@example.com";
      process.env.SMTP_PASS = "password";
      process.env.SMTP_FROM = "sender@example.com";

      const mockSendMail = nodemailer.createTransport().sendMail;

      const { POST } = await import("../src/app/api/contact/route");
      const request = new Request("http://localhost/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: "Sanjay Gupta",
          phone: "9826012345",
          email: "sanjay@example.com",
          service: "Health Insurance",
          message: "Looking for family health insurance plan cover.",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe("insuredeskbhopal@gmail.com");
      expect(callArgs.subject).toContain("Sanjay Gupta");
      expect(callArgs.html).toContain("Health Insurance");
      expect(callArgs.html).toContain("9826012345");
      expect(callArgs.html).toContain("Looking for family health insurance");
    });
  });
});
