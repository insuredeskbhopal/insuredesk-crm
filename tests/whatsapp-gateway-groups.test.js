import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatRecipientToJid, normalizeIndianPhone } from "../whatsapp-gateway/baileys-manager.js";

describe("Baileys gateway group support", () => {
  it("detects individual and group recipients without breaking existing numbers", () => {
    expect(formatRecipientToJid("9876543210")).toBe("919876543210@s.whatsapp.net");
    expect(formatRecipientToJid("919876543210@s.whatsapp.net")).toBe("919876543210@s.whatsapp.net");
    expect(formatRecipientToJid("120363412345678901@g.us")).toBe("120363412345678901@g.us");
    expect(() => formatRecipientToJid("invalid@g.us")).toThrow("Invalid WhatsApp group ID");
  });

  it("normalizes customer and participant phone numbers for matching", () => {
    expect(normalizeIndianPhone("+91 91111 11692")).toBe("919111111692");
    expect(normalizeIndianPhone("09111111692")).toBe("919111111692");
    expect(normalizeIndianPhone("919111111692@s.whatsapp.net")).toBe("919111111692");
    expect(normalizeIndianPhone("123456789012345@lid")).toBe("");
  });

  it("wires automatic discovery, persistence, refresh APIs, and the CRM picker", () => {
    const manager = fs.readFileSync(path.join(process.cwd(), "whatsapp-gateway/baileys-manager.js"), "utf8");
    const server = fs.readFileSync(path.join(process.cwd(), "whatsapp-gateway/server.js"), "utf8");
    const picker = fs.readFileSync(path.join(process.cwd(), "src/app/components/whatsapp/WhatsAppRecipientPicker.js"), "utf8");

    expect(manager).toContain("groupFetchAllParticipating");
    expect(manager).toContain("normalizeGroupParticipants");
    expect(manager).toContain("verifiedName");
    expect(manager).toContain("matchGroupsByPhone");
    expect(manager).toContain("refreshGroups().catch");
    expect(server).toContain('app.get("/groups"');
    expect(server).toContain('app.get("/groups/match"');
    expect(server).toContain('app.post("/groups/refresh"');
    expect(picker).toContain("Auto matched");
    expect(picker).toContain("Type at least 2 letters");
    expect(picker).not.toContain("Group ID");
  });
});
