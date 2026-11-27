import makeWASocket, * as BaileysPkg from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import pino from "pino";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Mutex } from "async-mutex";
import {
  findStoredGroupsByParticipant,
  flushStoredGroups,
  getStoredGroups,
  markStoredGroupActivity,
  searchStoredGroups,
  storeDiscoveredGroups,
} from "./group-store.js";
import {
  initAccountRegistry,
  getActiveAccountId,
  setActiveAccountId,
  getAllAccounts,
  getAccount,
  registerAccount,
  updateAccount,
  removeAccount,
} from "./account-registry.js";
import {
  CorruptAuthFileError,
  createIdempotencyStore,
  createSafeMultiFileAuthState,
  flushPendingAuthWrites,
  hasRegisteredCredentials,
} from "./safe-store.js";

const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = BaileysPkg;

function optExport(getter, fallback = undefined) {
  try {
    const val = getter();
    return val === undefined ? fallback : val;
  } catch {
    return fallback;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionsRoot = process.env.WHATSAPP_GATEWAY_SESSIONS_DIR || path.join(__dirname, "sessions");

const logger = pino({
  level: "warn",
  redact: {
    paths: [
      "*.privKey",
      "*.pubKey",
      "*.rootKey",
      "*.chainKey",
      "*.ephemeralKeyPair",
      "*.noiseKey",
      "*.signedIdentityKey",
      "*.signedPreKey",
      "*.advSecretKey",
      "*.creds",
      "creds",
      "qr",
      "*.qr",
      "qrCode",
      "*.qrCode",
      "mediaBase64",
      "*.mediaBase64",
      "pdfBase64",
      "*.pdfBase64",
      "headers.x-api-key",
      "headers.authorization",
    ],
    censor: "[REDACTED]",
  },
});

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 60000;
const GROUP_JID_PATTERN = /^[a-z0-9._:-]+@g\.us$/i;

// Initialize Registry on module load
initAccountRegistry(sessionsRoot);

const idempotencyStore = createIdempotencyStore(path.join(sessionsRoot, "sent-idempotency.json"));

/**
 * Bounded in-memory retry counter cache compatible with Baileys CacheStore interface.
 */
function createBoundedRetryCache({ maxEntries = 2000, ttlMs = 15 * 60 * 1000 } = {}) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      if (store.size >= maxEntries && !store.has(key)) {
        const oldestKey = store.keys().next().value;
        store.delete(oldestKey);
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    del(key) {
      store.delete(key);
    },
    flushAll() {
      store.clear();
    },
  };
}

const msgRetryCounterCache = createBoundedRetryCache();
const accountLocks = new Map();
let isShuttingDown = false;

function withAccountLock(accountId, task) {
  let mutex = accountLocks.get(accountId);
  if (!mutex) {
    mutex = new Mutex();
    accountLocks.set(accountId, mutex);
  }
  return mutex.runExclusive(task);
}

/**
 * In-memory Session Manager Map: accountId -> SessionState
 */
const activeSessions = new Map();

function getOrCreateSessionState(accountId) {
  if (!activeSessions.has(accountId)) {
    const registryAccount = getAccount(accountId);
    const initialState = ["PAUSED", "LOGGED_OUT"].includes(registryAccount?.status)
      ? registryAccount.status
      : "DISCONNECTED";
    activeSessions.set(accountId, {
      id: accountId,
      sock: null,
      connectionState: initialState,
      desiredState: initialState,
      connectionGen: 0,
      currentQrDataUrl: null,
      reconnectAttempts: 0,
      reconnectTimer: null,
      phoneNumber: registryAccount?.phoneNumber || null,
      lastConnectedAt: null,
      wasPaired: false,
      lastError: null,
    });
  }
  return activeSessions.get(accountId);
}

function clearSessionReconnectTimer(session) {
  if (session?.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }
}

export function maskPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "Unknown";
  return digits.length > 4 ? `******${digits.slice(-4)}` : "****";
}

