/**
 * WhatsApp Gateway REST Client
 *
 * Communicates with the standalone Baileys gateway (multi-account capable).
 * Provider-agnostic interface ready for future Meta Cloud API adapters.
 */
import { AsyncLocalStorage } from "node:async_hooks";

const DEFAULT_GATEWAY_TIMEOUT_MS = 15000;
const MEDIA_GATEWAY_TIMEOUT_MS = 30000;
const OCR_GATEWAY_TIMEOUT_MS = 45000;
const idempotencyStorage = new AsyncLocalStorage();

export function withWhatsAppIdempotencyKey(idempotencyKey, fn) {
  const key = String(idempotencyKey || "").trim();
  if (!key) return fn();
  return idempotencyStorage.run(key, fn);
}

export function isUncertainGatewayError(error) {
  return Boolean(
    error?.uncertainDelivery ||
      error?.isTimeout ||
      error?.code === "GATEWAY_TIMEOUT" ||
      error?.name === "TimeoutError" ||
      error?.name === "AbortError",
  );
}

function resolveTimeoutMs(endpoint, explicitTimeoutMs) {
  if (Number.isFinite(explicitTimeoutMs) && explicitTimeoutMs > 0) return explicitTimeoutMs;
  const envMs = Number.parseInt(process.env.WHATSAPP_GATEWAY_TIMEOUT_MS || "", 10);
  if (Number.isFinite(envMs) && envMs >= 1000) return envMs;
  const clean = endpoint.replace(/^\//, "");
  if (clean.startsWith("ocr")) return OCR_GATEWAY_TIMEOUT_MS;
  if (clean.startsWith("send-media") || clean.startsWith("send-birthday-wish")) {
    return MEDIA_GATEWAY_TIMEOUT_MS;
  }
  return DEFAULT_GATEWAY_TIMEOUT_MS;
}

function buildAbortSignal(timeoutMs, externalSignal) {
  const SignalClass = globalThis.AbortSignal;
  const timeoutSignal =
    typeof SignalClass !== "undefined" && typeof SignalClass.timeout === "function"
      ? SignalClass.timeout(timeoutMs)
      : undefined;
  if (externalSignal && timeoutSignal && typeof SignalClass.any === "function") {
    return SignalClass.any([externalSignal, timeoutSignal]);
  }
  return externalSignal || timeoutSignal;
}

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

export async function callGateway(method, endpoint, payload = null, requestOptions = {}) {
  const { baseUrl, apiKey } = getGatewayConfig();
  const cleanEndpoint = endpoint.replace(/^\//, "");
  const url = `${baseUrl}/${cleanEndpoint}`;
  const idempotencyKey = requestOptions.idempotencyKey || idempotencyStorage.getStore() || null;
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    ...(idempotencyKey ? { "x-idempotency-key": String(idempotencyKey) } : {}),
  };

  const timeoutMs = resolveTimeoutMs(cleanEndpoint, requestOptions.timeoutMs);
  const signal = buildAbortSignal(timeoutMs, requestOptions.signal);
  const options = {
    method,
    headers,
    ...(signal ? { signal } : {}),
  };
  if (payload && method !== "GET") {
    options.body = JSON.stringify(payload);
  }

  const isSendEndpoint =
    method === "POST" && /^(send-text|send-media|send-birthday-wish)\b/.test(cleanEndpoint);

  let response;
  try {
    response = await fetch(url, options);
  } catch (networkErr) {
    const isTimeout =
      networkErr?.name === "TimeoutError" ||
      networkErr?.name === "AbortError" ||
      /timed? ?out/i.test(String(networkErr?.message || ""));
    if (isTimeout) {
      throw Object.assign(
        new Error(`WhatsApp gateway request timed out after ${timeoutMs}ms.`),
        {
          status: 504,
          code: "GATEWAY_TIMEOUT",
          isTimeout: true,
          uncertainDelivery: isSendEndpoint,
          cause: networkErr,
        },
      );
    }
    const errMsg = String(networkErr?.message || "Network error");
    const definitelyNotSent = /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|Connection refused/i.test(errMsg);
    if (networkErr instanceof Error) {
      networkErr.uncertainDelivery = isSendEndpoint && !definitelyNotSent;
      throw networkErr;
    }
    throw Object.assign(new Error(errMsg), { uncertainDelivery: isSendEndpoint && !definitelyNotSent });
  }

  if (!response.ok) {
    const contentType = response.headers?.get?.("content-type") || "";
    const errorBody = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => "");
    const isHtml =
      contentType.includes("text/html") ||
      (typeof errorBody === "string" && /^\s*</.test(errorBody));
    const gatewayMessage =
      typeof errorBody === "object" && errorBody !== null
        ? String(errorBody.error || errorBody.message || "").trim()
        : !isHtml && typeof errorBody === "string"
          ? errorBody.trim().slice(0, 200)
          : "";

    let fallbackMessage;
    if (response.status === 404 && cleanEndpoint.split("/")[0] === "sessions") {
      fallbackMessage = "This WhatsApp gateway does not support multiple accounts. Deploy and restart the latest whatsapp-gateway service, then retry linking the number.";
    } else if (response.status === 404 && cleanEndpoint.startsWith("groups")) {
      fallbackMessage = "WhatsApp group discovery is not active on the gateway. Deploy and restart the latest gateway version.";
    } else if (response.status === 404) {
      fallbackMessage = "Endpoint not found on WhatsApp gateway. Ensure the latest gateway is running.";
    } else if (response.status === 502 || response.status === 503 || response.status === 504) {
      const reasonSuffix =
        gatewayMessage && typeof errorBody === "object" && !errorBody.error && errorBody.message
          ? ` (${gatewayMessage})`
          : "";
      fallbackMessage = `WhatsApp gateway temporarily unavailable (${response.status})${reasonSuffix}.`;
    } else {
      fallbackMessage = `WhatsApp gateway request failed (${response.status}).`;
    }

    const explicitAppRejectBeforeSend =
      Boolean(errorBody?.error) &&
      (/not connected|not found|is required|shutting down|no longer available|Invalid/i.test(gatewayMessage) ||
        [400, 401, 403, 404, 409, 422].includes(response.status));
    const uncertainDelivery =
      isSendEndpoint &&
      [502, 503, 504].includes(response.status) &&
      !explicitAppRejectBeforeSend;

    const finalMessage =
      typeof errorBody === "object" && errorBody?.error
        ? errorBody.error
        : [502, 503, 504].includes(response.status)
          ? fallbackMessage
          : gatewayMessage || fallbackMessage;

    throw Object.assign(new Error(finalMessage), {
      status: response.status,
      code: [502, 503, 504].includes(response.status) ? "GATEWAY_UNAVAILABLE" : "GATEWAY_ERROR",
      uncertainDelivery,
    });
  }

  return response.json();
}

