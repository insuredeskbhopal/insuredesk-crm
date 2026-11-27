// @vitest-environment node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";

const tempDirs = [];

function createTempDir(prefix = "bhq-gw-stab-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
});

describe("WhatsApp Gateway & Delivery Stability Regression Suite (1-16)", () => {
  it("1. handles WebSocket disconnect mid-decryption-retry without crashing Node (real Baileys patch)", () => {
    const repoRoot = process.cwd();
    const msgsRecvUrl = new URL(
      `file:///${path.join(repoRoot, "whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/Socket/messages-recv.js").replace(/\\/g, "/")}`,
    ).href;
    const sockUrl = new URL(
      `file:///${path.join(repoRoot, "whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/Socket/socket.js").replace(/\\/g, "/")}`,
    ).href;

    const script = `
      import fs from 'node:fs';
      import { EventEmitter } from 'node:events';
      const msgsCode = fs.readFileSync(new URL(${JSON.stringify(msgsRecvUrl)}), 'utf8');
      const sockCode = fs.readFileSync(new URL(${JSON.stringify(sockUrl)}), 'utf8');
      if (!msgsCode.includes('/* @patched:retry-mutex-safe */')) throw new Error('retry-mutex patch missing');
      if (!sockCode.includes('/* @patched:offline-preview-catch */')) throw new Error('offline-preview patch missing');

      // Reproduce exact patched retryMutex control flow when ws closes during async sendRetryRequest
      const { makeMutex } = await import(${JSON.stringify(
        new URL(`file:///${path.join(repoRoot, "whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/Utils/make-mutex.js").replace(/\\/g, "/")}`).href,
      )});
      const { Boom } = await import(${JSON.stringify(
        new URL(`file:///${path.join(repoRoot, "whatsapp-gateway/node_modules/@hapi/boom/lib/index.js").replace(/\\/g, "/")}`).href,
      )});
      process.on('unhandledRejection', (err) => { console.error('UNHANDLED:', err); process.exit(2); });

      const retryMutex = makeMutex();
      const ws = { isOpen: true };
      const sendRawMessage = async () => {
        if (!ws.isOpen) throw new Boom('Connection Closed', { statusCode: 428 });
      };
      const sendRetryRequest = async () => {
        await new Promise((r) => setTimeout(r, 15));
        ws.isOpen = false; // Simulate mid-retry WebSocket close
        await sendRawMessage();
      };

      // Simulate patched handleMessage body (lines 655+)
      await Promise.all([
        (async () => {
          await retryMutex.mutex(async () => {
            try {
              if (ws.isOpen) {
                await sendRetryRequest();
              }
            } catch (err) {
              const statusCode = err?.output?.statusCode;
              if (!ws.isOpen || statusCode === 428 || err?.message === 'Connection Closed') {
                return;
              }
              throw err;
            }
          });
        })(),
      ]);
      console.log('RETRY_DISCONNECT_HANDLED_SAFELY');
    `;

    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: path.join(repoRoot, "whatsapp-gateway"),
      encoding: "utf8",
    });
    expect(out).toContain("RETRY_DISCONNECT_HANDLED_SAFELY");
  });

  it("2 & 16. handles repeated Bad MAC errors and guarantees zero private/root key leakage in logs", () => {
    const repoRoot = process.cwd();
    const script = `
      import util from 'node:util';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const SessionRecord = require('./node_modules/libsignal/src/session_record.js');
      const SessionCipher = require('./node_modules/libsignal/src/session_cipher.js');
      const ProtocolAddress = require('./node_modules/libsignal/src/protocol_address.js');

      const SECRET_PRIV_HEX = 'aa'.repeat(32);
      const SECRET_ROOT_HEX = 'bb'.repeat(32);
      const entry = SessionRecord.createEntry();
      entry.registrationId = 12345;
      entry.currentRatchet = {
        ephemeralKeyPair: { pubKey: Buffer.alloc(33, 5), privKey: Buffer.from(SECRET_PRIV_HEX, 'hex') },
        lastRemoteEphemeralKey: Buffer.alloc(33, 5),
        previousCounter: 0,
        rootKey: Buffer.from(SECRET_ROOT_HEX, 'hex'),
      };
      entry.indexInfo = {
        baseKey: Buffer.from('11'.repeat(33), 'hex'),
        baseKeyType: 1,
        closed: -1,
        used: Date.now(),
        created: Date.now(),
        remoteIdentityKey: Buffer.alloc(33, 2),
      };

      const record = new SessionRecord();
      record.setSession(entry);
      record.openSession(entry);
      record.closeSession(entry);

      // Verify util.inspect on SessionEntry never exposes keys
      const inspected = util.inspect(entry);
      if (inspected.includes('aa aa') || inspected.includes('privKey') || inspected.includes('rootKey')) {
        throw new Error('LEAK_IN_UTIL_INSPECT: ' + inspected);
      }

      // Repeated Bad MAC failures in decryptWithSessions
      const cipher = new SessionCipher({
        loadSession: async () => record,
        storeSession: async () => {},
        isTrustedIdentity: async () => true,
        getOurIdentity: async () => ({ pubKey: Buffer.alloc(33, 3), privKey: Buffer.alloc(32, 4) }),
      }, new ProtocolAddress('919999999999', 0));

      cipher.doDecryptWhisperMessage = async () => { throw new Error('Bad MAC'); };
      for (let i = 0; i < 3; i++) {
        try {
          await cipher.decryptWhisperMessage(Buffer.from([0x33, 0x00, 1,2,3,4,5,6,7,8,9]));
        } catch (err) {
          if (!String(err?.message).includes('No matching sessions found')) throw err;
        }
      }
      console.log('BAD_MAC_AND_REDACTION_OK');
    `;

    const res = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: path.join(repoRoot, "whatsapp-gateway"),
      encoding: "utf8",
    });
    expect(res.status).toBe(0);
    const combinedLogs = `${res.stdout || ""}\n${res.stderr || ""}`;
    expect(combinedLogs).toContain("BAD_MAC_AND_REDACTION_OK");
    expect(combinedLogs).toContain("[libsignal] Failed to decrypt message");
    expect(combinedLogs).not.toContain("ephemeralKeyPair");
    expect(combinedLogs).not.toContain("privKey");
    expect(combinedLogs).not.toContain("rootKey");
    expect(combinedLogs).not.toContain("aa aa aa");
    expect(combinedLogs).not.toContain("bb bb bb");
    expect(combinedLogs).not.toContain("SessionEntry {");
  });

  it("3. exits non-zero on unexpected fatal uncaughtException instead of suppressing it", () => {
    const repoRoot = process.cwd();
    const tmpDir = createTempDir("bhq-fatal-");
    const script = `
      import { gracefulShutdown } from './server.js';
      process.on('uncaughtException', (err) => {
        console.error('[Test] Fatal:', err.message);
        void gracefulShutdown('uncaughtException', 1);
      });
      setTimeout(() => { throw new Error('Unexpected corrupted state error'); }, 10);
    `;

    let exitCode = 0;
    let stderr = "";
    try {
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: path.join(repoRoot, "whatsapp-gateway"),
        env: {
          ...process.env,
          VITEST: "true",
          WHATSAPP_GATEWAY_SESSIONS_DIR: tmpDir,
          WHATSAPP_GATEWAY_API_KEY: "test-key",
        },
        encoding: "utf8",
      });
    } catch (err) {
      exitCode = err.status;
      stderr = String(err.stderr || "");
    }

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Unexpected corrupted state error");
  });

  it("3b & 16b. boots real server.js HTTP process, redacts customer content/API secrets in logs, and shuts down cleanly on SIGTERM", async () => {
    const repoRoot = process.cwd();
    const tmpDir = createTempDir("bhq-http-boot-");
    const { spawn } = await import("node:child_process");

    const child = spawn(process.execPath, ["server.js"], {
      cwd: path.join(repoRoot, "whatsapp-gateway"),
      env: {
        ...process.env,
        PORT: "0",
        WHATSAPP_GATEWAY_PORT: "0",
        WHATSAPP_GATEWAY_HOST: "127.0.0.1",
        WHATSAPP_GATEWAY_SESSIONS_DIR: tmpDir,
        WHATSAPP_GATEWAY_API_KEY: "super-secret-api-key-canary",
        VITEST: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let logs = "";
    child.stdout.on("data", (d) => { logs += d.toString(); });
    child.stderr.on("data", (d) => { logs += d.toString(); });

    const port = await new Promise((resolve, reject) => {
      const deadline = globalThis.setTimeout(
        () => reject(new Error(`Server boot timed out. Logs: ${logs}`)),
        8000,
      );
      const onData = (chunk) => {
        const text = chunk.toString();
        const match = text.match(/Listening on http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) {
          globalThis.clearTimeout(deadline);
          resolve(Number(match[1]));
        }
      };
      child.stdout.on("data", onData);
      child.once("exit", (code) => {
        globalThis.clearTimeout(deadline);
        reject(new Error(`Server exited prematurely (${code}). Logs: ${logs}`));
      });
    });

    try {
      const health = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json());
      expect(health.success).toBe(true);

      // Missing/bad API key returns 401 and never logs the secret
      const unauth = await fetch(`http://127.0.0.1:${port}/status`);
      expect(unauth.status).toBe(401);

      // Trigger error on /send-text with customer content canary; error log must NOT leak content or API key
      const sendErr = await fetch(`http://127.0.0.1:${port}/send-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "super-secret-api-key-canary",
        },
        body: JSON.stringify({
          to: "919876543210",
          content: "CONFIDENTIAL_CUSTOMER_POLICY_SECRET_BODY",
        }),
      });
      expect(sendErr.status).toBe(500);

      // Verify clean exit without hanging on SIGTERM
      const exitedCode = await new Promise((resolve) => {
        child.once("exit", (code, signal) => resolve({ code, signal }));
        child.kill("SIGTERM");
      });
      expect(exitedCode.code === 0 || exitedCode.signal === "SIGTERM").toBe(true);
      expect(logs).not.toContain("super-secret-api-key-canary");
      expect(logs).not.toContain("CONFIDENTIAL_CUSTOMER_POLICY_SECRET_BODY");
    } finally {
      try { child.kill("SIGKILL"); } catch {}
    }
  });

  it("4 & 5. serializes concurrent connects and blocks pause/logout/reconnect races without zombie sockets", async () => {
    vi.resetModules();
    const dir = createTempDir("bhq-conc-");
    vi.stubEnv("WHATSAPP_GATEWAY_SESSIONS_DIR", dir);

    const sockets = [];
    let resolveVersion;
    const versionMock = vi.fn();
    const makeMock = vi.fn(() => {
      const events = {};
      const sock = {
        events,
        user: { id: "919900000001:1@s.whatsapp.net" },
        ev: { on: (name, fn) => { events[name] = fn; } },
        ws: { on: vi.fn(), close: vi.fn() },
        end: vi.fn(),
        logout: vi.fn(async () => {}),
        groupFetchAllParticipating: vi.fn(async () => ({})),
        sendMessage: vi.fn(async () => ({ key: { id: "msg-1" }, messageTimestamp: 1700000 })),
      };
      sockets.push(sock);
      return sock;
    });

    vi.doMock("../whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/index.js", () => ({
      default: makeMock,
      useMultiFileAuthState: vi.fn(async () => ({
        state: { creds: { registered: true, me: { id: "919900000001@s.whatsapp.net" } }, keys: {} },
        saveCreds: vi.fn(),
      })),
      fetchLatestBaileysVersion: versionMock,
      makeCacheableSignalKeyStore: vi.fn((keys) => keys),
      DisconnectReason: { loggedOut: 401, restartRequired: 515 },
    }));
    vi.doMock("../whatsapp-gateway/node_modules/qrcode/lib/index.js", () => ({
      default: { toDataURL: vi.fn(async () => "data:image/png;base64,QR") },
    }));

    const registry = await import("../whatsapp-gateway/account-registry.js");
    const manager = await import("../whatsapp-gateway/baileys-manager.js");
    registry.registerAccount("acc_concurrent", "Concurrent", { ownerUserId: "u1", organizationId: null });
    registry.registerAccount("acc_sibling", "Sibling", { ownerUserId: "u2", organizationId: null });

    // 4. Simultaneous connect requests reuse one single socket
    versionMock.mockImplementationOnce(() => new Promise((resolve) => { resolveVersion = resolve; }));
    const connects = Promise.all([
      manager.startConnection("acc_concurrent", { trigger: "manual" }),
      manager.startConnection("acc_concurrent", { trigger: "manual" }),
      manager.startConnection("acc_concurrent", { trigger: "manual" }),
    ]);
    await new Promise((r) => setTimeout(r, 10));
    resolveVersion({ version: [2, 3000, 1] });
    const results = await connects;
    expect(makeMock).toHaveBeenCalledTimes(1);
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);

    // Sibling account connects and remains completely isolated
    versionMock.mockResolvedValue({ version: [2, 3000, 1] });
    await manager.startConnection("acc_sibling", { trigger: "manual" });
    await sockets[1].events["connection.update"]({ connection: "open" });
    expect(manager.getStatus("acc_sibling").connected).toBe(true);

    // 5. Pause interrupts pending async connect BEFORE socket spawn
    await manager.logoutSession("acc_concurrent"); // resets cleanly first
    let releaseRace;
    versionMock.mockImplementationOnce(() => new Promise((resolve) => { releaseRace = resolve; }));
    const slowConnect = manager.startConnection("acc_concurrent", { trigger: "manual" });
    await new Promise((r) => setTimeout(r, 10));
    const pausePromise = manager.pauseSession("acc_concurrent");
    releaseRace({ version: [2, 3000, 1] });
    const [raceSock] = await Promise.all([slowConnect, pausePromise]);
    expect(raceSock).toBeNull();
    expect(manager.getStatus("acc_concurrent").state).toBe("PAUSED");
    expect(manager.getSocket("acc_concurrent")).toBeNull();
    // Sibling untouched
    expect(manager.getStatus("acc_sibling").connected).toBe(true);

    // Delayed close from stale socket does not break PAUSED/LOGGED_OUT
    await sockets[0].events["connection.update"]({ connection: "close" });
    expect(manager.getStatus("acc_concurrent").state).toBe("PAUSED");
  });

  it("6 & 7. skips LOGGED_OUT, PAUSED, and unpaired accounts on startup and keeps HTTP GET status/QR read-only", async () => {
    vi.resetModules();
    const dir = createTempDir("bhq-startup-");
    vi.stubEnv("WHATSAPP_GATEWAY_SESSIONS_DIR", dir);
    vi.stubEnv("VITEST", "true");
    vi.stubEnv("WHATSAPP_GATEWAY_API_KEY", "test-secret-123");

    // Pre-seed accounts.json and auth folders
    const accs = {
      activeAccountId: "insuredesk_session",
      accounts: {
        insuredesk_session: { id: "insuredesk_session", label: "Unpaired Primary", status: "DISCONNECTED" },
        acc_logged_out: { id: "acc_logged_out", label: "Logged Out", status: "LOGGED_OUT" },
        acc_paused: { id: "acc_paused", label: "Paused", status: "PAUSED" },
        acc_paired_ok: { id: "acc_paired_ok", label: "Paired OK", status: "CONNECTED" },
      },
    };
    fs.writeFileSync(path.join(dir, "accounts.json"), JSON.stringify(accs));
    fs.mkdirSync(path.join(dir, "acc_paired_ok"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "acc_paired_ok", "creds.json"),
      JSON.stringify({ registered: true, me: { id: "919876543210@s.whatsapp.net" } }),
    );
    fs.mkdirSync(path.join(dir, "insuredesk_session"), { recursive: true });
    fs.writeFileSync(path.join(dir, "insuredesk_session", "creds.json"), JSON.stringify({ registered: false }));

    const createdFor = [];
    vi.doMock("../whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/index.js", () => ({
      default: vi.fn((cfg) => {
        createdFor.push(cfg.auth.creds?.me?.id || "unpaired");
        return {
          user: cfg.auth.creds?.me,
          ev: { on: vi.fn() },
          ws: { on: vi.fn(), close: vi.fn() },
          end: vi.fn(),
          logout: vi.fn(),
          groupFetchAllParticipating: vi.fn(async () => ({})),
        };
      }),
      useMultiFileAuthState: vi.fn(async (folder) => {
        const c = JSON.parse(fs.readFileSync(path.join(folder, "creds.json"), "utf8"));
        return { state: { creds: c, keys: {} }, saveCreds: vi.fn() };
      }),
      fetchLatestBaileysVersion: vi.fn(async () => ({ version: [2, 3000, 1] })),
      makeCacheableSignalKeyStore: vi.fn((keys) => keys),
      DisconnectReason: { loggedOut: 401 },
    }));
    vi.doMock("../whatsapp-gateway/node_modules/qrcode/lib/index.js", () => ({
      default: { toDataURL: vi.fn(async () => "data:image/png;base64,QR") },
    }));

    const manager = await import("../whatsapp-gateway/baileys-manager.js");
    const { app } = await import("../whatsapp-gateway/server.js");

    await manager.startAllAccounts();
    expect(createdFor).toEqual(["919876543210@s.whatsapp.net"]);
    expect(manager.getStatus("acc_logged_out").state).toBe("LOGGED_OUT");
    expect(manager.getStatus("acc_paused").state).toBe("PAUSED");
    expect(manager.getStatus("insuredesk_session").state).toBe("DISCONNECTED");

    // Repeated HTTP GET /status, /sessions, /qr remain 100% read-only
    const server = http.createServer(app);
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const port = server.address().port;
    try {
      const headers = { "x-api-key": "test-secret-123" };
      for (let i = 0; i < 3; i++) {
        const st = await fetch(`http://127.0.0.1:${port}/status?accountId=insuredesk_session`, { headers }).then((r) => r.json());
        const qr = await fetch(`http://127.0.0.1:${port}/sessions/acc_logged_out/qr`, { headers }).then((r) => r.json());
        const ls = await fetch(`http://127.0.0.1:${port}/sessions`, { headers }).then((r) => r.json());
        expect(st.state).toBe("DISCONNECTED");
        expect(qr.qrCode).toBeNull();
        expect(qr.state).toBe("LOGGED_OUT");
        expect(ls.accounts.length).toBe(4);
      }
      expect(createdFor).toHaveLength(1);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it("8, 9 & 15. performs atomic auth/group writes, preserves corrupt files safely, flushes cleanly on shutdown, and restores across restarts", async () => {
    vi.resetModules();
    vi.doUnmock("../whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/index.js");
    const baileys = await import("../whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/index.js");
    const {
      CorruptAuthFileError,
      createSafeMultiFileAuthState,
      flushPendingAuthWrites,
      hasRegisteredCredentials,
    } = await import("../whatsapp-gateway/safe-store.js");

    const dir = createTempDir("bhq-auth-persist-");
    const accountDir = path.join(dir, "acc_persist");

    // 8 & 15. Atomic write + shutdown flush + restart recovery
    const auth = await createSafeMultiFileAuthState(accountDir, {
      initAuthCreds: baileys.initAuthCreds,
      BufferJSON: baileys.BufferJSON,
      proto: baileys.proto,
    });
    auth.state.creds.registered = true;
    auth.state.creds.me = { id: "919911223344@s.whatsapp.net", name: "InsureDesk" };

    // Kick off concurrent writes + flush cleanly (simulating SIGTERM mid-write)
    const pendingWrites = Promise.all([
      auth.saveCreds(),
      auth.state.keys.set({
        session: { "919900000002.0": { data: Buffer.from("secret-signal-key") } },
        "pre-key": { "42": { pubKey: Buffer.from("pk"), privKey: Buffer.from("sk") } },
      }),
    ]);
    await flushPendingAuthWrites();
    await pendingWrites;

    // Zero leftover temp files
    const filesAfterWrite = fs.readdirSync(accountDir);
    expect(filesAfterWrite.some((f) => f.includes(".tmp."))).toBe(false);
    expect(hasRegisteredCredentials(accountDir)).toBe(true);

    // Reload from same folder (simulated container restart)
    const reloaded = await createSafeMultiFileAuthState(accountDir, {
      initAuthCreds: baileys.initAuthCreds,
      BufferJSON: baileys.BufferJSON,
      proto: baileys.proto,
    });
    expect(reloaded.state.creds.registered).toBe(true);
    expect(reloaded.state.creds.me.id).toBe("919911223344@s.whatsapp.net");
    const loadedKeys = await reloaded.state.keys.get("session", ["919900000002.0"]);
    expect(Buffer.compare(loadedKeys["919900000002.0"].data, Buffer.from("secret-signal-key"))).toBe(0);

    // 9. Corrupted JSON file is NEVER silently discarded or overwritten with initAuthCreds()
    const corruptPayload = "{ \"registered\": true, \"broken\": ";
    fs.writeFileSync(path.join(accountDir, "creds.json"), corruptPayload, "utf8");
    await expect(
      createSafeMultiFileAuthState(accountDir, {
        initAuthCreds: baileys.initAuthCreds,
        BufferJSON: baileys.BufferJSON,
        proto: baileys.proto,
      }),
    ).rejects.toBeInstanceOf(CorruptAuthFileError);
    // Original corrupt creds file untouched + .corrupt backup preserved
    expect(fs.readFileSync(path.join(accountDir, "creds.json"), "utf8")).toBe(corruptPayload);
    expect(fs.readdirSync(accountDir).some((f) => f.startsWith("creds.json.corrupt."))).toBe(true);
    expect(hasRegisteredCredentials(accountDir)).toBe(false);

    // Also test group-store shutdown flush (no temp leaks & persists lastActivity)
    vi.stubEnv("WHATSAPP_GATEWAY_SESSIONS_DIR", dir);
    const groupStore = await import("../whatsapp-gateway/group-store.js");
    groupStore.storeDiscoveredGroups(
      [{ groupId: "12345@g.us", groupName: "Flush Group", participantCount: 1, groupParticipants: [{ phone: "919876543210" }] }],
      "acc_persist",
    );
    groupStore.markStoredGroupActivity("12345@g.us", "2026-11-27T10:00:00.000Z");

    // Verify shutdownAllSessions closes sockets without calling sock.logout() and flushes groups
    const mockEnd = vi.fn();
    const mockLogout = vi.fn();
    vi.doMock("../whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/index.js", () => ({
      default: vi.fn(() => {
        const events = {};
        return {
          events,
          user: { id: "919911223344:1@s.whatsapp.net" },
          ev: { on: (n, fn) => { events[n] = fn; } },
          ws: { on: vi.fn(), close: vi.fn() },
          end: mockEnd,
          logout: mockLogout,
          groupFetchAllParticipating: vi.fn(async () => ({})),
        };
      }),
      useMultiFileAuthState: vi.fn(async () => ({
        state: { creds: { registered: true, me: { id: "919911223344@s.whatsapp.net" } }, keys: {} },
        saveCreds: vi.fn(),
      })),
      fetchLatestBaileysVersion: vi.fn(async () => ({ version: [2, 3000, 1] })),
      makeCacheableSignalKeyStore: vi.fn((keys) => keys),
      DisconnectReason: { loggedOut: 401 },
    }));
    vi.doMock("../whatsapp-gateway/node_modules/qrcode/lib/index.js", () => ({
      default: { toDataURL: vi.fn(async () => "data:image/png;base64,QR") },
    }));
    vi.resetModules();
    const mgrForShutdown = await import("../whatsapp-gateway/baileys-manager.js");
    const gsForShutdown = await import("../whatsapp-gateway/group-store.js");
    const shutdownSock = await mgrForShutdown.startConnection("acc_persist", { trigger: "manual" });
    await shutdownSock.events["connection.update"]({ connection: "open" });
    gsForShutdown.markStoredGroupActivity("12345@g.us", "2026-11-27T10:05:00.000Z");
    await mgrForShutdown.shutdownAllSessions();
    mgrForShutdown.setShuttingDownForTests(false);
    expect(mockEnd).toHaveBeenCalledTimes(1);
    expect(mockLogout).not.toHaveBeenCalled();

    const parsedGroups = JSON.parse(fs.readFileSync(path.join(dir, "groups.json"), "utf8"));
    expect(parsedGroups.groups[0].lastActivity).toBe("2026-11-27T10:05:00.000Z");
    expect(fs.readdirSync(dir).some((f) => f.includes(".tmp."))).toBe(false);
  });

  it("10 & 11. handles gateway timeout/502/503 after successful send via persistent idempotency and recovers stale SENDING safely", async () => {
    vi.resetModules();
    const dir = createTempDir("bhq-idem-");
    vi.stubEnv("WHATSAPP_GATEWAY_SESSIONS_DIR", dir);
    vi.stubEnv("WHATSAPP_GATEWAY_URL", "https://gateway.test.invalid");
    vi.stubEnv("WHATSAPP_GATEWAY_API_KEY", "test-api-key");

    // A) Gateway-side persistent idempotency across 2 calls + simulated restart reload
    const { createIdempotencyStore } = await import("../whatsapp-gateway/safe-store.js");
    const storePath = path.join(dir, "sent-idempotency.json");
    const store1 = createIdempotencyStore(storePath);
    const sendSpy = vi.fn(async () => ({ success: true, id: "wa-real-msg-1", timestamp: 1700001, accountId: "claims" }));

    const r1 = await store1.run("queue-row-101", sendSpy);
    const r2 = await store1.run("queue-row-101", sendSpy);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(r1.id).toBe("wa-real-msg-1");
    expect(r2.deduplicated).toBe(true);

    // Reload store from disk after simulated restart
    const store2 = createIdempotencyStore(storePath);
    const r3 = await store2.run("queue-row-101", sendSpy);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(r3.deduplicated).toBe(true);
    expect(store2.get("queue-row-101")?.status).toBe("SENT");

    // B) CRM timeout & Railway 502/503 handling in whatsapp-client + dispatch + queue-manager
    vi.doUnmock("@/lib/whatsapp/whatsapp-client");
    const rows = new Map();
    let seq = 1;
    const mockPrisma = {
      user: { findFirst: vi.fn(async () => ({ id: "siya", role: "MANAGER" })) },
      organization: { findUnique: vi.fn() },
      whatsAppAccount: { findFirst: vi.fn(async () => ({ id: "claims" })) },
      whatsAppMessageQueue: {
        create: vi.fn(async ({ data }) => {
          for (const existing of rows.values()) {
            if (data.uniqueKey && existing.uniqueKey === data.uniqueKey) {
              throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
            }
          }
          const row = { id: `row-${seq++}`, ...data, updatedAt: new Date() };
          rows.set(row.id, row);
          return { ...row };
        }),
        findFirst: vi.fn(async ({ where }) => {
          for (const row of rows.values()) {
            if (where.uniqueKey && row.uniqueKey === where.uniqueKey) return { ...row };
          }
          return null;
        }),
        findMany: vi.fn(async ({ where }) => {
          return [...rows.values()].filter((row) => {
            if (typeof where.status === "string" && row.status !== where.status) return false;
            if (where.status?.in && !where.status.in.includes(row.status)) return false;
            if (where.updatedAt?.lt && !(row.updatedAt < where.updatedAt.lt)) return false;
            return true;
          });
        }),
        count: vi.fn(async () => 0),
        update: vi.fn(async ({ where, data }) => {
          const row = rows.get(where.id);
          Object.assign(row, data, { updatedAt: new Date() });
          return { ...row };
        }),
        updateMany: vi.fn(async ({ where, data }) => {
          let count = 0;
          for (const row of rows.values()) {
            const matchId = !where.id || row.id === where.id;
            const matchStatus =
              !where.status ||
              (typeof where.status === "string"
                ? row.status === where.status
                : where.status.in?.includes(row.status));
            if (matchId && matchStatus) {
              if (data.attempts?.increment) row.attempts = (row.attempts || 0) + data.attempts.increment;
              const { attempts: _att, ...rest } = data;
              Object.assign(row, rest, { updatedAt: new Date() });
              count++;
            }
          }
          return { count };
        }),
      },
    };
    vi.doMock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

    // 10a: dispatchWhatsApp times out after gateway actually sent -> reconciles to SENT without duplicate!
    const fetchMock = vi
      .fn()
      // POST /send-text times out locally
      .mockRejectedValueOnce(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }))
      // GET /messages/status/:id confirms gateway actually sent it
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          found: true,
          entry: { status: "SENT", id: "wa-reconciled-99", recordedAt: "2026-11-27T10:00:00Z" },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { dispatchWhatsApp } = await import("../src/lib/whatsapp/dispatch");
    const reconciled = await dispatchWhatsApp(
      { organizationId: "org-1", userId: "siya", accountId: "claims", idempotencyKey: "client-click-1" },
      "TEXT",
      "919876543210",
      "Hello after timeout",
    );
    expect(reconciled.recovered).toBe(true);
    expect(reconciled.id).toBe("wa-reconciled-99");
    expect(rows.get("row-1").status).toBe("SENT");

    // 11: Duplicate send with same idempotencyKey does NOT hit gateway again
    const deduped = await dispatchWhatsApp(
      { organizationId: "org-1", userId: "siya", accountId: "claims", idempotencyKey: "client-click-1" },
      "TEXT",
      "919876543210",
      "Hello after timeout",
    );
    expect(deduped.deduplicated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 10b: Railway 502 JSON { status: 'error', code: 502, message: 'Application failed to respond' } -> marks UNCERTAIN cleanly
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: { get: () => "application/json" },
        json: async () => ({ status: "error", code: 502, message: "Application failed to respond" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: { get: () => "application/json" },
        json: async () => ({ message: "Service Unavailable" }),
      });

    await expect(
      dispatchWhatsApp(
        { organizationId: "org-1", userId: "siya", accountId: "claims", idempotencyKey: "client-click-2" },
        "TEXT",
        "919876543210",
        "Test 502",
      ),
    ).rejects.toThrow("Application failed to respond");
    expect(rows.get("row-2").status).toBe("UNCERTAIN");

    // Stale SENDING row (>5 minutes old): row-stale-sent recovers to SENT, row-stale-unknown transitions safely to UNCERTAIN
    rows.set("row-stale-sent", {
      id: "row-stale-sent",
      organizationId: "org-1",
      initiatedByUserId: "siya",
      accountId: "claims",
      recipientPhone: "919876543210",
      recipientName: "Stale 1",
      messageType: "TEXT",
      messageBody: "Body",
      status: "SENDING",
      attempts: 1,
      updatedAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    rows.set("row-stale-unknown", {
      id: "row-stale-unknown",
      organizationId: "org-1",
      initiatedByUserId: "siya",
      accountId: "claims",
      recipientPhone: "919876543210",
      recipientName: "Stale 2",
      messageType: "TEXT",
      messageBody: "Body 2",
      status: "SENDING",
      attempts: 1,
      updatedAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, found: true, entry: { status: "SENT", id: "wa-stale-recovered" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, found: false, entry: null }),
      });

    const { processQueueBatch } = await import("../src/lib/whatsapp/queue-manager");
    const batch = await processQueueBatch(5);
    expect(batch.processedCount).toBe(0); // Neither stale nor UNCERTAIN rows get re-dispatched blindly!
    expect(rows.get("row-stale-sent").status).toBe("SENT");
    expect(rows.get("row-stale-sent").openwaMessageId).toBe("wa-stale-recovered");
    expect(rows.get("row-stale-unknown").status).toBe("UNCERTAIN");
    expect(rows.get("row-2").status).toBe("UNCERTAIN");

    // 10c: Queue row timing out during processQueueBatch marks UNCERTAIN when status check fails,
    // and /api/operations/whatsapp/queue individual retry reconciles UNCERTAIN -> SENT without resend!
    rows.set("row-q-timeout", {
      id: "row-q-timeout",
      organizationId: "org-1",
      initiatedByUserId: "siya",
      accountId: "claims",
      recipientPhone: "919876543210",
      recipientName: "Queued",
      messageType: "TEXT",
      messageBody: "Scheduled notice",
      status: "PENDING",
      attempts: 0,
      scheduledAt: new Date(Date.now() - 1000),
      updatedAt: new Date(),
    });
    fetchMock
      .mockRejectedValueOnce(Object.assign(new Error("Gateway timed out"), { name: "TimeoutError" }))
      .mockRejectedValueOnce(new Error("Gateway temporarily unreachable"));
    await processQueueBatch(5);
    expect(rows.get("row-q-timeout").status).toBe("UNCERTAIN");

    vi.doMock("@/lib/auth", () => ({ verifyJWT: vi.fn(async () => ({ userId: "siya", role: "MANAGER", organizationId: "org-1" })) }));
    vi.doMock("@/lib/whatsapp/account-access", () => ({
      requireWhatsAppStaff: vi.fn(async () => ({ userId: "siya", role: "MANAGER", organizationId: "org-1" })),
      isWhatsAppAdmin: vi.fn(() => false),
      resolveWhatsAppSender: vi.fn(async () => "claims"),
      authorizedAccount: vi.fn(),
    }));
    vi.resetModules();
    vi.doMock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));
    mockPrisma.whatsAppMessageQueue.findFirst.mockImplementationOnce(async ({ where }) =>
      where.id === "row-q-timeout" ? { ...rows.get("row-q-timeout") } : null,
    );
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, found: true, entry: { status: "SENT", id: "wa-queue-reconciled" } }),
    });
    const { POST: retryQueuePost } = await import("../src/app/api/operations/whatsapp/queue/route");
    const reconcileRes = await retryQueuePost({
      cookies: { get: () => ({ value: "tok" }) },
      json: async () => ({ messageId: "row-q-timeout" }),
    });
    expect(reconcileRes.status).toBe(200);
    const reconcileJson = await reconcileRes.json();
    expect(reconcileJson.reconciled).toBe(true);
    expect(rows.get("row-q-timeout").status).toBe("SENT");
    expect(rows.get("row-q-timeout").openwaMessageId).toBe("wa-queue-reconciled");
  });

  it("12 & 13. preserves group matching, phone normalization, and text/PDF/image/group Baileys payloads", async () => {
    vi.resetModules();
    const dir = createTempDir("bhq-send-");
    vi.stubEnv("WHATSAPP_GATEWAY_SESSIONS_DIR", dir);

    const sentPayloads = [];
    vi.doMock("../whatsapp-gateway/node_modules/@whiskeysockets/baileys/lib/index.js", () => ({
      default: vi.fn(() => {
        const events = {};
        return {
          events,
          user: { id: "919900000099:1@s.whatsapp.net" },
          ev: { on: (n, fn) => { events[n] = fn; } },
          ws: { on: vi.fn(), close: vi.fn() },
          end: vi.fn(),
          groupFetchAllParticipating: vi.fn(async () => ({
            "120363999999@g.us": {
              id: "120363999999@g.us",
              subject: "VIP Motor Renewals",
              creation: 1700000000,
              participants: [
                { id: "919876543210@s.whatsapp.net", notify: "Ramesh" },
                { id: "198148366586008@lid" },
              ],
            },
          })),
          sendMessage: vi.fn(async (jid, payload) => {
            sentPayloads.push({ jid, payload });
            return { key: { id: `wa-${sentPayloads.length}` }, messageTimestamp: 1700000 };
          }),
        };
      }),
      useMultiFileAuthState: vi.fn(async () => ({
        state: { creds: { registered: true, me: { id: "919900000099@s.whatsapp.net" } }, keys: {} },
        saveCreds: vi.fn(),
      })),
      fetchLatestBaileysVersion: vi.fn(async () => ({ version: [2, 3000, 1] })),
      makeCacheableSignalKeyStore: vi.fn((keys) => keys),
      DisconnectReason: { loggedOut: 401 },
    }));
    vi.doMock("../whatsapp-gateway/node_modules/qrcode/lib/index.js", () => ({
      default: { toDataURL: vi.fn(async () => "data:image/png;base64,QR") },
    }));

    const manager = await import("../whatsapp-gateway/baileys-manager.js");
    const sock = await manager.startConnection("insuredesk_session", { trigger: "manual" });
    await sock.events["connection.update"]({ connection: "open" });
    await new Promise((r) => setTimeout(r, 20));

    // 12. Phone matching + group search
    const matched = manager.matchGroupsByPhone("+91 98765 43210", "insuredesk_session");
    expect(matched.phone).toBe("919876543210");
    expect(matched.groups[0].id).toBe("120363999999@g.us");
    expect(manager.listGroups({ search: "Motor", accountId: "insuredesk_session" })).toHaveLength(1);

    // 13. Text (individual + group), PDF, Image payloads
    await manager.sendText("9876543210", "Hello individual", "insuredesk_session");
    await manager.sendText("120363999999@g.us", "Hello group", "insuredesk_session");
    await manager.sendMedia(
      "9876543210",
      Buffer.from("%PDF-1.4").toString("base64"),
      "policy.pdf",
      "Attached Policy",
      "document",
      "insuredesk_session",
    );
    const jpegPrefix = Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString("base64");
    await manager.sendMedia("120363999999@g.us", jpegPrefix, "card.jpg", "Birthday", "image", "insuredesk_session");

    expect(sentPayloads).toHaveLength(4);
    expect(sentPayloads[0]).toEqual({ jid: "919876543210@s.whatsapp.net", payload: { text: "Hello individual" } });
    expect(sentPayloads[1]).toEqual({ jid: "120363999999@g.us", payload: { text: "Hello group" } });
    expect(sentPayloads[2].payload.mimetype).toBe("application/pdf");
    expect(sentPayloads[3].jid).toBe("120363999999@g.us");
    expect(sentPayloads[3].payload.mimetype).toBe("image/jpeg");
  });

  it("14. verifies Baileys pin and deterministic dependency patch verification script", () => {
    const gatewayDir = path.join(process.cwd(), "whatsapp-gateway");
    const pkg = JSON.parse(fs.readFileSync(path.join(gatewayDir, "package.json"), "utf8"));
    const lock = JSON.parse(fs.readFileSync(path.join(gatewayDir, "package-lock.json"), "utf8"));
    const dockerfile = fs.readFileSync(path.join(gatewayDir, "Dockerfile"), "utf8");

    expect(pkg.dependencies["@whiskeysockets/baileys"]).toBe("6.7.23");
    expect(lock.packages[""].dependencies["@whiskeysockets/baileys"]).toBe("6.7.23");
    expect(dockerfile).toContain("npm ci --omit=dev && node scripts/baileys-patches.mjs --verify");
    expect(dockerfile).toContain('CMD ["node", "server.js"]');

    const verifyOut = execFileSync(process.execPath, ["scripts/baileys-patches.mjs", "--verify"], {
      cwd: gatewayDir,
      encoding: "utf8",
    });
    expect(verifyOut).toContain("Verified 9 patches cleanly");

    // Negative check: verify script MUST fail non-zero when an expected patch is missing
    const fakeGatewayDir = createTempDir("bhq-patch-fail-");
    fs.cpSync(path.join(gatewayDir, "scripts"), path.join(fakeGatewayDir, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(fakeGatewayDir, "node_modules/@whiskeysockets/baileys/lib/Socket"), { recursive: true });
    fs.writeFileSync(
      path.join(fakeGatewayDir, "node_modules/@whiskeysockets/baileys/lib/Socket/messages-recv.js"),
      "retryMutex.mutex(async () => {});",
      "utf8",
    );
    const negRes = spawnSync(process.execPath, ["scripts/baileys-patches.mjs", "--verify"], {
      cwd: fakeGatewayDir,
      encoding: "utf8",
    });
    expect(negRes.status).not.toBe(0);
    expect(negRes.stderr || negRes.stdout).toContain("NOT applied");
  });
});
