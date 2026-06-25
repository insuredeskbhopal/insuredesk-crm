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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, "sessions", "insuredesk_session");

const logger = pino({ level: "warn" });

// Singleton state
let sock = null;
let connectionState = "DISCONNECTED"; // DISCONNECTED | CONNECTING | QR_READY | CONNECTED
let currentQrDataUrl = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

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
          console.log(
            "[Baileys] Logged out by user. Session cleared. Manual re-scan required."
          );
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
    }
  });

  // ---- Credential Persistence ----
  sock.ev.on("creds.update", saveCreds);

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
    console.log("[Baileys] Session data cleared.");
  } catch (err) {
    console.warn("[Baileys] Could not clear session directory:", err.message);
  }
}

/**
 * Formats a phone number string into WhatsApp JID format.
 * Handles Indian numbers: strips leading 0, adds 91 country code if 10 digits.
 */
export function formatPhoneToJid(phone) {
  if (!phone) return "";
  let cleaned = phone.toString().replace(/\D/g, "");
  // Remove leading zero
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  // Add India country code if 10 digits
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  // Remove @c.us/@s.whatsapp.net if already appended
  cleaned = cleaned.replace(/@(c\.us|s\.whatsapp\.net)$/, "");
  return cleaned + "@s.whatsapp.net";
}

/**
 * Sends a text message via the active Baileys socket.
 */
export async function sendText(to, content) {
  getStatus();
  if (!sock || connectionState !== "CONNECTED") {
    throw new Error("WhatsApp is not connected");
  }
  const jid = formatPhoneToJid(to);
  const result = await sock.sendMessage(jid, { text: content });
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
  const jid = formatPhoneToJid(to);

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

  const result = await sock.sendMessage(jid, messagePayload);
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
