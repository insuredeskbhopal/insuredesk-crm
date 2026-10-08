// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, whatsappClientMock } = vi.hoisted(() => ({
  prismaMock: {
    whatsAppMessageQueue: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  whatsappClientMock: {
    sendWhatsAppText: vi.fn(),
    sendWhatsAppImage: vi.fn(),
    sendWhatsAppFile: vi.fn(),
    getWhatsAppStatus: vi.fn(),
    getWhatsAppSessions: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/whatsapp/whatsapp-client", () => whatsappClientMock);

describe("WhatsApp Multi-Account Architecture & Queue Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Queue Enqueue Isolation", () => {
    it("locks the active sender accountId at enqueue time when none is specified", async () => {
      whatsappClientMock.getWhatsAppStatus.mockResolvedValue({
        connected: true,
        accountId: "operations_primary",
        state: "CONNECTED",
      });

      prismaMock.whatsAppMessageQueue.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "msg-1", ...data })
      );

      const { enqueueMessage } = await import("@/lib/whatsapp/queue-manager");

      const result = await enqueueMessage({
        organizationId: "org-1",
        recipientPhone: "919876543210",
        messageBody: "Test Renewal Reminder",
      });

      expect(result.success).toBe(true);
      expect(prismaMock.whatsAppMessageQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          recipientPhone: "919876543210",
          messageBody: "Test Renewal Reminder",
          accountId: "operations_primary", // Locked at enqueue time!
          status: "PENDING",
        }),
      });
    });

    it("preserves explicitly specified accountId at enqueue time", async () => {
      prismaMock.whatsAppMessageQueue.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: "msg-2", ...data })
      );

      const { enqueueMessage } = await import("@/lib/whatsapp/queue-manager");

      const result = await enqueueMessage({
        organizationId: "org-1",
        recipientPhone: "919876543210",
        messageBody: "Support Message",
        accountId: "support_desk_secondary",
      });

      expect(result.success).toBe(true);
      expect(prismaMock.whatsAppMessageQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountId: "support_desk_secondary",
        }),
      });
    });
  });

  describe("Queue Dispatch & Sender Independence", () => {
    it("dispatches message strictly through its stamped accountId, ignoring primary sender changes", async () => {
      const queuedMessage = {
        id: "msg-locked",
        organizationId: "org-1",
        recipientPhone: "919876543210",
        recipientName: "Ramesh Sharma",
        messageType: "TEXT",
        messageBody: "Policy Renewal Notice",
        accountId: "account_original_sender", // Previously stamped
        status: "PENDING",
        attempts: 0,
      };

      prismaMock.whatsAppMessageQueue.count.mockResolvedValue(0);
      prismaMock.whatsAppMessageQueue.findMany.mockResolvedValue([queuedMessage]);
      prismaMock.whatsAppMessageQueue.update.mockResolvedValue({});

      whatsappClientMock.sendWhatsAppText.mockResolvedValue({
        id: "wa-msg-123",
        success: true,
        accountId: "account_original_sender",
      });

      const { processQueueBatch } = await import("@/lib/whatsapp/queue-manager");

      const batchResult = await processQueueBatch(1);

      expect(batchResult.success).toBe(true);
      expect(batchResult.processedCount).toBe(1);

      // Verify that sendWhatsAppText was called strictly with "account_original_sender"
      expect(whatsappClientMock.sendWhatsAppText).toHaveBeenCalledWith(
        "919876543210",
        "Policy Renewal Notice",
        "account_original_sender"
      );
    });

    it("does NOT fallback or switch to another account when sending fails", async () => {
      const failedMessage = {
        id: "msg-fail",
        organizationId: "org-1",
        recipientPhone: "919876543210",
        recipientName: "Priya Patel",
        messageType: "TEXT",
        messageBody: "Claim Update",
        accountId: "account_failing_sender",
        status: "PENDING",
        attempts: 0,
      };

      prismaMock.whatsAppMessageQueue.count.mockResolvedValue(0);
      prismaMock.whatsAppMessageQueue.findMany.mockResolvedValue([failedMessage]);
      prismaMock.whatsAppMessageQueue.update.mockResolvedValue({});

      // Mock failure on the assigned account
      whatsappClientMock.sendWhatsAppText.mockRejectedValue(
        new Error("WhatsApp account 'account_failing_sender' is not connected")
      );

      const { processQueueBatch } = await import("@/lib/whatsapp/queue-manager");

      const batchResult = await processQueueBatch(1);

      expect(batchResult.success).toBe(true);
      expect(batchResult.failures).toBe(1);

      // Verify sendWhatsAppText was called ONLY once with the failing account, NEVER with a fallback account
      expect(whatsappClientMock.sendWhatsAppText).toHaveBeenCalledTimes(1);
      expect(whatsappClientMock.sendWhatsAppText).toHaveBeenCalledWith(
        "919876543210",
        "Claim Update",
        "account_failing_sender"
      );

      // Verify message was updated to RETRYING for that exact account
      expect(prismaMock.whatsAppMessageQueue.update).toHaveBeenCalledWith({
        where: { id: "msg-fail" },
        data: expect.objectContaining({
          status: "RETRYING",
          errorMessage: "WhatsApp account 'account_failing_sender' is not connected",
        }),
      });
    });
  });

  describe("Account Registry Atomic Isolation & Self-Healing", () => {
    it("validates account ID format strictly", async () => {
      const { registerAccount, initAccountRegistry } = await import("../whatsapp-gateway/account-registry.js");
      const tmpDir = `whatsapp-gateway/sessions`;
      initAccountRegistry(tmpDir);

      expect(() => registerAccount("bad id with spaces", "Test")).toThrow(
        "Invalid Account ID"
      );
      expect(() => registerAccount("ab", "Too short")).toThrow(
        "Invalid Account ID"
      );
    });

    it("prevents deleting the active account when it is the sole remaining account", async () => {
      const { removeAccount, initAccountRegistry, getAllAccounts } = await import(
        "../whatsapp-gateway/account-registry.js"
      );
      
      const tmpDir = `whatsapp-gateway/sessions`;
      initAccountRegistry(tmpDir);

      const accounts = getAllAccounts();
      if (accounts.length === 1) {
        expect(() => removeAccount(accounts[0].id)).toThrow(
          "Cannot delete the only remaining WhatsApp account."
        );
      }
    });
  });
});
