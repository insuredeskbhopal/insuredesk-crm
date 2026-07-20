import { describe, expect, it } from "vitest";
import { buildWhatsAppTimelineItems } from "../src/lib/renewals/timeline";

describe("renewal WhatsApp timeline", () => {
  it("shows the sent message, sender, time, and selected policy", () => {
    const createdAt = new Date("2026-07-20T11:12:00+05:30");
    const [item] = buildWhatsAppTimelineItems(
      [{
        id: "log-1",
        entityId: "policy-1",
        createdAt,
        metadata: { message: "Exact WhatsApp message", recipientPhone: "918818889660" },
        user: { name: "Anand Soni", email: "anand@example.com" },
      }],
      [{ id: "policy-1", policyNumber: "N4116778", displayPolicyType: "Motor Policy" }],
    );

    expect(item).toMatchObject({
      text: "Exact WhatsApp message",
      createdBy: "Anand Soni",
      createdAt,
      policyNumber: "N4116778",
      policyType: "Motor Policy",
      recipientPhone: "918818889660",
      type: "WHATSAPP_SENT",
      oldStatus: "WhatsApp",
      newStatus: "Message Sent",
    });
  });

  it("shows a useful fallback for older logs that have no stored message", () => {
    const [item] = buildWhatsAppTimelineItems([
      { id: "log-2", entityId: "policy-2", metadata: { senderName: "Staff User" } },
    ]);

    expect(item.text).toBe("WhatsApp renewal reminder sent.");
    expect(item.createdBy).toBe("Staff User");
  });
});
