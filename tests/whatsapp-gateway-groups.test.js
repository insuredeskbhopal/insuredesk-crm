import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatRecipientToJid } from "../whatsapp-gateway/baileys-manager.js";

describe("Baileys gateway group support", () => {
  it("detects individual and group recipients without breaking existing numbers", () => {
    expect(formatRecipientToJid("9876543210")).toBe("919876543210@s.whatsapp.net");
    expect(formatRecipientToJid("919876543210@s.whatsapp.net")).toBe("919876543210@s.whatsapp.net");
    expect(formatRecipientToJid("120363412345678901@g.us")).toBe("120363412345678901@g.us");
    expect(() => formatRecipientToJid("invalid@g.us")).toThrow("Invalid WhatsApp group ID");
  });

  it("wires automatic discovery, persistence, refresh APIs, and the CRM picker", () => {
    const manager = fs.readFileSync(path.join(process.cwd(), "whatsapp-gateway/baileys-manager.js"), "utf8");
    const server = fs.readFileSync(path.join(process.cwd(), "whatsapp-gateway/server.js"), "utf8");
    const picker = fs.readFileSync(path.join(process.cwd(), "src/app/components/whatsapp/WhatsAppRecipientPicker.js"), "utf8");

    expect(manager).toContain("groupFetchAllParticipating");
    expect(manager).toContain("refreshGroups().catch");
    expect(server).toContain('app.get("/groups"');
    expect(server).toContain('app.post("/groups/refresh"');
    expect(picker).toContain("Select a WhatsApp group");
    expect(picker).not.toContain("Group ID");
  });
});
