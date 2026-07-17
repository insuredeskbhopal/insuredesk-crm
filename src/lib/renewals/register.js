import { parseRenewalDate } from "./dates";

export const RENEWAL_REGISTER_POLICY_TYPES = [
  ["All", "All policy types"],
  ["Motor", "Motor"],
  ["Fire", "Fire / Warehouse"],
  ["Health", "Health"],
  ["Marine", "Marine"],
  ["Life", "Life"],
  ["Commercial", "Commercial"],
  ["Other", "Other"],
];

export function formatRenewalRegisterDate(value) {
  const date = parseRenewalDate(value);
  if (!date) return value ? String(value) : "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatRenewalRegisterAmount(value) {
  if (value === null || value === undefined || value === "") return "—";
  const numericText = String(value).replace(/[^0-9.-]/g, "");
  if (!/\d/.test(numericText)) return String(value);
  const amount = Number(numericText);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function getRenewalRegisterStatusTone(status) {
  const value = String(status || "unknown").toLowerCase();
  if (value === "renewed" || value === "active") return "success";
  if (value === "expired" || value === "lost") return "danger";
  if (value === "expiry_soon") return "warning";
  return "neutral";
}
