import { describe, expect, it, vi } from "vitest";
import { compileTemplate } from "../src/lib/whatsapp/queue-manager.js";
import { getOpenwaStatus } from "../src/lib/whatsapp/openwa-client.js";

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

describe("OpenWA REST Client Wrapper", () => {
  it("returns status object when server responds successfully", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: "CONNECTED" }),
    });

    const status = await getOpenwaStatus();
    expect(status.connected).toBe(true);
    expect(status.state).toBe("CONNECTED");
    expect(status.error).toBeUndefined();
  });

  it("returns unreachable state when server fetch fails", async () => {
    fetch.mockRejectedValueOnce(new Error("Connection refused"));

    const status = await getOpenwaStatus();
    expect(status.connected).toBe(false);
    expect(status.state).toBe("UNREACHABLE");
    expect(status.error).toBe("Connection refused");
  });
});
