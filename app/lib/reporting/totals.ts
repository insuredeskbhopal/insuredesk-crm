export function parseMoney(value) {
  if (typeof value === "number") return value;
  return Number(String(value || "").replace(/,/g, "")) || 0;
}

export function formatMoney(value) {
  const numeric = parseMoney(value);
  if (!numeric) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(numeric);
}

export function calculateReportTotals(records) {
  return {
    totalRecords: records.length,
    totalPremium: records.reduce((sum, record) => sum + parseMoney(record.premium), 0),
    totalSumInsured: records.reduce((sum, record) => sum + parseMoney(record.sumInsured), 0)
  };
}

