import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";

export function sanitizeClientAccountPayload(payload = {}) {
  return {
    name: asText(payload.name, 220),
    phone: normalizePhone(payload.phone),
    email: asText(payload.email, 180),
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

function normalizePhone(value) {
  return (
    normalizeIndianPhone(value) ||
    String(value || "")
      .replace(/\D/g, "")
      .slice(0, 10)
  );
}

function asText(value, limit) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