function isIgnoredRemoteJid(jid) {
  if (!jid) return false;
  const newsletterFn = optExport(() => BaileysPkg.isJidNewsletter);
  const broadcastFn = optExport(() => BaileysPkg.isJidBroadcast);
  const isNewsletter = typeof newsletterFn === "function"
    ? newsletterFn(jid)
    : String(jid).endsWith("@newsletter");
  const isBroadcast = typeof broadcastFn === "function"
    ? broadcastFn(jid)
    : String(jid).endsWith("@broadcast");
  return Boolean(isNewsletter || isBroadcast);
}

function isAccountPaired(sessionDir, creds, session) {
  return Boolean(
    creds?.registered === true ||
    creds?.me?.id ||
    session?.wasPaired ||
    hasRegisteredCredentials(sessionDir),
  );
}

async function loadSafeAuthState(sessionDir) {
  const initCreds = optExport(() => BaileysPkg.initAuthCreds);
  const bufferJson = optExport(() => BaileysPkg.BufferJSON);
  const waProto = optExport(() => BaileysPkg.proto);
  // Keep unit test mocks of useMultiFileAuthState working while using atomic safe-store at runtime
  if (
    typeof useMultiFileAuthState?.mock !== "undefined" ||
    typeof initCreds !== "function" ||
    !bufferJson ||
    !waProto
  ) {
    return useMultiFileAuthState(sessionDir);
  }
  return createSafeMultiFileAuthState(sessionDir, {
    initAuthCreds: initCreds,
    BufferJSON: bufferJson,
    proto: waProto,
  });
}

async function resolveWhatsAppVersion() {
  const waWebVersionFn = optExport(() => BaileysPkg.fetchLatestWaWebVersion);
  if (typeof waWebVersionFn === "function") {
    try {
      const live = await waWebVersionFn({ timeout: 5000 });
      if (live?.isLatest && Array.isArray(live.version)) {
        return live.version;
      }
    } catch {
      // Fall back cleanly
    }
  }
  const latest = await fetchLatestBaileysVersion({ timeout: 5000 });
  return latest?.version || [2, 3000, 1027934701];
}

export function computeReconnectDelayMs(attempt, statusCode) {
  const restartCode = optExport(() => DisconnectReason?.restartRequired, 515);
  if (statusCode === restartCode && attempt <= 1) {
    return 500;
  }
  const exp = Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1)), MAX_RECONNECT_DELAY_MS);
  const jitterCap = Math.min(1000, Math.floor(exp * 0.25));
  const jitter = Math.floor(Math.random() * Math.max(1, jitterCap));
  return exp + jitter;
}

/**
 * Strictly READ-ONLY connection status check. Never triggers connect or QR generation.
 */
export function getStatus(accountId = null) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);
  const registryAccount = getAccount(targetId);
  const state = session?.connectionState || registryAccount?.status || "DISCONNECTED";

  return {
    accountId: targetId,
    state,
    connected: state === "CONNECTED",
    qrAvailable: Boolean(session?.currentQrDataUrl),
    phoneNumber: session?.phoneNumber || registryAccount?.phoneNumber || null,
    isDefault: targetId === getActiveAccountId(),
    ...(session?.lastError ? { lastError: session.lastError } : {}),
  };
}

/**
 * Returns list of all accounts with combined read-only runtime status.
 */
export function listAllAccountsWithStatus() {
  const registryAccounts = getAllAccounts();
  const activeId = getActiveAccountId();

  return registryAccounts.map((acc) => {
    const session = activeSessions.get(acc.id);
    const state = session ? session.connectionState : acc.status || "DISCONNECTED";
    return {
      id: acc.id,
      label: acc.label,
      ownerUserId: acc.ownerUserId || null,
      organizationId: acc.organizationId || null,
      ownerName: acc.ownerName || null,
      phoneNumber: session?.phoneNumber || acc.phoneNumber || null,
      state,
      connected: state === "CONNECTED",
      qrAvailable: Boolean(session?.currentQrDataUrl),
      isDefault: acc.id === activeId,
      createdAt: acc.createdAt,
      lastSeenAt: acc.lastSeenAt,
    };
  });
}

