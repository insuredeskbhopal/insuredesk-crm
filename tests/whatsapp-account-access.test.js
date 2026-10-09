// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  verifyJWT: vi.fn(),
  getWhatsAppSessions: vi.fn(),
  getWhatsAppMetrics: vi.fn(),
  createWhatsAppSession: vi.fn(),
  setPrimaryWhatsAppSession: vi.fn(),
  pauseWhatsAppSession: vi.fn(),
  logoutWhatsAppSession: vi.fn(),
  deleteWhatsAppSession: vi.fn(),
  getWhatsAppStatus: vi.fn(),
  getWhatsAppQrCode: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ verifyJWT: mocks.verifyJWT }));
vi.mock("@/lib/whatsapp/whatsapp-client", () => mocks);
import { GET, POST } from "@/app/api/operations/whatsapp/sessions/route";
import { GET as status } from "@/app/api/operations/whatsapp/status/route";
import { POST as logout } from "@/app/api/operations/whatsapp/logout/route";
import {
  initAccountRegistry,
  registerAccount,
  updateAccount,
  getAccount,
} from "../whatsapp-gateway/account-registry.js";

const payal = { userId: "payal", organizationId: "org", name: "Payal", role: "MANAGER" };
const own = { id: "payal_wa", ownerUserId: "payal", organizationId: "org", ownerName: "Payal" };
const request = (body = {}, query = "") => ({
  cookies: { get: () => ({ value: "token" }) },
  json: async () => body,
  url: `https://crm.test/api/operations/whatsapp/status${query}`,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.verifyJWT.mockResolvedValue(payal);
  mocks.getWhatsAppSessions.mockResolvedValue([
    own,
    { ...own, id: "other_wa", ownerUserId: "other" },
    { id: "legacy" },
    { ...own, id: "foreign", organizationId: "other-org" },
  ]);
  mocks.getWhatsAppMetrics.mockResolvedValue({ success: true });
  for (const name of [
    "createWhatsAppSession",
    "setPrimaryWhatsAppSession",
    "pauseWhatsAppSession",
    "logoutWhatsAppSession",
    "deleteWhatsAppSession",
  ])
    mocks[name].mockResolvedValue({ success: true });
});

describe("WhatsApp staff ownership", () => {
  it.each(["MANAGER", "AGENT", "ADMIN", "SUPER_ADMIN"])(
    "allows %s to link and stamps JWT ownership, ignoring submitted ownership",
    async (role) => {
      mocks.verifyJWT.mockResolvedValue({ ...payal, role });
      expect(
        (await POST(request({ action: "create", label: "My number", ownerUserId: "other" }))).status,
      ).toBe(200);
      expect(mocks.createWhatsAppSession).toHaveBeenCalledWith("My number", {
        ownerUserId: "payal",
        organizationId: "org",
        ownerName: "Payal",
      });
    },
  );
  it.each(["CLIENT", "VIEWER", "USER"])("rejects %s account mutations", async (role) => {
    mocks.verifyJWT.mockResolvedValue({ ...payal, role });
    expect((await POST(request({ action: "create" }))).status).toBe(403);
    expect(mocks.createWhatsAppSession).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    mocks.verifyJWT.mockResolvedValue(null);
    expect((await POST(request({ action: "create" }))).status).toBe(401);
  });
  it.each(["pause", "logout", "delete", "set-default"])("permits only the owner to %s", async (action) => {
    expect((await POST(request({ action, accountId: own.id }))).status).toBe(200);
    for (const accountId of ["other_wa", "legacy", "foreign", "missing"]) {
      expect((await POST(request({ action, accountId }))).status).toBe(403);
    }
  });
  it("does not give admins an ownership bypass", async () => {
    mocks.verifyJWT.mockResolvedValue({ ...payal, role: "ADMIN" });
    expect((await POST(request({ action: "logout", accountId: "other_wa" }))).status).toBe(403);
    expect(mocks.logoutWhatsAppSession).not.toHaveBeenCalled();
  });
  it("returns management permissions and hides other organizations", async () => {
    const data = await (await GET(request())).json();
    expect(data.canCreate).toBe(true);
    expect(data.accounts.map((a) => [a.id, a.canManage])).toEqual([
      ["payal_wa", true],
      ["other_wa", false],
      ["legacy", false],
    ]);
  });
  it("closes the legacy default-logout bypass", async () => {
    expect((await logout(request())).status).toBe(400);
    expect((await logout(request({ accountId: "other_wa" }))).status).toBe(403);
    expect(mocks.logoutWhatsAppSession).not.toHaveBeenCalled();
    expect((await logout(request({ accountId: own.id }))).status).toBe(200);
  });
  it("polls the owned account QR and denies another user's QR", async () => {
    mocks.getWhatsAppStatus.mockResolvedValue({ connected: false, state: "QR_READY", accountId: own.id });
    mocks.getWhatsAppQrCode.mockResolvedValue({ success: true, qrCode: "qr" });
    expect((await status(request({}, "?accountId=payal_wa"))).status).toBe(200);
    expect(mocks.getWhatsAppQrCode).toHaveBeenCalledWith(own.id);
    mocks.getWhatsAppQrCode.mockClear();
    expect((await status(request({}, "?accountId=other_wa"))).status).toBe(403);
    expect(mocks.getWhatsAppQrCode).not.toHaveBeenCalled();
  });
  it("never exposes another owner's default pairing QR", async () => {
    mocks.getWhatsAppStatus.mockResolvedValue({ connected: false, state: "QR_READY", accountId: "other_wa" });
    expect((await (await status(request())).json()).qrCode).toBeNull();
    expect(mocks.getWhatsAppQrCode).not.toHaveBeenCalled();
  });
  it("persists immutable ownership across registry reloads", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wa-owner-"));
    try {
      initAccountRegistry(dir);
      expect(() => registerAccount("unowned", "Missing owner")).toThrow("owner is required");
      registerAccount(own.id, "Payal", own);
      updateAccount(own.id, { ownerUserId: "other", organizationId: "other-org", status: "CONNECTED" });
      initAccountRegistry(dir);
      expect(getAccount(own.id)).toMatchObject({
        ownerUserId: "payal",
        organizationId: "org",
        status: "CONNECTED",
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