export async function getWhatsAppMessageStatus(idempotencyKey) {
  const key = String(idempotencyKey || "").trim();
  if (!key) return null;
  try {
    return await callGateway("GET", `messages/status/${encodeURIComponent(key)}`, null, {
      timeoutMs: 8000,
    });
  } catch {
    return null;
  }
}

// ── Multi-Account Session Management API ────────────────────────────

export async function getWhatsAppSessions() {
  const res = await callGateway("GET", "sessions");
  return Array.isArray(res.accounts) ? res.accounts : [];
}

export async function createWhatsAppSession(label, owner) {
  return callGateway("POST", "sessions", { label: label || "New WhatsApp Number", owner });
}

export async function setPrimaryWhatsAppSession(accountId) {
  if (!accountId) throw new Error("Account ID is required to set primary session");
  return callGateway("POST", `sessions/${encodeURIComponent(accountId)}/set-default`);
}

export async function connectWhatsAppSession(accountId) {
  if (!accountId) throw new Error("Account ID is required to connect");
  return callGateway("POST", `sessions/${encodeURIComponent(accountId)}/connect`);
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
  if (!accountId) throw new Error("An explicit authorized WhatsApp sender is required");
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
  if (!accountId) throw new Error("An explicit authorized WhatsApp sender is required");
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
  if (!accountId) throw new Error("An explicit authorized WhatsApp sender is required");
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
  if (!accountId) throw new Error("An explicit authorized WhatsApp sender is required");
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

export async function getWhatsAppGroups({ search = "", limit = 30, accountId } = {}) {
  if (!accountId) throw new Error("A selected WhatsApp sender is required");
  const query = new URLSearchParams({ search, limit: String(limit), accountId });
  const groups = await callGateway("GET", `groups?${query}`);
  return Array.isArray(groups) ? groups : [];
}
export async function matchWhatsAppGroups(phone, accountId) {
  if (!accountId) throw new Error("A selected WhatsApp sender is required");
  const result = await callGateway("GET", `groups/match?${new URLSearchParams({ phone, accountId })}`);
  return { phone: result.phone || "", groups: Array.isArray(result.groups) ? result.groups : [] };
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