/**
 * Strictly READ-ONLY QR code accessor. Never initiates connections.
 */
export function getQrCode(accountId = null) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);
  return session?.currentQrDataUrl || null;
}

/**
 * Returns Baileys socket for a specific account or default active account.
 */
export function getSocket(accountId = null) {
  const targetId = accountId || getActiveAccountId();
  return activeSessions.get(targetId)?.sock || null;
}

function closeSocketSafely(sock, targetId) {
  if (!sock) return;
  try {
    sock.end(undefined);
  } catch (err) {
    console.warn(`[Baileys][${targetId}] Error closing socket:`, err.message);
  }
}

/**
 * Starts or re-initializes Baileys WhatsApp connection for a specific account.
 * Serialized per-account with connection generation guards to eliminate duplicate sockets.
 */
export async function startConnection(accountId = null, options = {}) {
  const targetId = accountId || getActiveAccountId();
  const { trigger = "manual", expectedGen = null } = options || {};
  const session = getOrCreateSessionState(targetId);
  const sessionDir = path.join(sessionsRoot, targetId);

  if (isShuttingDown) {
    if (trigger === "manual") throw new Error("Gateway is shutting down");
    return null;
  }

  return withAccountLock(targetId, async () => {
    if (isShuttingDown) {
      if (trigger === "manual") throw new Error("Gateway is shutting down");
      return null;
    }

    const registryAccount = getAccount(targetId);

    // Reconnect timer must strictly match the generation that scheduled it
    if (trigger === "reconnect") {
      if (expectedGen !== null && expectedGen !== session.connectionGen) {
        return session.sock;
      }
      if (["PAUSED", "LOGGED_OUT"].includes(session.desiredState) || ["PAUSED", "LOGGED_OUT"].includes(session.connectionState)) {
        return null;
      }
    }

    // Startup skips LOGGED_OUT, PAUSED, and unpaired accounts
    if (trigger === "startup") {
      if (registryAccount?.status === "LOGGED_OUT") {
        session.connectionState = "LOGGED_OUT";
        session.desiredState = "LOGGED_OUT";
        return null;
      }
      if (registryAccount?.status === "PAUSED") {
        session.connectionState = "PAUSED";
        session.desiredState = "PAUSED";
        return null;
      }
      if (!hasRegisteredCredentials(sessionDir)) {
        session.connectionState = "DISCONNECTED";
        session.desiredState = "DISCONNECTED";
        return null;
      }
    }

    // Prevent duplicate concurrent connects
    if (["CONNECTING", "CONNECTED", "QR_READY"].includes(session.connectionState)) {
      return session.sock;
    }

    // Never auto-reconnect paused, logged-out, or actively backing-off accounts unless manually triggered
    if (trigger !== "manual" && trigger !== "reconnect" && ["RECONNECTING", "PAUSED", "LOGGED_OUT"].includes(session.connectionState)) {
      return session.sock;
    }

    if (trigger === "manual") {
      session.reconnectAttempts = 0;
    }

    clearSessionReconnectTimer(session);
    const gen = ++session.connectionGen;
    session.desiredState = "CONNECTED";
    session.connectionState = "CONNECTING";
    session.currentQrDataUrl = null;
    session.lastError = null;

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    try {
      const { state, saveCreds } = await loadSafeAuthState(sessionDir);

      // Re-check generation/intent after async I/O (pause/logout/shutdown might have intervened)
      if (isShuttingDown || gen !== session.connectionGen || ["PAUSED", "LOGGED_OUT"].includes(session.desiredState)) {
        if (isShuttingDown) session.connectionState = "DISCONNECTED";
        return null;
      }

      const pairedAtStart = isAccountPaired(sessionDir, state?.creds, session);
      if (trigger !== "manual" && !pairedAtStart) {
        session.connectionState = "DISCONNECTED";
        session.desiredState = "DISCONNECTED";
        return null;
      }

      const version = await resolveWhatsAppVersion();

      if (isShuttingDown || gen !== session.connectionGen || ["PAUSED", "LOGGED_OUT"].includes(session.desiredState)) {
        if (isShuttingDown) session.connectionState = "DISCONNECTED";
        return null;
      }

      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        generateHighQualityLinkPreview: false,
        browser: ["InsureDesk CRM", "Chrome", "133.0.0.0"],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        msgRetryCounterCache,
        shouldIgnoreJid: isIgnoredRemoteJid,
      });

      if (isShuttingDown || gen !== session.connectionGen || ["PAUSED", "LOGGED_OUT"].includes(session.desiredState)) {
        closeSocketSafely(sock, targetId);
        return null;
      }

      session.sock = sock;

      // Guard WebSocket errors so detached/closing WS events never raise uncaught Error events
      sock.ws?.on?.("error", (wsErr) => {
        if (gen !== session.connectionGen) return;
        console.warn(`[Baileys][${targetId}] WebSocket notice:`, wsErr?.message || "socket error");
      });

      // ---- Connection Update Handler ----
      sock.ev.on("connection.update", async (update) => {
        if (gen !== session.connectionGen || session.sock !== sock || session.desiredState === "PAUSED" || session.desiredState === "LOGGED_OUT") {
          return;
        }
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          if (trigger !== "manual" && !isAccountPaired(sessionDir, state?.creds, session)) {
            console.warn(`[Baileys][${targetId}] Suppressing unsolicited QR generation on background connect.`);
            closeSocketSafely(sock, targetId);
            return;
          }
          try {
            const qrUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
            if (gen !== session.connectionGen || session.sock !== sock || session.desiredState === "PAUSED") return;
            session.currentQrDataUrl = qrUrl;
            session.connectionState = "QR_READY";
            console.log(`[Baileys][${targetId}] QR code ready for user pairing scan.`);
          } catch (err) {
            console.error(`[Baileys][${targetId}] Failed to render QR image:`, err?.message || err);
          }
        }

        if (connection === "close") {
          session.currentQrDataUrl = null;
          session.sock = null;

          if (isShuttingDown) {
            session.connectionState = "DISCONNECTED";
            return;
          }

          const statusCode =
            (lastDisconnect?.error instanceof Boom
              ? lastDisconnect.error.output?.statusCode
              : lastDisconnect?.error?.output?.statusCode) ?? 500;

          const isLoggedOut = statusCode === optExport(() => DisconnectReason?.loggedOut, 401);
          const restartRequiredCode = optExport(() => DisconnectReason?.restartRequired, 515);
          const currentlyPaired = isAccountPaired(sessionDir, state?.creds, session) || statusCode === restartRequiredCode;

          console.log(
            `[Baileys][${targetId}] Connection closed. Status: ${statusCode}. LoggedOut: ${isLoggedOut}. Paired: ${currentlyPaired}`,
          );

          if (isLoggedOut) {
            clearSessionReconnectTimer(session);
            session.connectionState = "LOGGED_OUT";
            session.desiredState = "LOGGED_OUT";
            session.reconnectAttempts = 0;
            updateAccount(targetId, { status: "LOGGED_OUT" });
            console.log(`[Baileys][${targetId}] Logged out by WhatsApp server; automatic reconnect disabled.`);
            return;
          }

          if (!currentlyPaired) {
            clearSessionReconnectTimer(session);
            session.connectionState = "DISCONNECTED";
            session.desiredState = "DISCONNECTED";
            session.reconnectAttempts = 0;
            updateAccount(targetId, { status: "DISCONNECTED" });
            console.log(`[Baileys][${targetId}] Pairing timed out or closed on unpaired account; awaiting explicit Scan QR.`);
            return;
          }

          if (session.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            session.reconnectAttempts += 1;
            const delayMs = computeReconnectDelayMs(session.reconnectAttempts, statusCode);
            clearSessionReconnectTimer(session);
            const timerGen = session.connectionGen;
            session.connectionState = "RECONNECTING";
            console.log(
              `[Baileys][${targetId}] Reconnecting in ${delayMs}ms (attempt ${session.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
            );
            session.reconnectTimer = setTimeout(() => {
              session.reconnectTimer = null;
              startConnection(targetId, { trigger: "reconnect", expectedGen: timerGen }).catch((error) => {
                console.error(`[Baileys][${targetId}] Reconnect failed:`, error?.message || error);
              });
            }, delayMs);
          } else {
            clearSessionReconnectTimer(session);
            session.connectionState = "DISCONNECTED";
            updateAccount(targetId, { status: "DISCONNECTED" });
            console.error(`[Baileys][${targetId}] Max reconnection attempts reached. Manual retry required.`);
          }
        }

        if (connection === "open") {
          clearSessionReconnectTimer(session);
          session.connectionState = "CONNECTED";
          session.desiredState = "CONNECTED";
          session.wasPaired = true;
          session.currentQrDataUrl = null;
          session.reconnectAttempts = 0;
          session.lastConnectedAt = new Date().toISOString();
          session.lastError = null;

          const rawUser = sock.user?.id || "";
          const phoneDigits = rawUser.split(":")[0].replace(/\D/g, "");
          session.phoneNumber = phoneDigits || null;

          updateAccount(targetId, {
            status: "CONNECTED",
            phoneNumber: session.phoneNumber,
          });

          console.log(
            `[Baileys][${targetId}] Connected successfully! Phone: ${maskPhoneNumber(session.phoneNumber)}`,
          );

          refreshGroups(targetId).catch((error) => {
            console.error(`[Groups][${targetId}] Automatic discovery failed:`, error?.message || error);
          });
        }
      });

      // ---- Credential Persistence (never emit unhandled rejection) ----
      sock.ev.on("creds.update", () => {
        Promise.resolve(saveCreds()).catch((err) => {
          console.error(`[SafeAuth][${targetId}] Failed to persist creds update:`, err?.message || err);
        });
      });

      // Group activity tracking
      sock.ev.on("messages.upsert", ({ messages }) => {
        for (const message of messages || []) {
          const groupId = message?.key?.remoteJid;
          if (groupId?.endsWith("@g.us")) {
            const timestamp = Number(message.messageTimestamp || 0);
            markStoredGroupActivity(
              groupId,
              timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
            );
          }
        }
      });

      return sock;
    } catch (error) {
      session.sock = null;
      if (session.desiredState !== "PAUSED" && session.desiredState !== "LOGGED_OUT") {
        session.connectionState = "DISCONNECTED";
        session.lastError = error instanceof CorruptAuthFileError ? error.message : error?.message || "Connection failed";
        updateAccount(targetId, { status: "DISCONNECTED" });
      }
      throw error;
    }
  });
}

/**
 * Lifecycle 1: Pause / Disconnect
 * Closes active socket without deleting session files.
 */
export async function pauseSession(accountId) {
  const targetId = accountId || getActiveAccountId();
  const session = getOrCreateSessionState(targetId);

  // Immediately invalidate in-flight connects/timers before awaiting lock
  session.desiredState = "PAUSED";
  session.connectionGen += 1;
  clearSessionReconnectTimer(session);

  return withAccountLock(targetId, async () => {
    clearSessionReconnectTimer(session);
    session.desiredState = "PAUSED";
    const activeSock = session.sock;
    session.sock = null;
    session.connectionState = "PAUSED";
    session.currentQrDataUrl = null;
    session.reconnectAttempts = 0;

    closeSocketSafely(activeSock, targetId);
    updateAccount(targetId, { status: "PAUSED" });
    console.log(`[Baileys][${targetId}] Session paused (auth credentials preserved on disk).`);
    return { success: true, message: `Account '${targetId}' disconnected.` };
  });
}

/**
 * Lifecycle 2: Logout from WhatsApp
 * Performs WhatsApp server logout handshake and marks LOGGED_OUT.
 */
export async function logoutSession(accountId) {
  const targetId = accountId || getActiveAccountId();
  const session = getOrCreateSessionState(targetId);

  session.desiredState = "LOGGED_OUT";
  session.connectionGen += 1;
  clearSessionReconnectTimer(session);

  return withAccountLock(targetId, async () => {
    clearSessionReconnectTimer(session);
    session.desiredState = "LOGGED_OUT";
    const activeSock = session.sock;
    session.sock = null;
    session.connectionState = "LOGGED_OUT";
    session.currentQrDataUrl = null;
    session.reconnectAttempts = 0;
    session.phoneNumber = null;
    session.wasPaired = false;

    if (activeSock) {
      try {
        await activeSock.logout();
      } catch (err) {
        console.warn(`[Baileys][${targetId}] Error during WhatsApp logout:`, err?.message || err);
        closeSocketSafely(activeSock, targetId);
      }
    }

    const sessionDir = path.join(sessionsRoot, targetId);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[Baileys][${targetId}] Auth credentials cleared from disk.`);
    } catch (err) {
      console.warn(`[Baileys][${targetId}] Could not clear directory:`, err?.message || err);
    }

    updateAccount(targetId, { status: "LOGGED_OUT", phoneNumber: null });
    return { success: true, message: `Account '${targetId}' logged out successfully.` };
  });
}

/**
 * Lifecycle 3: Permanently Delete Account
 */
export async function deleteAccountSession(accountId) {
  const targetId = accountId;
  if (!targetId) throw new Error("Account ID is required to delete an account.");

  await logoutSession(targetId);

  return withAccountLock(targetId, async () => {
    activeSessions.delete(targetId);
    removeAccount(targetId);
    console.log(`[Baileys][${targetId}] Account permanently deleted.`);
    return { success: true, message: `Account '${targetId}' deleted.` };
  });
}

export function setPrimaryAccount(accountId) {
  return setActiveAccountId(accountId);
}

/**
 * Register a new account and explicitly initiate QR pairing.
 */
export async function createNewAccount(label, owner) {
  const id = `account_${Date.now()}`;
  const account = registerAccount(id, label, owner);
  startConnection(id, { trigger: "manual" }).catch((err) => {
    console.error(`[Baileys][${id}] Initial pairing connection failed:`, err?.message || err);
  });
  return account;
}

/**
 * Auto-start ONLY registered & previously paired (non-PAUSED, non-LOGGED_OUT) accounts.
 * Isolates failures so one damaged account never blocks others.
 */
export async function startAllAccounts() {
  const accounts = getAllAccounts();
  console.log(`[Baileys] Inspecting ${accounts.length} registered WhatsApp account(s) on startup...`);
  for (const acc of accounts) {
    try {
      const sessionDir = path.join(sessionsRoot, acc.id);
      if (acc.status === "LOGGED_OUT" || acc.status === "PAUSED") {
        getOrCreateSessionState(acc.id);
        console.log(`[Baileys][${acc.id}] Skipping auto-start (status=${acc.status}).`);
        continue;
      }
      if (!hasRegisteredCredentials(sessionDir)) {
        const s = getOrCreateSessionState(acc.id);
        s.connectionState = "DISCONNECTED";
        s.desiredState = "DISCONNECTED";
        console.log(`[Baileys][${acc.id}] Skipping auto-start (unpaired/no registered creds).`);
        continue;
      }
      await startConnection(acc.id, { trigger: "startup" });
    } catch (err) {
      console.error(`[Baileys][${acc.id}] Failed to auto-start safely:`, err?.message || err);
    }
  }
}

/**
 * Gracefully close all active WebSockets without logging out accounts,
 * clear timers, and flush pending auth + group-store + idempotency writes.
 */
export async function shutdownAllSessions() {
  isShuttingDown = true;

  for (const [accountId, session] of activeSessions.entries()) {
    session.connectionGen += 1;
    clearSessionReconnectTimer(session);
    const activeSock = session.sock;
    session.sock = null;
    if (activeSock) {
      closeSocketSafely(activeSock, accountId);
    }
  }

  await flushPendingAuthWrites();
  await idempotencyStore.flush();
  flushStoredGroups();
}

export function setShuttingDownForTests(value) {
  isShuttingDown = Boolean(value);
}

// ── Sending Messages ────────────────────────────────────────────────

export function formatRecipientToJid(recipient) {
  if (!recipient) return "";
  const raw = recipient.toString().trim();
  if (GROUP_JID_PATTERN.test(raw)) return raw.toLowerCase();
  if (raw.toLowerCase().endsWith("@g.us")) throw new Error("Invalid WhatsApp group ID");

  let cleaned = raw.replace(/@(c\.us|s\.whatsapp\.net)$/i, "").replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  return cleaned + "@s.whatsapp.net";
}

export const formatPhoneToJid = formatRecipientToJid;

export function normalizeIndianPhone(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/@lid$/i.test(raw)) return "";
  let digits = raw.replace(/@(c\.us|s\.whatsapp\.net)$/i, "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

function publicGroup(group) {
  return {
    id: group.groupId,
    name: group.groupName,
    participants: group.participantCount,
    creationTime: group.creationTime,
    lastSyncedAt: group.lastSyncedAt,
    lastActivity: group.lastActivity || null,
  };
}

export function listGroups({ search = "", limit, accountId = null } = {}) {
  const groups = search ? searchStoredGroups(search, limit, accountId) : getStoredGroups({ accountId });
  return groups.map(publicGroup);
}

export function matchGroupsByPhone(phone, accountId = null) {
  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) return { phone: "", groups: [] };
  return {
    phone: normalizedPhone,
    groups: findStoredGroupsByParticipant(normalizedPhone, accountId).map(publicGroup),
  };
}

function normalizeGroupParticipants(participants) {
  const normalized = new Map();
  for (const participant of participants || []) {
    const jid = participant?.jid || participant?.id || "";
    const phone = normalizeIndianPhone(participant?.jid) || normalizeIndianPhone(participant?.id);
    const key = phone || jid;
    if (!key) continue;
    normalized.set(key, {
      phone,
      jid,
      name: participant?.name || participant?.notify || participant?.verifiedName || "",
    });
  }
  return [...normalized.values()];
}

const groupRefreshPromises = new Map();

export async function refreshGroups(accountId = null) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);

  if (groupRefreshPromises.has(targetId)) return groupRefreshPromises.get(targetId);
  if (!session?.sock || session.connectionState !== "CONNECTED") {
    throw new Error(`WhatsApp account '${targetId}' is not connected; groups cannot be refreshed`);
  }

  const promise = (async () => {
    const participating = await session.sock.groupFetchAllParticipating();
    const groups = Object.values(participating || {}).map((group) => ({
      groupId: group.id,
      groupName: group.subject || "Unnamed WhatsApp Group",
      participantCount: Array.isArray(group.participants) ? group.participants.length : 0,
      groupParticipants: normalizeGroupParticipants(group.participants),
      creationTime: group.creation ? new Date(Number(group.creation) * 1000).toISOString() : null,
    }));
    storeDiscoveredGroups(groups, targetId);
    console.log(`[Groups][${targetId}] Synced ${groups.length} participating group(s).`);
    return listGroups({ accountId: targetId });
  })().finally(() => {
    groupRefreshPromises.delete(targetId);
  });

  groupRefreshPromises.set(targetId, promise);
  return promise;
}

