import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import pino from "pino";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  clearStoredGroups,
  findStoredGroupsByParticipant,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionsRoot =
  process.env.WHATSAPP_GATEWAY_SESSIONS_DIR || path.join(__dirname, "sessions");

const logger = pino({ level: "warn" });
const MAX_RECONNECT_ATTEMPTS = 10;
const GROUP_JID_PATTERN = /^[a-z0-9._:-]+@g\.us$/i;

// Initialize Registry on module load
initAccountRegistry(sessionsRoot);

/**
 * In-memory Session Manager Map: accountId -> SessionState
 * {
 *   id: string,
 *   sock: WASocket | null,
 *   connectionState: "DISCONNECTED" | "CONNECTING" | "QR_READY" | "CONNECTED" | "PAUSED",
 *   currentQrDataUrl: string | null,
 *   reconnectAttempts: number,
 *   reconnectTimer: any,
 *   phoneNumber: string | null,
 *   lastConnectedAt: string | null,
 * }
 */
const activeSessions = new Map();

function getOrCreateSessionState(accountId) {
  if (!activeSessions.has(accountId)) {
    activeSessions.set(accountId, {
      id: accountId,
      sock: null,
      connectionState: "DISCONNECTED",
      currentQrDataUrl: null,
      reconnectAttempts: 0,
      reconnectTimer: null,
      phoneNumber: null,
      lastConnectedAt: null,
    });
  }
  return activeSessions.get(accountId);
}

/**
 * Returns connection status for a specific account or the default active account.
 */
export function getStatus(accountId = null) {
  const targetId = accountId || getActiveAccountId();
  const session = getOrCreateSessionState(targetId);

  // Auto-connect if completely disconnected and not explicitly paused
  if (session.connectionState === "DISCONNECTED") {
    console.log(`[Baileys][${targetId}] Auto-starting connection from getStatus()...`);
    startConnection(targetId).catch((err) => {
      console.error(`[Baileys][${targetId}] Auto-start failed:`, err);
    });
  }

  return {
    accountId: targetId,
    state: session.connectionState,
    connected: session.connectionState === "CONNECTED",
    qrAvailable: !!session.currentQrDataUrl,
    phoneNumber: session.phoneNumber,
    isDefault: targetId === getActiveAccountId(),
  };
}

/**
 * Returns list of all accounts with combined runtime status.
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
      phoneNumber: session?.phoneNumber || acc.phoneNumber || null,
      state,
      connected: state === "CONNECTED",
      qrAvailable: !!session?.currentQrDataUrl,
      isDefault: acc.id === activeId,
      createdAt: acc.createdAt,
      lastSeenAt: acc.lastSeenAt,
    };
  });
}

/**
 * Returns QR code data URL for a specific account or default active account.
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

/**
 * Starts or re-initializes Baileys WhatsApp connection for a specific account.
 */
