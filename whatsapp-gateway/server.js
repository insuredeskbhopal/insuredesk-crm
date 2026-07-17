import express from "express";
import {
  startConnection,
  getStatus,
  getQrCode,
  sendText,
  sendMedia,
  logout,
} from "./baileys-manager.js";
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
app.get("/health", (_req, res) => {
  res.json({ success: true, uptime: process.uptime(), timestamp: new Date() });
});

// ---- All other routes require API key ----
app.use(apiKeyAuth);

// ---- GET /status ----
app.get("/status", (_req, res) => {
  const status = getStatus();
  res.json({
    success: true,
    ...status,
    lastChecked: new Date(),
  });
});

// ---- GET /qr ----
app.get("/qr", (_req, res) => {
  const qrDataUrl = getQrCode();
  if (qrDataUrl) {
    res.json({ success: true, qrCode: qrDataUrl });
  } else {
    const status = getStatus();
    res.json({
      success: true,
      qrCode: null,
      message: status.connected
        ? "Already connected — no QR needed"
        : "QR not yet available. Waiting for WhatsApp...",
    });
  }
});

// ---- POST /send-text ----
app.post("/send-text", async (req, res) => {
  try {
    const { to, content } = req.body;
    if (!to || !content) {
      return res
        .status(400)
        .json({ success: false, error: "Fields 'to' and 'content' are required" });
    }
    const result = await sendText(to, content);
    res.json(result);
  } catch (err) {
    console.error("[Gateway] send-text error:", err);
    res
      .status(500)
      .json({ success: false, error: err.message || "Failed to send text" });
  }
});

// ---- POST /send-media ----
app.post("/send-media", async (req, res) => {
  try {
    const { to, mediaBase64, filename, caption, type } = req.body;
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
      type || "document"
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

// ---- POST /logout ----
app.post("/logout", async (_req, res) => {
  try {
    await logout();
    res.json({ success: true, message: "Logged out and session cleared" });
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
  console.log("║   InsureDesk WhatsApp Gateway (Baileys)         ║");
  console.log(`║   Listening on http://${HOST}:${PORT}            ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  // Start the WhatsApp connection
  try {
    await startConnection();
  } catch (err) {
    console.error("[Gateway] Failed to start WhatsApp connection:", err);
  }
});