function assertAvailableGroup(jid, accountId) {
  if (!jid.endsWith("@g.us")) return;
  if (!getStoredGroups({ accountId }).some((group) => group.groupId === jid)) {
    throw new Error("WhatsApp group is no longer available. Refresh the group list and try again.");
  }
}

function formatSendError(error, jid) {
  if (!jid.endsWith("@g.us")) return error;
  const message = String(error?.message || "");
  if (/not.?authorized|forbidden|not.?found|item-not-found|participant/i.test(message)) {
    return new Error(
      "Unable to send to this WhatsApp group. It may have been deleted or this account may have been removed.",
    );
  }
  return error;
}

export function getSentIdempotencyStatus(idempotencyKey) {
  return idempotencyStore.get(idempotencyKey);
}

/**
 * Sends a text message strictly via the specified account (or default active account).
 * Uses persistent idempotency key when provided to prevent duplicates across retries/timeouts.
 */
export async function sendText(to, content, accountId = null, idempotencyKey = null) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);

  if (!session?.sock || session.connectionState !== "CONNECTED") {
    throw new Error(`WhatsApp account '${targetId}' is not connected`);
  }

  const jid = formatRecipientToJid(to);
  if (!jid) throw new Error("A valid WhatsApp recipient is required");
  assertAvailableGroup(jid, targetId);

  return idempotencyStore.run(idempotencyKey, async () => {
    let result;
    try {
      result = await session.sock.sendMessage(jid, { text: content });
    } catch (error) {
      throw formatSendError(error, jid);
    }

    return {
      success: true,
      id: result?.key?.id || null,
      timestamp: result?.messageTimestamp || null,
      accountId: targetId,
    };
  });
}

