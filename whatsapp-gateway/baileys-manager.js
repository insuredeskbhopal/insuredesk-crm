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
import { fileURLToPath } from "url";
import {
  clearStoredGroups,
  findStoredGroupsByParticipant,
  getStoredGroups,
  markStoredGroupActivity,
  searchStoredGroups,
  storeDiscoveredGroups,
} from "./group-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionsRoot =
  process.env.WHATSAPP_GATEWAY_SESSIONS_DIR || path.join(__dirname, "sessions");
const SESSIONS_DIR = path.join(sessionsRoot, "insuredesk_session");

const logger = pino({ level: "warn" });

// Singleton state
let sock = null;
let connectionState = "DISCONNECTED"; // DISCONNECTED | CONNECTING | QR_READY | CONNECTED
let currentQrDataUrl = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const GROUP_JID_PATTERN = /^[0-9-]+@g\.us$/i;
let groupRefreshPromise = null;

/**
 * Returns the current connection state and QR code (if available).
 */
export function getStatus() {
  if (connectionState === "DISCONNECTED") {
    console.log("[Baileys] Auto-starting connection from getStatus()...");
    startConnection().catch((err) => {
      console.error("[Baileys] Auto-start connection failed:", err);
    });
  }
  return {
    state: connectionState,
    connected: connectionState === "CONNECTED",
    qrAvailable: !!currentQrDataUrl,
  };
}

/**
 * Returns the current QR code as a base64 DataURL, or null.
 */
export function getQrCode() {
  return currentQrDataUrl;
}

/**
 * Returns the active Baileys socket instance, or null.
 */
export function getSocket() {
  return sock;
}

/**
 * Initializes (or re-initializes) the Baileys WhatsApp connection.
 */
export async function startConnection() {
  connectionState = "CONNECTING";
  currentQrDataUrl = null;

  const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    generateHighQualityLinkPreview: false,
    // Reduce log noise
    browser: ["InsureDesk CRM", "Chrome", "133.0.0.0"],
    // Connection settings
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: undefined,
    keepAliveIntervalMs: 25000,
  });

  // ---- Connection Update Handler ----
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // New QR code received — convert to base64 DataURL for the CRM frontend
      try {
        currentQrDataUrl = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
        });
        connectionState = "QR_READY";
        console.log("[Baileys] QR code generated. Waiting for scan...");
      } catch (err) {
        console.error("[Baileys] Failed to generate QR DataURL:", err);
      }
    }

    if (connection === "close") {
      currentQrDataUrl = null;

      const statusCode =
        (lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : lastDisconnect?.error?.output?.statusCode) ?? 500;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[Baileys] Connection closed. Status: ${statusCode}. LoggedOut: ${!shouldReconnect}`
      );

      if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(reconnectAttempts * 2000, 30000);
        console.log(
          `[Baileys] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
        );
        connectionState = "CONNECTING";
        setTimeout(() => startConnection(), delay);
      } else {
        connectionState = "DISCONNECTED";
        sock = null;
        if (!shouldReconnect) {
          console.log("[Baileys] Logged out by user. Clearing session files...");
          try {
            const fs = await import("fs");
            fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
            console.log("[Baileys] Session files cleared successfully. Manual re-scan required.");
          } catch (err) {
            console.warn("[Baileys] Failed to clear session directory:", err.message);
          }
        } else {
          console.error(
            "[Baileys] Max reconnection attempts reached. Manual restart required."
          );
        }
      }
    }

    if (connection === "open") {
      connectionState = "CONNECTED";
      currentQrDataUrl = null;
      reconnectAttempts = 0;
      console.log("[Baileys] ✅ WhatsApp connected successfully!");
      refreshGroups().catch((error) => {
        console.error("[Groups] Automatic discovery failed:", error.message);
      });
    }
  });

  // ---- Credential Persistence ----
  sock.ev.on("creds.update", saveCreds);
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
}

/**
 * Logs out the current session and clears auth state.
 */
export async function logout() {
  if (sock) {
    try {
      await sock.logout();
    } catch (err) {
      console.warn("[Baileys] Error during logout:", err.message);
    }
    sock = null;
  }
  connectionState = "DISCONNECTED";
  currentQrDataUrl = null;

  // Clean up session files
  const fs = await import("fs");
  try {
    fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
    clearStoredGroups();
    console.log("[Baileys] Session data cleared.");
  } catch (err) {
    console.warn("[Baileys] Could not clear session directory:", err.message);
  }
}

