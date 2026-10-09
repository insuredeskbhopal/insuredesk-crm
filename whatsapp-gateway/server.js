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
  10
);
const HOST =
  process.env.WHATSAPP_GATEWAY_HOST ||
  (platformPort ? "0.0.0.0" : "127.0.0.1");

const app = express();

// ---- Middleware ----
app.use(express.json({ limit: "50mb" })); // Large payloads for media (base64)

// ---- Health check (no auth required) ----
app.get(["/health", "/healthz"], (_req, res) => {
  res.json({ success: true, uptime: process.uptime(), timestamp: new Date() });
});

// ---- All other routes require API key ----
app.use(apiKeyAuth);

// ---- GET /metrics (Diagnostics & Resource Benchmarks) ----
app.get("/metrics", (_req, res) => {
  res.json({ success: true, ...getGatewayMetrics() });
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
    console.error("[OCR Engine Error]:", error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "OCR text extraction failed",
    });
  }
});

// ── Multi-Session Management Endpoints ──────────────────────────────

// GET /sessions — list all registered accounts with connection status
app.get("/sessions", (_req, res) => {
  try {
    const sessions = listAllAccountsWithStatus();
    res.json({ success: true, accounts: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /sessions — register a new account and initiate QR pairing
app.post("/sessions", async (req, res) => {
  try {
    const { label, owner } = req.body || {};
    const account = await createNewAccount(label || "Secondary Account", owner);
    res.json({ success: true, account });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Explicitly resume a paused or expired pairing session; credentials are preserved.
app.post("/sessions/:id/connect", async (req, res) => {
  try {
    if (!getAccount(req.params.id)) return res.status(404).json({ success: false, error: "Account not found" });
    await startConnection(req.params.id);
    res.json({ success: true });
  } catch (error) { res.status(503).json({ success: false, error: error.message }); }
});

// GET /sessions/:id/status
app.get("/sessions/:id/status", (req, res) => {
  try {
    const status = getStatus(req.params.id);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /sessions/:id/qr
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
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /sessions/:id/pause — disconnect WebSocket without deleting auth data
app.post("/sessions/:id/pause", async (req, res) => {
  try {
    const result = await pauseSession(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /sessions/:id/logout — disconnect and invalidate auth credentials
app.post("/sessions/:id/logout", async (req, res) => {
  try {
    const result = await logoutSession(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /sessions/:id — permanently delete account and session data
app.delete("/sessions/:id", async (req, res) => {
  try {
    const result = await deleteAccountSession(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── Legacy & Default Compatibility Endpoints ────────────────────────

// GET /status (supports optional ?accountId=...)
app.get("/status", (req, res) => {
  const accountId = req.query.accountId || null;
  const status = getStatus(accountId);
  res.json({
    success: true,
    ...status,
    lastChecked: new Date(),
  });
});

// GET /qr (supports optional ?accountId=...)
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
        : "QR not yet available. Waiting for WhatsApp...",
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
    console.error("[Gateway] group refresh error:", err);
    res.status(503).json({ success: false, error: err.message || "Failed to refresh WhatsApp groups" });
  }
});

// POST /send-text
app.post("/send-text", async (req, res) => {
  try {
    const { to, content, accountId } = req.body;
    if (!to || !content) {
      return res
        .status(400)
        .json({ success: false, error: "Fields 'to' and 'content' are required" });
    }
    const result = await sendText(to, content, accountId);
    res.json(result);
  } catch (err) {
    console.error("[Gateway] send-text error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Failed to send text" });
  }
});

// POST /send-media
app.post("/send-media", async (req, res) => {
  try {
    const { to, mediaBase64, filename, caption, type, accountId } = req.body;
    if (!to || !mediaBase64) {
      return res.status(400).json({
        success: false,
        error: "Fields 'to' and 'mediaBase64' are required",
      });
    }
    const result = await sendMedia(
      to,
      mediaBase64,
      filename || "file",
      caption || "",
      type || "document",
      accountId
    );
    res.json(result);
  } catch (err) {
    console.error("[Gateway] send-media error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to send media",
    });
  }
});

// POST /send-birthday-wish
app.post("/send-birthday-wish", async (req, res) => {
  try {
    const { to, name, caption, accountId } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: "Field 'to' is required" });
    }
    const { renderBirthdayCardBuffer } = await import("./card-engine.js");
    const imageBuffer = await renderBirthdayCardBuffer(name || "Valued Client");
    const base64 = imageBuffer.toString("base64");
    
    const result = await sendMedia(
      to,
      base64,
      "birthday_greeting.png",
      caption || "",
      "image",
      accountId
    );
    res.json(result);
  } catch (err) {
    console.error("[Gateway] send-birthday-wish error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to send birthday wish",
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
    console.error("[Gateway] logout error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Failed to logout" });
  }
});

// ---- Start Server ----
app.listen(PORT, HOST, async () => {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   InsureDesk WhatsApp Gateway (Multi-Account)    ║");
  console.log(`║   Listening on http://${HOST}:${PORT}            ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  // Start all registered accounts
  try {
    await startAllAccounts();
  } catch (err) {
    console.error("[Gateway] Failed to start accounts:", err);
  }
});
