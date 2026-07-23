import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";

export function sanitizeClientAccountPayload(payload = {}) {
  return {
    name: asText(payload.name, 220),
    phone: normalizePhone(payload.phone),
    email: asText(payload.email, 180).toLowerCase(),
  };
}

export function serializeClientAccount(account) {
  return {
    id: account.id,
    name: account.name,
    phone: account.phone,
    email: account.email || "",
    googleEmail: account.googleEmail || "",
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    createdBy: account.createdBy?.name || account.createdBy?.email || "",
    updatedBy: account.updatedBy?.name || account.updatedBy?.email || "",
  };
}

export function normalizeClientPhone(value) {
  return normalizePhone(value);
}

export function isValidClientEmail(value) {
  const email = String(value || "").trim();
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function matchesClientAccountIdentity(profile, { insuredName, contactNumber, email } = {}) {
  const expectedName = normalizeName(insuredName);
  if (!expectedName || normalizeName(profile?.name) !== expectedName) return false;

  const expectedPhone = normalizePhone(contactNumber);
  const phoneMatches = expectedPhone && normalizePhone(profile?.phone) === expectedPhone;
  const expectedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const emailMatches =
    expectedEmail &&
    [profile?.email, profile?.googleEmail].some(
      (candidate) =>
        String(candidate || "")
          .trim()
          .toLowerCase() === expectedEmail,
    );

  return Boolean(phoneMatches || emailMatches);
}

export function findUniqueClientIdentityMatch(profiles, identity) {
  const matches = new Map();
  for (const profile of profiles || []) {
    if (matchesClientAccountIdentity(profile, identity)) matches.set(profile.id, profile);
  }
  return {
    match: matches.size === 1 ? matches.values().next().value : null,
    matchCount: matches.size,
  };
}

export function attachClientIdRequestToMatchingUploads(uploads = [], sourceUpload, requestId) {
  if (!requestId || !sourceUpload) return uploads;
  const source = sourceUpload.reviewedData || sourceUpload.extractedData || {};
  const sourceName = normalizeName(source.insuredName);
  const sourcePhone = normalizePhone(source.contactNumber || source.customerMobile);
  if (!sourceName || sourcePhone.length !== 10) return uploads;

  return uploads.map((upload) => {
    const data = upload.reviewedData || upload.extractedData || {};
    const manualFields = upload.manualFields || [];
    if (
      (manualFields.includes("clientId") && data.clientId) ||
      (manualFields.includes("clientIdRequestId") && data.clientIdRequestId) ||
      normalizeName(data.insuredName) !== sourceName ||
      normalizePhone(data.contactNumber || data.customerMobile) !== sourcePhone
    ) {
      return upload;
    }

    return {
      ...upload,
      extractedData: { ...(upload.extractedData || {}), clientIdRequestId: requestId },
      manualFields: [...new Set([...(upload.manualFields || []), "clientIdRequestId"])],
    };
  });
}

export function getConfirmedClientId(upload) {
  if (!upload?.manualFields?.includes("clientId")) return "";
  const data = upload.reviewedData || upload.extractedData || {};
  return String(data.clientId || "").trim();
}

function normalizePhone(value) {
  return (
    normalizeIndianPhone(value) ||
    String(value || "")
      .replace(/\D/g, "")
      .slice(0, 10)
  );
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/^\s*(?:m\/s|mr|mrs|miss|ms)\.?\s+/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function asText(value, limit) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
