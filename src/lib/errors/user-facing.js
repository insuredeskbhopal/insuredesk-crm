const TECHNICAL_ERROR_PATTERNS = [
  /\bprisma\b/i,
  /\binvocation\b/i,
  /\bcolumn\b.*\bdoes not exist\b/i,
  /\bconstraint\b/i,
  /\bstack\b/i,
  /\bsyntaxerror\b/i,
  /\btypeerror\b/i,
  /\breferenceerror\b/i,
  /\bpostgres\b/i,
  /\bdatabase\s+server\b/i,
  /\bneon\.tech\b/i,
  /\bpostgres(?:ql)?:\/\//i,
  /\bsql\b/i,
  /\bdatabase\b.*\bcurrent\b/i,
  /\bECONNRESET\b/i,
  /\bETIMEDOUT\b/i,
  /\bENOTFOUND\b/i,
  /\bEPERM\b/i,
  /\bENOENT\b/i,
  /\b500\b/,
];

export function getUserFacingErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : "";
  const normalized = String(message || "").trim();

  if (!normalized) return fallback;
  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))) return fallback;
  if (normalized.length > 180) return fallback;

  return normalized;
}
