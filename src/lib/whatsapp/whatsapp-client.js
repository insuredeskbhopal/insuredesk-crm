/**
 * WhatsApp Gateway REST Client
 *
 * Communicates with the standalone Baileys gateway (multi-account capable).
 * Provider-agnostic interface ready for future Meta Cloud API adapters.
 */

function getGatewayConfig() {
  const rawBaseUrl = process.env.WHATSAPP_GATEWAY_URL || process.env.OPENWA_BASE_URL || "";
  const rawApiKey = process.env.WHATSAPP_GATEWAY_API_KEY || process.env.OPENWA_API_KEY || "";

  const baseUrl = rawBaseUrl.trim().replace(/\/$/, "");
  const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, "");

  if (!baseUrl) {
    throw new Error("WHATSAPP_GATEWAY_URL is not configured in environment variables.");
  }

  if (!apiKey) {
    throw new Error("WHATSAPP_GATEWAY_API_KEY is not configured in environment variables.");
  }

  const normalizedBase = /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`;
  return { baseUrl: normalizedBase, apiKey };
}

// ── Internal helpers ────────────────────────────────────────────────

function formatRecipient(recipient) {
  if (!recipient) return "";
  const raw = recipient.toString().trim();
  if (/^[a-z0-9._:-]+@g\.us$/i.test(raw)) return raw.toLowerCase();
  if (raw.toLowerCase().endsWith("@g.us")) throw new Error("Invalid WhatsApp group ID");

  let cleaned = raw.replace(/@(c\.us|s\.whatsapp\.net)$/i, "").replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

export async function callGateway(method, endpoint, payload = null) {
  const { baseUrl, apiKey } = getGatewayConfig();
  const url = `${baseUrl}/${endpoint.replace(/^\//, "")}`;
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };

  const options = {
    method,
    headers,
  };
  if (payload && method !== "GET") {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const contentType = response.headers?.get?.("content-type") || "";
    const errorBody = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => "");
    const gatewayMessage = typeof errorBody === "object" ? errorBody.error : "";
    let fallbackMessage;
    if (response.status === 404 && endpoint.split("/")[0] === "sessions") {
      fallbackMessage = "This WhatsApp gateway does not support multiple accounts. Deploy and restart the latest whatsapp-gateway service, then retry linking the number.";
    } else if (response.status === 404 && endpoint.startsWith("groups")) {
      fallbackMessage = "WhatsApp group discovery is not active on the gateway. Deploy and restart the latest gateway version.";
    } else if (response.status === 404) {
      fallbackMessage = "Endpoint not found on WhatsApp gateway. Ensure the latest gateway is running.";
    } else {
      fallbackMessage = `WhatsApp gateway request failed (${response.status}).`;
    }
    throw new Error(gatewayMessage || fallbackMessage);
  }

  return response.json();
}

// ── Multi-Account Session Management API ────────────────────────────

export async function getWhatsAppSessions() {
  const res = await callGateway("GET", "sessions");
  return Array.isArray(res.accounts) ? res.accounts : [];
}

export async function createWhatsAppSession(label) {
  return callGateway("POST", "sessions", { label: label || "New WhatsApp Number" });
}

export async function setPrimaryWhatsAppSession(accountId) {
  if (!accountId) throw new Error("Account ID is required to set primary session");
  return callGateway("POST", `sessions/${encodeURIComponent(accountId)}/set-default`);
}

export async function pauseWhatsAppSession(accountId) {
  if (!accountId) throw new Error("Account ID is required to pause session");
  return callGateway("POST", `sessions/${encodeURIComponent(accountId)}/pause`);
}

export async function logoutWhatsAppSession(accountId) {
  if (!accountId) throw new Error("Account ID is required to logout session");
  return callGateway("POST", `sessions/${encodeURIComponent(accountId)}/logout`);
}

export async function deleteWhatsAppSession(accountId) {
  if (!accountId) throw new Error("Account ID is required to delete session");
  return callGateway("DELETE", `sessions/${encodeURIComponent(accountId)}`);
}

