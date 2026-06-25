/**
 * Express middleware to verify API key from x-api-key header.
 * Rejects requests without a valid key with 401.
 */
export function apiKeyAuth(req, res, next) {
  const apiKey = process.env.WHATSAPP_GATEWAY_API_KEY;

  // If no API key is configured, skip auth (development mode)
  if (!apiKey) {
    console.warn(
      "[Auth] WARNING: No WHATSAPP_GATEWAY_API_KEY set. All requests are allowed."
    );
    return next();
  }

  const providedKey =
    req.headers["x-api-key"] ||
    req.headers["api_key"] ||
    req.query.api_key;

  if (!providedKey || providedKey !== apiKey) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or missing API key",
    });
  }

  next();
}
