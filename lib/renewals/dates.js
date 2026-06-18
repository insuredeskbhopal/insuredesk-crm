import { startOfDay } from "@/app/lib/reporting/filters";

export function parseRenewalDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = new Date(Number(fullYear), Number(month) - 1, Number(day));
    if (
      date.getFullYear() !== Number(fullYear) ||
      date.getMonth() !== Number(month) - 1 ||
      date.getDate() !== Number(day)
    ) {
      return null;
    }
    return startOfDay(date);
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
}

export function getExpiryState(value) {
  if (!String(value || "").trim()) return "missing";
  return parseRenewalDate(value) ? "valid" : "invalid";
}

export function getDaysStatus(value) {
  if (!String(value || "").trim()) return "Missing Expiry Date";
  const expiry = parseRenewalDate(value);
  if (!expiry) return "Invalid Expiry Date";
  const diffDays = calculateDaysLeft(value);
  if (diffDays === null) return "Invalid Expiry Date";
  if (diffDays < 0) {
    return `Overdue ${Math.abs(diffDays)} Day${Math.abs(diffDays) === 1 ? "" : "s"}`;
  }
  if (diffDays === 0) return "Due Today";
  if (diffDays <= 7) return `Due Soon (${diffDays} Day${diffDays === 1 ? "" : "s"})`;
  return `${diffDays} Day${diffDays === 1 ? "" : "s"} Left`;
}

export function calculateDaysLeft(expiryDate) {
  if (!expiryDate) return null;

  const expiry = parseRenewalDate(expiryDate);
  if (!expiry) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  expiry.setHours(0, 0, 0, 0);

  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

export function calculateRenewalStatus(expiryDate, manualStatus = "") {
  const manual = String(manualStatus || "")
    .toLowerCase()
    .trim();

  if (manual === "renewed") return "renewed";
  if (manual === "lost") return "lost";

  if (!expiryDate) return "unknown";

  const expiry = parseRenewalDate(expiryDate);
  if (!expiry) return "unknown";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiry_soon";

  return "active";
}

export function isRenewalWindowPolicy(policy = {}, _referenceDate = new Date()) {
  const status = normalizeRenewalStatus(policy.renewalStatus);
  if (["RENEWED", "LOST", "NOT_INTERESTED", "WRONG_NUMBER", "RENEWED_ELSEWHERE"].includes(status))
    return true;
  const daysLeft = policy.daysRemaining ?? policy.daysLeft ?? calculateDaysLeft(policy.expiryDate);
  return Number.isFinite(Number(daysLeft)) && Number(daysLeft) >= -30 && Number(daysLeft) <= 30;
}

export function normalizeRenewalStatus(value = "") {
  return String(value || "ACTIVE")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function getComputedRenewalStatus(policy = {}, _referenceDate = new Date()) {
  const status = normalizeRenewalStatus(policy.renewalStatus);
  return calculateRenewalStatus(policy.expiryDate, status).toUpperCase();
}

export function getDaysLeftText(daysLeft) {
  if (!Number.isFinite(Number(daysLeft))) return "-";
  const days = Number(daysLeft);
  return `${days} day${Math.abs(days) === 1 ? "" : "s"}`;
}

export function sortByDaysLeftAscending(a = {}, b = {}) {
  const aDays = Number(a.daysRemaining ?? a.daysLeft);
  const bDays = Number(b.daysRemaining ?? b.daysLeft);
  const safeA = Number.isFinite(aDays) ? aDays : Number.POSITIVE_INFINITY;
  const safeB = Number.isFinite(bDays) ? bDays : Number.POSITIVE_INFINITY;
  return safeA - safeB;
}

export function withRenewalWindowDisplay(policy = {}, referenceDate = new Date()) {
  const daysLeft = calculateDaysLeft(policy.expiryDate);
  return {
    ...policy,
    daysLeft,
    daysRemaining: daysLeft,
    renewalStatus: getComputedRenewalStatus({ ...policy, daysRemaining: daysLeft }, referenceDate),
  };
}
