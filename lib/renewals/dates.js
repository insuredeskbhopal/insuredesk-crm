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
  const today = startOfDay(new Date());
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return `Overdue ${Math.abs(diffDays)} Day${Math.abs(diffDays) === 1 ? "" : "s"}`;
  }
  if (diffDays === 0) return "Due Today";
  if (diffDays <= 7) return `Due Soon (${diffDays} Day${diffDays === 1 ? "" : "s"})`;
  return `${diffDays} Day${diffDays === 1 ? "" : "s"} Left`;
}
