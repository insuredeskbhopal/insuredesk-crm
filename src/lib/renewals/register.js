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

export const RENEWAL_REGISTER_CATEGORY_TABS = [
  { value: "All", label: "All Renewals", countKey: "all" },
  { value: "Motor", label: "Motor Policy", countKey: "motor" },
  { value: "Fire", label: "Warehouse Policy", countKey: "warehouse" },
  { value: "Other", label: "Other Policies", countKey: "other" },
];

export const RENEWAL_REGISTER_MONTHS = [
  ["All", "All renewal months"],
  ...Array.from({ length: 12 }, (_, index) => [
    String(index + 1),
    new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date(2026, index, 1)),
  ]),
];

export function normalizeRenewalRegisterMonth(value) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? String(month) : "All";
}

export function getRenewalRegisterMonthLabel(value) {
  const normalized = normalizeRenewalRegisterMonth(value);
  return RENEWAL_REGISTER_MONTHS.find(([month]) => month === normalized)?.[1] || "";
}

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
