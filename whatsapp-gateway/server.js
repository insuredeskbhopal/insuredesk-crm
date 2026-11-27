import express from "express";
import {
  getStatus,
  getQrCode,
  sendText,
  sendMedia,
  listGroups,
  matchGroupsByPhone,
  refreshGroups,
  logoutSession,
  pauseSession,
  deleteAccountSession,
  setPrimaryAccount,
  createNewAccount,
  startConnection,
  listAllAccountsWithStatus,
  startAllAccounts,
  shutdownAllSessions,
  getSentIdempotencyStatus,
  getGatewayMetrics,
} from "./baileys-manager.js";
import { getAccount } from "./account-registry.js";
import { apiKeyAuth } from "./auth-middleware.js";

// ---- Load env from parent .env if gateway .env doesn't exist ----
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gatewayEnvPath = path.join(__dirname, ".env");
const parentEnvProdPath = path.join(__dirname, "..", ".env.production");
const parentEnvPath = path.join(__dirname, "..", ".env");

if (fs.existsSync(gatewayEnvPath)) {
  config({ path: gatewayEnvPath });
} else if (fs.existsSync(parentEnvProdPath)) {
  config({ path: parentEnvProdPath });
} else if (fs.existsSync(parentEnvPath)) {
  config({ path: parentEnvPath });
}

const platformPort = process.env.PORT;
const PORT = parseInt(
  process.env.WHATSAPP_GATEWAY_PORT || platformPort || "8090",
  10,
);
const HOST =
  process.env.WHATSAPP_GATEWAY_HOST ||
  (platformPort ? "0.0.0.0" : "127.0.0.1");

const app = express();
let isShuttingDown = false;
let httpServer = null;

function sanitizeErrorMessage(err, fallback = "Internal gateway error") {
  const raw = err instanceof Error ? err.message : String(err || fallback);
  return raw.slice(0, 200);
}

function getRequestIdempotencyKey(req) {
  const headerKey = req.headers["x-idempotency-key"];
  const value = Array.isArray(headerKey) ? headerKey[0] : headerKey || req.body?.idempotencyKey;
  const trimmed = String(value || "").trim();
  return trimmed && /^[a-zA-Z0-9:_-]{8,160}$/.test(trimmed) ? trimmed : null;
}

// ---- Middleware ----
app.use(express.json({ limit: "50mb" })); // Large payloads for media (base64)

// ---- Health check (no auth required) ----
app.get(["/health", "/healthz"], (_req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ success: false, shuttingDown: true, timestamp: new Date() });
  }
  res.json({ success: true, uptime: process.uptime(), timestamp: new Date() });
});

// ---- Reject new work while draining during graceful shutdown ----
app.use((_req, res, next) => {
  if (isShuttingDown) {
    return res.status(503).json({
      success: false,
      error: "Gateway is shutting down for restart. Retry shortly.",
    });
  }
  next();
});

// ---- All other routes require API key ----
app.use(apiKeyAuth);

// ---- GET /metrics (Diagnostics & Resource Benchmarks) ----
app.get("/metrics", (_req, res) => {
  res.json({ success: true, ...getGatewayMetrics() });
});

// ---- GET /messages/status/:key (Idempotency confirmation for interrupted sends) ----
app.get("/messages/status/:key", (req, res) => {
  const key = String(req.params.key || "").trim();
  if (!key) {
    return res.status(400).json({ success: false, error: "Idempotency key is required" });
  }
  const entry = getSentIdempotencyStatus(key);
  res.json({
    success: true,
    found: Boolean(entry),
    entry: entry
      ? {
          status: entry.status,
          recordedAt: entry.recordedAt,
          id: entry.result?.id || null,
          timestamp: entry.result?.timestamp || null,
          accountId: entry.result?.accountId || null,
        }
      : null,
  });
});

// ---- POST /ocr (Remote PDF OCR Engine) ----
app.post("/ocr", async (req, res) => {
  const startTime = Date.now();
  try {
    const { pdfBase64 } = req.body || {};
    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: "Missing pdfBase64 payload" });
    }
    process.env.IS_RENDER_OCR_SERVICE = "true";
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const { extractTextFromPdfInGateway } = await import("./ocr-engine.js");
    const textResult = await extractTextFromPdfInGateway(pdfBuffer);
    const durationMs = Date.now() - startTime;
    console.log(`[OCR Engine] Synthesized text for PDF: ${textResult.rawText.length} chars in ${durationMs}ms`);

    res.json({
      success: true,
      rawText: textResult.rawText || "",
      extractionMethod: textResult.extractionMethod || "ocr",
      ocrAttempted: Boolean(textResult.ocrAttempted),
      durationMs,
    });
  } catch (error) {
    console.error("[OCR Engine Error]:", sanitizeErrorMessage(error, "OCR failed"));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(error, "OCR text extraction failed"),
    });
  }
});

// ── Multi-Session Management Endpoints ──────────────────────────────

// GET /sessions — read-only list of all registered accounts with connection status
app.get("/sessions", (_req, res) => {
  try {
    const sessions = listAllAccountsWithStatus();
    res.json({ success: true, accounts: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: sanitizeErrorMessage(err) });
  }
});