/**
 * Sends a media message strictly via the specified account (or default active account).
 * Uses persistent idempotency key when provided to prevent duplicates across retries/timeouts.
 */
export async function sendMedia(to, mediaBase64, filename, caption, type, accountId = null, idempotencyKey = null) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);

  if (!session?.sock || session.connectionState !== "CONNECTED") {
    throw new Error(`WhatsApp account '${targetId}' is not connected`);
  }

  const jid = formatRecipientToJid(to);
  if (!jid) throw new Error("A valid WhatsApp recipient is required");
  assertAvailableGroup(jid, targetId);

  let buffer;
  if (Buffer.isBuffer(mediaBase64)) {
    buffer = mediaBase64;
  } else if (typeof mediaBase64 === "string") {
    let raw = mediaBase64.trim();
    if (raw.includes(",")) raw = raw.split(",")[1];
    buffer = Buffer.from(raw, "base64");
  } else {
    throw new Error("Invalid media payload: expected base64 string or buffer");
  }

  const isDocument =
    type === "document" ||
    String(filename || "")
      .toLowerCase()
      .endsWith(".pdf");

  let messagePayload;
  if (!isDocument && (type === "image" || String(filename || "").match(/\.(jpe?g|png|webp)$/i))) {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    messagePayload = {
      image: buffer,
      caption: caption || "",
      mimetype: isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/jpeg",
      fileName: filename || (isJpeg ? "birthday_card.jpg" : "birthday_card.png"),
    };
  } else {
    messagePayload = {
      document: buffer,
      mimetype: getMimeType(filename),
      fileName: filename || "document.pdf",
      caption: caption || "",
    };
  }

  return idempotencyStore.run(idempotencyKey, async () => {
    let result;
    try {
      result = await session.sock.sendMessage(jid, messagePayload);
    } catch (error) {
      throw formatSendError(error, jid);
    }

    return {
      success: true,
      id: result?.key?.id || null,
      timestamp: result?.messageTimestamp || null,
      accountId: targetId,
    };
  });
}

function getMimeType(filename) {
  if (!filename) return "application/octet-stream";
  const ext = filename.split(".").pop().toLowerCase();
  const mimeMap = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    txt: "text/plain",
  };
  return mimeMap[ext] || "application/octet-stream";
}

/**
 * Diagnostics & Benchmarks
 */
export function getGatewayMetrics() {
  const mem = process.memoryUsage();
  const accounts = getAllAccounts();
  const connectedCount = accounts.filter(
    (acc) => activeSessions.get(acc.id)?.connectionState === "CONNECTED",
  ).length;

  return {
    memory: {
      rssMb: (mem.rss / 1024 / 1024).toFixed(2),
      heapTotalMb: (mem.heapTotal / 1024 / 1024).toFixed(2),
      heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      externalMb: (mem.external / 1024 / 1024).toFixed(2),
    },
    accountsTotal: accounts.length,
    accountsConnected: connectedCount,
    activeSenderId: getActiveAccountId(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

// Backward-compatible alias
export const logout = logoutSession;