/**
 * Formats a phone number string into WhatsApp JID format.
 * Handles Indian numbers: strips leading 0, adds 91 country code if 10 digits.
 */
export function formatRecipientToJid(recipient) {
  if (!recipient) return "";
  const raw = recipient.toString().trim();
  if (GROUP_JID_PATTERN.test(raw)) return raw.toLowerCase();
  if (raw.toLowerCase().endsWith("@g.us")) throw new Error("Invalid WhatsApp group ID");

  let cleaned = raw.replace(/@(c\.us|s\.whatsapp\.net)$/i, "").replace(/\D/g, "");
  // Remove leading zero
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  // Add India country code if 10 digits
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned + "@s.whatsapp.net";
}

export const formatPhoneToJid = formatRecipientToJid;

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

export function normalizeIndianPhone(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/@lid$/i.test(raw)) return "";
  let digits = raw.replace(/@(c\.us|s\.whatsapp\.net)$/i, "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
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

export async function refreshGroups() {
  if (groupRefreshPromise) return groupRefreshPromise;
  if (!sock || connectionState !== "CONNECTED") {
    throw new Error("WhatsApp is not connected; groups cannot be refreshed");
  }

  groupRefreshPromise = (async () => {
    const participating = await sock.groupFetchAllParticipating();
    const groups = Object.values(participating || {}).map((group) => ({
      groupId: group.id,
      groupName: group.subject || "Unnamed WhatsApp Group",
      participantCount: Array.isArray(group.participants) ? group.participants.length : 0,
      groupParticipants: normalizeGroupParticipants(group.participants),
      creationTime: group.creation ? new Date(Number(group.creation) * 1000).toISOString() : null,
    }));
    const sessionId = sock.user?.id ? String(sock.user.id).split(":")[0] : null;
    storeDiscoveredGroups(groups, sessionId);
    console.log(`[Groups] Synced ${groups.length} participating group(s).`);
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
 * Sends a text message via the active Baileys socket.
 */
export async function sendText(to, content) {
  getStatus();
  if (!sock || connectionState !== "CONNECTED") {
    throw new Error("WhatsApp is not connected");
  }
  const jid = formatRecipientToJid(to);
  if (!jid) throw new Error("A valid WhatsApp recipient is required");
  assertAvailableGroup(jid);
  let result;
  try {
    result = await sock.sendMessage(jid, { text: content });
  } catch (error) {
    throw formatSendError(error, jid);
  }
  return {
    success: true,
    id: result?.key?.id || null,
    timestamp: result?.messageTimestamp || null,
  };
}

/**
 * Sends a media message (image or document) via the active Baileys socket.
 * @param {string} to - Phone number
 * @param {string} mediaBase64 - Base64-encoded file data (with or without data: prefix)
 * @param {string} filename - File name
 * @param {string} caption - Caption text
 * @param {string} type - "image" or "document"
 */
export async function sendMedia(to, mediaBase64, filename, caption, type) {
  getStatus();
  if (!sock || connectionState !== "CONNECTED") {
    throw new Error("WhatsApp is not connected");
  }
  const jid = formatRecipientToJid(to);
  if (!jid) throw new Error("A valid WhatsApp recipient is required");
  assertAvailableGroup(jid);

  // Strip data URL prefix if present
  let rawBase64 = mediaBase64;
  if (rawBase64.includes(",")) {
    rawBase64 = rawBase64.split(",")[1];
  }
  const buffer = Buffer.from(rawBase64, "base64");

  let messagePayload;
  if (type === "image") {
    messagePayload = {
      image: buffer,
      caption: caption || "",
      fileName: filename || "image.png",
    };
  } else {
    // document / PDF / any file
    messagePayload = {
      document: buffer,
      mimetype: getMimeType(filename),
      fileName: filename || "document.pdf",
      caption: caption || "",
    };
  }

  let result;
  try {
    result = await sock.sendMessage(jid, messagePayload);
  } catch (error) {
    throw formatSendError(error, jid);
  }
  return {
    success: true,
    id: result?.key?.id || null,
    timestamp: result?.messageTimestamp || null,
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
