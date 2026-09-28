export function parseMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value || "").replace(/,/g, "").trim();
  const direct = Number(cleaned);
  if (!Number.isNaN(direct) && Number.isFinite(direct)) return direct;
  const sanitized = cleaned.replace(/[^0-9.-]/g, "");
  const num = Number(sanitized);
  return !Number.isNaN(num) && Number.isFinite(num) ? num : 0;
}

export function formatMoney(value) {
  const numeric = parseMoney(value);
  if (!numeric) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function calculateReportTotals(records) {
  return {
    totalRecords: records.length,
    totalPremium: records.reduce(
      (sum, record) => sum + parseMoney(record.netPremium || record.totalPremium || record.premium),
      0,
    ),
    totalSumInsured: records.reduce((sum, record) => sum + parseMoney(record.sumInsured), 0),
  };
}
