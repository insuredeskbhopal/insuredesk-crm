/**
 * WhatsApp Gateway REST Client
 *
 * Communicates with the standalone Baileys gateway (Express server on localhost:8090).
 * Drop-in replacement for openwa-client.js — same exported function signatures,
 * so queue-manager.js and API routes only need to update import paths.
 */

const BASE_URL =
  process.env.WHATSAPP_GATEWAY_URL ||
  process.env.OPENWA_BASE_URL ||
  "http://localhost:8090";

const API_KEY =
  process.env.WHATSAPP_GATEWAY_API_KEY ||
  process.env.OPENWA_API_KEY;

// ── Internal helpers ────────────────────────────────────────────────

function formatPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = phone.toString().replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

async function callGateway(method, endpoint, payload = null) {
  const url = `${BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  const headers = {
    "Content-Type": "application/json",
  };
  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }

  const options = {
    method,
    headers,
  };
  if (payload && method !== "GET") {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp Gateway error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ── Exported API (new names) ────────────────────────────────────────

export async function getWhatsAppStatus() {
  try {
    const res = await callGateway("GET", "status");
    return {
      connected: res.connected || false,
      state: res.state || "UNKNOWN",
      lastChecked: new Date(),
    };
  } catch (error) {
    // Gateway is completely unreachable
    return {
      connected: false,
      state: "UNREACHABLE",
      error: error.message,
      lastChecked: new Date(),
    };
  }
}

export async function getWhatsAppQrCode() {
  try {
    const res = await callGateway("GET", "qr");
    if (res.success && res.qrCode) {
      return {
        success: true,
        qrCode: res.qrCode,
      };
    }
    return {
      success: false,
      error: res.message || "QR not available",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function sendWhatsAppText(to, content) {
  const phone = formatPhoneNumber(to);
  const res = await callGateway("POST", "send-text", {
    to: phone,
    content,
  });
  return {
    id: res.id || null,
    success: res.success || false,
    timestamp: res.timestamp || null,
  };
}

export async function sendWhatsAppImage(to, fileData, filename, caption) {
  const phone = formatPhoneNumber(to);
  const res = await callGateway("POST", "send-media", {
    to: phone,
    mediaBase64: fileData,
    filename: filename || "image.png",
    caption: caption || "",
    type: "image",
  });
  return {
    id: res.id || null,
    success: res.success || false,
    timestamp: res.timestamp || null,
  };
}

export async function sendWhatsAppFile(to, fileData, filename, caption) {
  const phone = formatPhoneNumber(to);
  const res = await callGateway("POST", "send-media", {
    to: phone,
    mediaBase64: fileData,
    filename: filename || "document.pdf",
    caption: caption || "",
    type: "document",
  });
  return {
    id: res.id || null,
    success: res.success || false,
    timestamp: res.timestamp || null,
  };
}

// ── Backward-compatible aliases (old OpenWA names) ──────────────────
// These allow any file still importing the old names to work without changes.

export const getOpenwaStatus = getWhatsAppStatus;
export const getOpenwaQrCode = getWhatsAppQrCode;
export const sendOpenwaText = sendWhatsAppText;
export const sendOpenwaImage = sendWhatsAppImage;
export const sendOpenwaFile = sendWhatsAppFile;
