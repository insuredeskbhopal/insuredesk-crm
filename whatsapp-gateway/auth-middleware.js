import crypto from "crypto";

/**
 * Express middleware to verify API key from x-api-key header.
 * Rejects requests without a valid key with 401.
 * Fails closed if WHATSAPP_GATEWAY_API_KEY is not configured.
 */
export function apiKeyAuth(req, res, next) {
  const rawApiKey =
    process.env.WHATSAPP_GATEWAY_API_KEY ||
    process.env.OPENWA_API_KEY ||
    "";
  const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, "");

  // Fail-closed: If no API key is configured, reject all requests
  if (!apiKey) {
    console.error("[Auth] FATAL: WHATSAPP_GATEWAY_API_KEY is not configured on the gateway server.");
    return res.status(500).json({
      success: false,
      error: "Server configuration error: WhatsApp gateway authentication key is not configured.",
    });
  }

  const rawProvidedKey =
    req.headers["x-api-key"] ||
    req.headers["api_key"] ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
    "";
  const providedKey = (Array.isArray(rawProvidedKey) ? rawProvidedKey[0] : String(rawProvidedKey))
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing API key",
    });
  }

  // Timing-safe comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedKey);
  const targetBuffer = Buffer.from(apiKey);

  if (
    providedBuffer.length !== targetBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, targetBuffer)
  ) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid API key",
    });
  }

  next();
}