export async function startConnection(accountId = null) {
  const targetId = accountId || getActiveAccountId();
  const session = getOrCreateSessionState(targetId);

  // Prevent duplicate concurrent connects
  if (session.connectionState === "CONNECTING" || session.connectionState === "CONNECTED") {
    return session.sock;
  }

  // Clear any existing reconnect timer
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }

  session.connectionState = "CONNECTING";
  session.currentQrDataUrl = null;

  const sessionDir = path.join(sessionsRoot, targetId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

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
  });

  session.sock = sock;

  // ---- Connection Update Handler ----
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        session.currentQrDataUrl = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
        });
        session.connectionState = "QR_READY";
        console.log(`[Baileys][${targetId}] QR code generated. Waiting for scan...`);
      } catch (err) {
        console.error(`[Baileys][${targetId}] Failed to generate QR:`, err);
      }
    }

    if (connection === "close") {
      session.currentQrDataUrl = null;

      const statusCode =
        (lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : lastDisconnect?.error?.output?.statusCode) ?? 500;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[Baileys][${targetId}] Connection closed. Status: ${statusCode}. LoggedOut: ${!shouldReconnect}`
      );

      if (shouldReconnect && session.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        session.reconnectAttempts++;
        const delay = Math.min(session.reconnectAttempts * 2000, 30000);
        console.log(
          `[Baileys][${targetId}] Reconnecting in ${delay}ms (attempt ${session.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
        );
        session.connectionState = "CONNECTING";
        session.reconnectTimer = setTimeout(() => startConnection(targetId), delay);
      } else {
        session.connectionState = "DISCONNECTED";
        session.sock = null;
        updateAccount(targetId, { status: "DISCONNECTED" });

        if (!shouldReconnect) {
          console.log(`[Baileys][${targetId}] Logged out by WhatsApp server.`);
          updateAccount(targetId, { status: "LOGGED_OUT" });
        } else {
          console.error(
            `[Baileys][${targetId}] Max reconnection attempts reached. Manual retry required.`
          );
        }
      }
    }

    if (connection === "open") {
      session.connectionState = "CONNECTED";
      session.currentQrDataUrl = null;
      session.reconnectAttempts = 0;
      session.lastConnectedAt = new Date().toISOString();

      // Extract verified phone number from socket user
      const rawUser = sock.user?.id || "";
      const phoneDigits = rawUser.split(":")[0].replace(/\D/g, "");
      session.phoneNumber = phoneDigits || null;

      updateAccount(targetId, {
        status: "CONNECTED",
        phoneNumber: session.phoneNumber,
      });

      console.log(`[Baileys][${targetId}] ✅ Connected successfully! Phone: ${session.phoneNumber || "Unknown"}`);

      // Auto-refresh participating groups for this account
      refreshGroups(targetId).catch((error) => {
        console.error(`[Groups][${targetId}] Automatic discovery failed:`, error.message);
      });
      refreshGroups().catch(() => {});
    }
  });

  // ---- Credential Persistence ----
  sock.ev.on("creds.update", saveCreds);

  // Group activity tracking
  sock.ev.on("messages.upsert", ({ messages }) => {
    for (const message of messages || []) {
      const groupId = message?.key?.remoteJid;
      if (groupId?.endsWith("@g.us")) {
        const timestamp = Number(message.messageTimestamp || 0);
        markStoredGroupActivity(
          groupId,
          timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString()
        );
      }
    }
  });

  return sock;
}

/**
 * Lifecycle 1: Pause / Disconnect
 * Closes the active socket without deleting session files.
 */
export async function pauseSession(accountId) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);

  if (session?.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }

  if (session?.sock) {
    try {
      session.sock.end(undefined);
    } catch (err) {
      console.warn(`[Baileys][${targetId}] Error closing socket:`, err.message);
    }
    session.sock = null;
  }

  if (session) {
    session.connectionState = "PAUSED";
    session.currentQrDataUrl = null;
    session.reconnectAttempts = 0;
  }

  updateAccount(targetId, { status: "PAUSED" });
  console.log(`[Baileys][${targetId}] Session paused (auth credentials preserved on disk).`);
  return { success: true, message: `Account '${targetId}' disconnected.` };
}

/**
 * Lifecycle 2: Logout from WhatsApp
 * Performs WhatsApp server logout handshake and marks LOGGED_OUT.
 */
export async function logoutSession(accountId) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);

  if (session?.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }

  if (session?.sock) {
    try {
      await session.sock.logout();
    } catch (err) {
      console.warn(`[Baileys][${targetId}] Error during WhatsApp logout:`, err.message);
    }
    session.sock = null;
  }

  if (session) {
    session.connectionState = "DISCONNECTED";
    session.currentQrDataUrl = null;
    session.reconnectAttempts = 0;
    session.phoneNumber = null;
  }

  // Clear session folder
  const sessionDir = path.join(sessionsRoot, targetId);
  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    console.log(`[Baileys][${targetId}] Auth credentials cleared from disk.`);
  } catch (err) {
    console.warn(`[Baileys][${targetId}] Could not clear directory:`, err.message);
  }

  updateAccount(targetId, { status: "LOGGED_OUT", phoneNumber: null });
  return { success: true, message: `Account '${targetId}' logged out successfully.` };
}

/**
 * Lifecycle 3: Permanently Delete Account
 * Requires removing from registry and deleting all data.
 */
export async function deleteAccountSession(accountId) {
  const targetId = accountId;
  if (!targetId) throw new Error("Account ID is required to delete an account.");

  // First logout socket cleanly
  await logoutSession(targetId);

  // Remove from in-memory active sessions
  activeSessions.delete(targetId);

  // Remove from persistent registry
  removeAccount(targetId);
  console.log(`[Baileys][${targetId}] Account permanently deleted.`);
  return { success: true, message: `Account '${targetId}' deleted.` };
}

/**
 * Set active primary sender
 */
export function setPrimaryAccount(accountId) {
  return setActiveAccountId(accountId);
}

/**
 * Register a new account and begin connection to generate QR
 */
