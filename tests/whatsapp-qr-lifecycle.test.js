// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ sockets: [], make: vi.fn(), auth: vi.fn(), version: vi.fn() }));
vi.mock("../whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/index.js", () => ({
  default: m.make,
  useMultiFileAuthState: m.auth,
  fetchLatestBaileysVersion: m.version,
  makeCacheableSignalKeyStore: vi.fn((keys) => keys),
  DisconnectReason: { loggedOut: 401 },
}));
vi.mock("../whatsapp-gateway/node_modules/qrcode/lib/index.js", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,QR") },
}));
let manager, registry, dir;
beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bhq-qr-"));
  vi.stubEnv("WHATSAPP_GATEWAY_SESSIONS_DIR", dir);
  registry = await import("../whatsapp-gateway/account-registry.js");
  manager = await import("../whatsapp-gateway/baileys-manager.js");
});
beforeEach(() => {
  vi.useFakeTimers();
  m.make.mockClear();
  m.sockets = [];
  m.auth.mockResolvedValue({ state: { creds: {}, keys: {} }, saveCreds: vi.fn() });
  m.version.mockResolvedValue({ version: [2, 3000, 1] });
  m.make.mockImplementation(() => {
    const events = {};
    const socket = {
      events,
      ev: {
        on: (name, handler) => {
          events[name] = handler;
        },
      },
      end: vi.fn(() =>
        events["connection.update"]?.({
          connection: "close",
          lastDisconnect: { error: { output: { statusCode: 500 } } },
        }),
      ),
      logout: vi.fn(),
      groupFetchAllParticipating: vi.fn(async () => ({})),
    };
    m.sockets.push(socket);
    return socket;
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});
afterAll(() => {
  vi.unstubAllEnvs();
  fs.rmSync(dir, { recursive: true, force: true });
});
let counter = 0;
function newAccount() {
  const id = `test_${++counter}`;
  registry.registerAccount(id, id, { ownerUserId: "staff", organizationId: null });
  return id;
}
describe("Pairing and reconnection lifecycle without live WhatsApp", () => {
  it("generates QR and reuses its socket on repeat connect requests", async () => {
    const id = newAccount();
    await manager.startConnection(id);
    await m.sockets[0].events["connection.update"]({ qr: "pairing-token" });
    expect(manager.getQrCode(id)).toContain("data:image/png");
    await manager.startConnection(id);
    expect(m.make).toHaveBeenCalledTimes(1);
    expect(manager.getStatus(id).state).toBe("QR_READY");
  });
  it("reopens the socket after a pairing timeout instead of staying CONNECTING", async () => {
    const id = newAccount();
    await manager.startConnection(id);
    await m.sockets[0].events["connection.update"]({
      connection: "close",
      lastDisconnect: { error: { output: { statusCode: 408 } } },
    });
    expect(manager.getStatus(id).state).toBe("RECONNECTING");
    await vi.advanceTimersByTimeAsync(2000);
    expect(m.make).toHaveBeenCalledTimes(2);
    await m.sockets[1].events["connection.update"]({ qr: "renewed" });
    expect(manager.getStatus(id).state).toBe("QR_READY");
    // A delayed event from the old socket must not invalidate the new pairing.
    await m.sockets[0].events["connection.update"]({ connection: "close" });
    expect(manager.getStatus(id).state).toBe("QR_READY");
  });
  it("does not reconnect a deliberate pause, and explicit connect resumes it", async () => {
    const id = newAccount();
    await manager.startConnection(id);
    await manager.pauseSession(id);
    expect(manager.getStatus(id).state).toBe("PAUSED");
    await vi.advanceTimersByTimeAsync(30000);
    expect(m.make).toHaveBeenCalledTimes(1);
    await manager.startConnection(id);
    expect(m.make).toHaveBeenCalledTimes(2);
    expect(fs.existsSync(path.join(dir, id))).toBe(true);
  });
  it("recovers from initialization failure instead of remaining stuck", async () => {
    const id = newAccount();
    m.version.mockRejectedValueOnce(new Error("Version fetch failed"));
    await expect(manager.startConnection(id)).rejects.toThrow("Version fetch failed");
    await manager.startConnection(id);
    expect(m.make).toHaveBeenCalledTimes(1);
  });
});