export async function getWhatsAppMetrics() {
  try {
    return await callGateway("GET", "metrics");
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Status & QR Code ────────────────────────────────────────────────

export async function getWhatsAppStatus(accountId = null) {
  try {
    const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    const res = await callGateway("GET", `status${query}`);
    return {
      connected: res.connected || false,
      state: res.state || "UNKNOWN",
      accountId: res.accountId || accountId,
      phoneNumber: res.phoneNumber || null,
      isDefault: res.isDefault ?? true,
      lastChecked: new Date(),
    };
  } catch (error) {
    return {
      connected: false,
      state: "UNREACHABLE",
      error: error.message,
      lastChecked: new Date(),
    };
  }
}

export async function getWhatsAppQrCode(accountId = null) {
  try {
    const endpoint = accountId
      ? `sessions/${encodeURIComponent(accountId)}/qr`
      : "qr";
    const res = await callGateway("GET", endpoint);
    if (res.success && res.qrCode) {
      return {
        success: true,
        qrCode: res.qrCode,
        accountId: res.accountId || accountId,
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

// ── Outbound Dispatch API (Account-Aware) ───────────────────────────

export async function sendWhatsAppText(to, content, accountId = null) {
  const recipient = formatRecipient(to);
  const payload = {
    to: recipient,
    content,
  };
  if (accountId) payload.accountId = accountId;

  const res = await callGateway("POST", "send-text", payload);
  if (res.success === false) {
    throw new Error(res.error || res.message || "WhatsApp gateway could not send the message.");
  }
  const output = {
    id: res.id || null,
    success: res.success || false,
    timestamp: res.timestamp || null,
  };
  if (res.accountId || accountId) {
    output.accountId = res.accountId || accountId;
  }
  return output;
}

export async function sendWhatsAppImage(to, fileData, filename, caption, accountId = null) {
  const recipient = formatRecipient(to);
  const payload = {
    to: recipient,
    mediaBase64: fileData,
    filename: filename || "image.png",
    caption: caption || "",
    type: "image",
  };
  if (accountId) payload.accountId = accountId;

  const res = await callGateway("POST", "send-media", payload);
  if (res.success === false) {
    throw new Error(res.error || res.message || "WhatsApp gateway could not send the image.");
  }
  const output = {
    id: res.id || null,
    success: res.success || false,
    timestamp: res.timestamp || null,
  };
  if (res.accountId || accountId) {
    output.accountId = res.accountId || accountId;
  }
  return output;
}

export async function sendWhatsAppFile(to, fileData, filename, caption, accountId = null) {
  const recipient = formatRecipient(to);
  const payload = {
    to: recipient,
    mediaBase64: fileData,
    filename: filename || "document.pdf",
    caption: caption || "",
    type: "document",
  };
  if (accountId) payload.accountId = accountId;

  const res = await callGateway("POST", "send-media", payload);
  if (res.success === false) {
    throw new Error(res.error || res.message || "WhatsApp gateway could not send the file.");
  }
  const output = {
    id: res.id || null,
    success: res.success || false,
    timestamp: res.timestamp || null,
  };
  if (res.accountId || accountId) {
    output.accountId = res.accountId || accountId;
  }
  return output;
}

export async function sendWhatsAppBirthdayWish(to, name, caption, accountId = null) {
  const recipient = formatRecipient(to);
  const payload = {
    to: recipient,
    name: name || "Valued Client",
    caption: caption || "",
  };
  if (accountId) payload.accountId = accountId;

  const res = await callGateway("POST", "send-birthday-wish", payload);
  if (res.success === false) {
    throw new Error(res.error || res.message || "WhatsApp gateway could not send the birthday wish.");
  }
  const output = {
    id: res.id || null,
    success: res.success || false,
    timestamp: res.timestamp || null,
  };
  if (res.accountId || accountId) {
    output.accountId = res.accountId || accountId;
  }
  return output;
}

// ── Backward-Compatible Legacy Aliases ──────────────────────────────

export async function logoutWhatsApp(accountId = null) {
  try {
    const payload = accountId ? { accountId } : {};
    const res = await callGateway("POST", "logout", payload);
    return {
      success: res.success || false,
      message: res.message || "Logged out successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getWhatsAppGroups({ search = "", limit = 30 } = {}) {
  const query = search
    ? `?search=${encodeURIComponent(search)}&limit=${encodeURIComponent(limit)}`
    : "";
  const groups = await callGateway("GET", `groups${query}`);
  return Array.isArray(groups) ? groups : [];
}

export async function matchWhatsAppGroups(phone) {
  const result = await callGateway("GET", `groups/match?phone=${encodeURIComponent(phone)}`);
  return {
    phone: result.phone || "",
    groups: Array.isArray(result.groups) ? result.groups : [],
  };
}

export async function refreshWhatsAppGroups(accountId = null) {
  const payload = accountId ? { accountId } : {};
  const groups = await callGateway("POST", "groups/refresh", payload);
  return Array.isArray(groups) ? groups : [];
}

export async function downloadWhatsAppMedia(messageId) {
  if (!messageId) return "";
  try {
    const res = await callGateway("POST", "download-media", { messageId });
    return res.mediaBase64 || res.data || res.base64 || "";
  } catch {
    return "";
  }
}

export async function searchGroupMessages(groupName = "Renwal Quote New", searchPattern = "") {
  if (!groupName) return [];
  try {
    const res = await callGateway("POST", "groups/search-messages", {
      groupName,
      query: searchPattern,
    });
    return Array.isArray(res) ? res : (Array.isArray(res?.messages) ? res.messages : []);
  } catch {
    return [];
  }
}

export const getOpenwaStatus = getWhatsAppStatus;
export const getOpenwaQrCode = getWhatsAppQrCode;
export const sendOpenwaText = sendWhatsAppText;
export const sendOpenwaImage = sendWhatsAppImage;
export const sendOpenwaFile = sendWhatsAppFile;
export const logoutOpenwa = logoutWhatsApp;