// POST /sessions — register a new account and explicitly initiate QR pairing
app.post("/sessions", async (req, res) => {
  try {
    const { label, owner } = req.body || {};
    const account = await createNewAccount(label || "Secondary Account", owner);
    res.json({ success: true, account });
  } catch (err) {
    res.status(400).json({ success: false, error: sanitizeErrorMessage(err) });
  }
});

// Explicitly resume/pair an account; credentials on disk are preserved.
app.post("/sessions/:id/connect", async (req, res) => {
  try {
    if (!getAccount(req.params.id)) {
      return res.status(404).json({ success: false, error: "Account not found" });
    }
    await startConnection(req.params.id, { trigger: "manual" });
    res.json({ success: true });
  } catch (error) {
    res.status(503).json({ success: false, error: sanitizeErrorMessage(error, "Connect failed") });
  }
});

// GET /sessions/:id/status (read-only)
app.get("/sessions/:id/status", (req, res) => {
  try {
    const status = getStatus(req.params.id);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: sanitizeErrorMessage(err) });
  }
});

// GET /sessions/:id/qr (read-only)
app.get("/sessions/:id/qr", (req, res) => {
  const accountId = req.params.id;
  const qrDataUrl = getQrCode(accountId);
  const status = getStatus(accountId);

  res.json({
    success: true,
    accountId,
    qrCode: qrDataUrl,
    connected: status.connected,
    state: status.state,
  });
});

// POST /sessions/:id/set-default — make this account the active sender
app.post("/sessions/:id/set-default", (req, res) => {
  try {
    const updated = setPrimaryAccount(req.params.id);
    res.json({ success: true, account: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: sanitizeErrorMessage(err) });
  }
});

// POST /sessions/:id/pause — disconnect WebSocket without deleting auth data
app.post("/sessions/:id/pause", async (req, res) => {
  try {
    const result = await pauseSession(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: sanitizeErrorMessage(err) });
  }
});

// POST /sessions/:id/logout — disconnect and invalidate auth credentials
app.post("/sessions/:id/logout", async (req, res) => {
  try {
    const result = await logoutSession(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: sanitizeErrorMessage(err) });
  }
});

// DELETE /sessions/:id — permanently delete account and session data
app.delete("/sessions/:id", async (req, res) => {
  try {
    const result = await deleteAccountSession(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: sanitizeErrorMessage(err) });
  }
});

// ── Legacy & Default Compatibility Endpoints (Read-Only GETs) ────────

// GET /status (read-only, supports optional ?accountId=...)
app.get("/status", (req, res) => {
  const accountId = req.query.accountId || null;
  const status = getStatus(accountId);
  res.json({
    success: true,
    ...status,
    lastChecked: new Date(),
  });
});

// GET /qr (read-only, supports optional ?accountId=...)
app.get("/qr", (req, res) => {
  const accountId = req.query.accountId || null;
  const qrDataUrl = getQrCode(accountId);
  if (qrDataUrl) {
    res.json({ success: true, qrCode: qrDataUrl, accountId });
  } else {
    const status = getStatus(accountId);
    res.json({
      success: true,
      qrCode: null,
      accountId,
      message: status.connected
        ? "Already connected — no QR needed"
        : "QR not yet available. Click Scan QR to start pairing.",
    });
  }
});

// GET /groups
app.get("/groups", (req, res) => {
  res.json(listGroups({ search: req.query.search, limit: req.query.limit, accountId: req.query.accountId }));
});

// GET /groups/match?phone=...
app.get("/groups/match", (req, res) => {
  if (!req.query.phone) {
    return res.status(400).json({ success: false, error: "A customer phone number is required" });
  }
  res.json(matchGroupsByPhone(req.query.phone, req.query.accountId));
});

// POST /groups/refresh
app.post("/groups/refresh", async (req, res) => {
  try {
    const accountId = req.body?.accountId || req.query?.accountId || null;
    res.json(await refreshGroups(accountId));
  } catch (err) {
    console.error("[Gateway] group refresh error:", sanitizeErrorMessage(err));
    res.status(503).json({ success: false, error: sanitizeErrorMessage(err, "Failed to refresh WhatsApp groups") });
  }
});

// POST /send-text
app.post("/send-text", async (req, res) => {
  try {
    const { to, content, accountId } = req.body || {};
    if (!to || !content) {
      return res
        .status(400)
        .json({ success: false, error: "Fields 'to' and 'content' are required" });
    }
    const idempotencyKey = getRequestIdempotencyKey(req);
    const result = await sendText(to, content, accountId, idempotencyKey);
    res.json(result);
  } catch (err) {
    console.error("[Gateway] send-text error:", sanitizeErrorMessage(err));
    res
      .status(500)
      .json({ success: false, error: sanitizeErrorMessage(err, "Failed to send text") });
  }
});

