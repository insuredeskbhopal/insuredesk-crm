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
    clientCode: account.clientCode || "",
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

export function normalizeClientCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^BHQ-\d{4,}$/.test(code) ? code : "";
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

function tokenizeName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/^\s*(?:m\/s|mr|mrs|miss|ms)\.?\s+/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

export function scoreClientNameSimilarity(nameA, nameB) {
  const aNorm = normalizeName(nameA);
  const bNorm = normalizeName(nameB);
  if (!aNorm || !bNorm) return 0;
  if (aNorm === bNorm) return 1;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return 0.85;

  const tokensA = new Set(tokenizeName(nameA));
  const tokensB = new Set(tokenizeName(nameB));
  if (!tokensA.size || !tokensB.size) return 0;

  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }
  return overlap / Math.max(tokensA.size, tokensB.size);
}

export function findPhoneIdentityCandidates(profiles = [], { insuredName, contactNumber, email } = {}) {
  const normalizedPhone = normalizePhone(contactNumber);
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const uniqueProfiles = Array.from(
    new Map((profiles || []).filter((p) => p?.id).map((p) => [p.id, p])).values(),
  );

  const exactMatches = uniqueProfiles.filter((profile) =>
    matchesClientAccountIdentity(profile, { insuredName, contactNumber, email }),
  );
  if (exactMatches.length === 1) {
    return {
      status: "EXACT_MATCH",
      exactMatch: exactMatches[0],
      candidates: exactMatches,
      conflicts: [],
    };
  }
  if (exactMatches.length > 1) {
    return {
      status: "AMBIGUOUS_EXACT_MATCH",
      exactMatch: null,
      candidates: exactMatches,
      conflicts: exactMatches,
    };
  }

  const sameContactAccounts = uniqueProfiles
    .filter((profile) => {
      const phoneMatches = normalizedPhone && normalizePhone(profile.phone) === normalizedPhone;
      const emailMatches =
        normalizedEmail &&
        [profile.email, profile.googleEmail].some(
          (candidate) => String(candidate || "").trim().toLowerCase() === normalizedEmail,
        );
      return Boolean(phoneMatches || emailMatches);
    })
    .map((profile) => ({
      ...profile,
      similarityScore: scoreClientNameSimilarity(profile.name, insuredName),
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);

  if (sameContactAccounts.length === 0) {
    return { status: "NONE", exactMatch: null, candidates: [], conflicts: [] };
  }

  const probable = sameContactAccounts.filter((item) => item.similarityScore >= 0.5);
  return {
    status: probable.length > 0 ? "PROBABLE_MATCH" : "PHONE_CONFLICT",
    exactMatch: null,
    candidates: probable,
    conflicts: sameContactAccounts,
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