export async function createNewAccount(label) {
  const id = `account_${Date.now()}`;
  const account = registerAccount(id, label);
  startConnection(id).catch((err) => {
    console.error(`[Baileys][${id}] Initial connection failed:`, err);
  });
  return account;
}

/**
 * Auto-start all registered accounts on gateway launch
 */
export async function startAllAccounts() {
  const accounts = getAllAccounts();
  console.log(`[Baileys] Auto-starting ${accounts.length} registered WhatsApp accounts...`);
  for (const acc of accounts) {
    try {
      await startConnection(acc.id);
    } catch (err) {
      console.error(`[Baileys][${acc.id}] Failed to auto-start:`, err.message);
    }
  }
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

export function listGroups({ search = "", limit } = {}) {
  const groups = search ? searchStoredGroups(search, limit) : getStoredGroups();
  return groups.map(publicGroup);
}

export function matchGroupsByPhone(phone) {
  const normalizedPhone = normalizeIndianPhone(phone);
  if (!normalizedPhone) return { phone: "", groups: [] };
  return {
    phone: normalizedPhone,
    groups: findStoredGroupsByParticipant(normalizedPhone).map(publicGroup),
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

let groupRefreshPromise = null;

export async function refreshGroups(accountId = null) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);

  if (groupRefreshPromise) return groupRefreshPromise;
  if (!session?.sock || session.connectionState !== "CONNECTED") {
    throw new Error(`WhatsApp account '${targetId}' is not connected; groups cannot be refreshed`);
  }

  groupRefreshPromise = (async () => {
    const participating = await session.sock.groupFetchAllParticipating();
    const groups = Object.values(participating || {}).map((group) => ({
      groupId: group.id,
      groupName: group.subject || "Unnamed WhatsApp Group",
      participantCount: Array.isArray(group.participants) ? group.participants.length : 0,
      groupParticipants: normalizeGroupParticipants(group.participants),
      creationTime: group.creation ? new Date(Number(group.creation) * 1000).toISOString() : null,
    }));
    const phoneSessionId = session.sock.user?.id ? String(session.sock.user.id).split(":")[0] : targetId;
    storeDiscoveredGroups(groups, phoneSessionId);
    console.log(`[Groups][${targetId}] Synced ${groups.length} participating group(s).`);
    return listGroups();
  })().finally(() => {
    groupRefreshPromise = null;
  });

  return groupRefreshPromise;
}

function assertAvailableGroup(jid) {
  if (!jid.endsWith("@g.us")) return;
  if (!getStoredGroups().some((group) => group.groupId === jid)) {
    throw new Error("WhatsApp group is no longer available. Refresh the group list and try again.");
  }
}

function formatSendError(error, jid) {
  if (!jid.endsWith("@g.us")) return error;
  const message = String(error?.message || "");
  if (/not.?authorized|forbidden|not.?found|item-not-found|participant/i.test(message)) {
    return new Error("Unable to send to this WhatsApp group. It may have been deleted or this account may have been removed.");
  }
  return error;
}

/**
 * Sends a text message strictly via the specified account (or default active account).
 * NO automatic switching to another account on failure.
 */
export async function sendText(to, content, accountId = null) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);

  if (!session?.sock || session.connectionState !== "CONNECTED") {
    throw new Error(`WhatsApp account '${targetId}' is not connected`);
  }

  const jid = formatRecipientToJid(to);
  if (!jid) throw new Error("A valid WhatsApp recipient is required");
  assertAvailableGroup(jid);

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
}

/**
 * Sends a media message strictly via the specified account (or default active account).
 * NO automatic switching to another account on failure.
 */
export async function sendMedia(to, mediaBase64, filename, caption, type, accountId = null) {
  const targetId = accountId || getActiveAccountId();
  const session = activeSessions.get(targetId);

  if (!session?.sock || session.connectionState !== "CONNECTED") {
    throw new Error(`WhatsApp account '${targetId}' is not connected`);
  }

  const jid = formatRecipientToJid(to);
  if (!jid) throw new Error("A valid WhatsApp recipient is required");
  assertAvailableGroup(jid);

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

  const isDocument = type === "document" || String(filename || "").toLowerCase().endsWith(".pdf");

  let messagePayload;
  if (!isDocument && (type === "image" || String(filename || "").match(/\.(jpe?g|png|webp)$/i))) {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    messagePayload = {
      image: buffer,
      caption: caption || "",
      mimetype: isJpeg ? "image/jpeg" : (isPng ? "image/png" : "image/jpeg"),
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
    (acc) => activeSessions.get(acc.id)?.connectionState === "CONNECTED"
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