// POST /send-media
app.post("/send-media", async (req, res) => {
  try {
    const { to, mediaBase64, filename, caption, type, accountId } = req.body || {};
    if (!to || !mediaBase64) {
      return res.status(400).json({
        success: false,
        error: "Fields 'to' and 'mediaBase64' are required",
      });
    }
    const idempotencyKey = getRequestIdempotencyKey(req);
    const result = await sendMedia(
      to,
      mediaBase64,
      filename || "file",
      caption || "",
      type || "document",
      accountId,
      idempotencyKey,
    );
    res.json(result);
  } catch (err) {
    console.error("[Gateway] send-media error:", sanitizeErrorMessage(err));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err, "Failed to send media"),
    });
  }
});

// POST /send-birthday-wish
app.post("/send-birthday-wish", async (req, res) => {
  try {
    const { to, name, caption, accountId } = req.body || {};
    if (!to) {
      return res.status(400).json({ success: false, error: "Field 'to' is required" });
    }
    const idempotencyKey = getRequestIdempotencyKey(req);
    const { renderBirthdayCardBuffer } = await import("./card-engine.js");
    const imageBuffer = await renderBirthdayCardBuffer(name || "Valued Client");
    const base64 = imageBuffer.toString("base64");

    const result = await sendMedia(
      to,
      base64,
      "birthday_greeting.png",
      caption || "",
      "image",
      accountId,
      idempotencyKey,
    );
    res.json(result);
  } catch (err) {
    console.error("[Gateway] send-birthday-wish error:", sanitizeErrorMessage(err));
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err, "Failed to send birthday wish"),
    });
  }
});

// POST /logout (backward-compatible legacy)
app.post("/logout", async (req, res) => {
  try {
    const accountId = req.body?.accountId || null;
    const result = await logoutSession(accountId);
    res.json(result);
  } catch (err) {
    console.error("[Gateway] logout error:", sanitizeErrorMessage(err));
    res
      .status(500)
      .json({ success: false, error: sanitizeErrorMessage(err, "Failed to logout") });
  }
});

// ---- Express fallback error handler (never dump payloads or secrets) ----
app.use((err, _req, res, _next) => {
  console.error("[Gateway] Unhandled request error:", sanitizeErrorMessage(err));
  if (!res.headersSent) {
    res.status(err?.status || 500).json({
      success: false,
      error: sanitizeErrorMessage(err),
    });
  }
});

// ---- Process-level Lifecycle & Safety Handlers ----
let shutdownPromise = null;

export function gracefulShutdown(signal, exitCode = 0) {
  if (shutdownPromise) return shutdownPromise;
  isShuttingDown = true;
  console.log(`[Gateway] Received ${signal}; starting graceful shutdown (preserving sessions)...`);

  const forceExitTimer = setTimeout(() => {
    console.error("[Gateway] Graceful shutdown timed out; forcing exit.");
    process.exit(exitCode || 1);
  }, 12000);
  forceExitTimer.unref();

  shutdownPromise = (async () => {
    try {
      await new Promise((resolve) => {
        if (!httpServer) return resolve();
        httpServer.close(() => resolve());
        httpServer.closeIdleConnections?.();
      });
    } catch (err) {
      console.warn("[Gateway] HTTP server close notice:", sanitizeErrorMessage(err));
    }

    try {
      await shutdownAllSessions();
    } catch (err) {
      console.error("[Gateway] Session flush error during shutdown:", sanitizeErrorMessage(err));
    }

    clearTimeout(forceExitTimer);
    console.log("[Gateway] Graceful shutdown complete.");
    process.exit(exitCode);
  })();

  return shutdownPromise;
}

if (process.env.VITEST !== "true") {
  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM", 0));
  process.on("SIGINT", () => void gracefulShutdown("SIGINT", 0));

  process.on("unhandledRejection", (reason) => {
    const message = sanitizeErrorMessage(reason, "Unhandled Promise Rejection");
    const statusCode = reason?.output?.statusCode;
    // Only tolerate explicitly known closed-socket race if any occurs outside patched paths
    if (statusCode === 428 && message === "Connection Closed") {
      console.warn("[Gateway] Transient closed-socket rejection handled:", message);
      return;
    }
    console.error("[Gateway] Fatal unhandledRejection; exiting cleanly:", message);
    void gracefulShutdown("unhandledRejection", 1);
  });

  process.on("uncaughtException", (error) => {
    console.error(
      "[Gateway] Fatal uncaughtException; initiating shutdown and exit:",
      sanitizeErrorMessage(error, "Uncaught exception"),
    );
    void gracefulShutdown("uncaughtException", 1);
  });

  // ---- Start Server ----
  httpServer = app.listen(PORT, HOST, async () => {
    const boundPort = httpServer?.address?.()?.port ?? PORT;
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║   InsureDesk WhatsApp Gateway (Multi-Account)    ║");
    console.log(`║   Listening on http://${HOST}:${boundPort}            ║`);
    console.log("╚══════════════════════════════════════════════════╝");
    console.log("");

    try {
      await startAllAccounts();
    } catch (err) {
      console.error("[Gateway] Failed to initialize accounts:", sanitizeErrorMessage(err));
    }
  });
}

export { app };
