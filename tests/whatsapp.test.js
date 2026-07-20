import { describe, expect, it, vi } from "vitest";
import { compileTemplate } from "../src/lib/whatsapp/queue-manager.js";
import {
  getWhatsAppGroups,
  getWhatsAppStatus,
  matchWhatsAppGroups,
  refreshWhatsAppGroups,
  sendWhatsAppText,
} from "../src/lib/whatsapp/whatsapp-client.js";

// Mock global fetch for REST API tests
global.fetch = vi.fn();

describe("WhatsApp Template Compiler", () => {
  it("compiles variables correctly in templates", () => {
    const template = "Hello {{customerName}}, your {{policyType}} policy {{policyNumber}} with {{companyName}} expires on {{expiryDate}}. Contact {{agentName}}.";
    const variables = {
      customerName: "Abhishek",
      policyType: "Motor",
      policyNumber: "POL-12345",
      companyName: "InsureDesk",
      expiryDate: "15-08-2026",
      agentName: "Agent Amit",
    };

    const compiled = compileTemplate(template, variables);
    expect(compiled).toBe(
      "Hello Abhishek, your Motor policy POL-12345 with InsureDesk expires on 15-08-2026. Contact Agent Amit."
    );
  });

  it("handles empty or missing variables gracefully", () => {
    const template = "Dear {{customerName}}, thank you from {{companyName}}.";
    const compiled = compileTemplate(template, {});
    expect(compiled).toBe("Dear , thank you from .");
  });

  it("ignores whitespace variations inside double brackets", () => {
    const template = "Hello {{ customerName  }}.";
    const compiled = compileTemplate(template, { customerName: "John" });
    expect(compiled).toBe("Hello John.");
  });
});

describe("WhatsApp Gateway REST Client Wrapper", () => {
  it("returns status object when server responds successfully", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ connected: true, state: "CONNECTED" }),
    });

    const status = await getWhatsAppStatus();
    expect(status.connected).toBe(true);
    expect(status.state).toBe("CONNECTED");
    expect(status.error).toBeUndefined();
  });

  it("returns unreachable state when server fetch fails", async () => {
    fetch.mockRejectedValueOnce(new Error("Connection refused"));

    const status = await getWhatsAppStatus();
    expect(status.connected).toBe(false);
    expect(status.state).toBe("UNREACHABLE");
    expect(status.error).toBe("Connection refused");
  });

  it("preserves a WhatsApp group JID when sending", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, id: "group-message" }),
    });

    await sendWhatsAppText("120363412345678901@g.us", "Group reminder");

    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/send-text"),
      expect.objectContaining({
        body: JSON.stringify({ to: "120363412345678901@g.us", content: "Group reminder" }),
      }),
    );
  });

  it("keeps individual number formatting backward compatible", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, id: "individual-message" }),
    });

    await sendWhatsAppText("9876543210", "Individual reminder");

    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/send-text"),
      expect.objectContaining({
        body: JSON.stringify({ to: "919876543210", content: "Individual reminder" }),
      }),
    );
  });

  it("loads and refreshes cached WhatsApp groups", async () => {
    const groups = [{ id: "120363412345678901@g.us", name: "Renewal Team", participants: 5 }];
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(groups) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(groups) });

    await expect(getWhatsAppGroups()).resolves.toEqual(groups);
    await expect(refreshWhatsAppGroups()).resolves.toEqual(groups);
    expect(fetch.mock.calls.at(-2)[0]).toContain("/groups");
    expect(fetch.mock.calls.at(-1)[0]).toContain("/groups/refresh");
  });

  it("matches synced groups using a customer phone number", async () => {
    const match = {
      phone: "919111111692",
      groups: [{ id: "120363412345678901@g.us", name: "Renewal Team", participants: 5 }],
    };
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(match) });

    await expect(matchWhatsAppGroups("+91 91111 11692")).resolves.toEqual(match);
    expect(fetch.mock.calls.at(-1)[0]).toContain("/groups/match?phone=%2B91%2091111%2011692");
  });

  it("replaces an HTML 404 response with a readable group deployment error", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => "text/html" },
      text: () => Promise.resolve("<!DOCTYPE html><pre>Cannot GET /groups</pre>"),
    });

    await expect(getWhatsAppGroups()).rejects.toThrow(
      "WhatsApp group discovery is not active on the gateway. Deploy and restart the latest gateway version.",
    );
  });
});
