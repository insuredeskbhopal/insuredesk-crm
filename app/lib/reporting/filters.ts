export function filterRecordsForReport(records, filter) {
  if (!filter) return [];

  if (filter.type === "all") return records;
  if (filter.type === "hasPdf") return records.filter((record) => Boolean(record.hasPdf) === filter.value);
  if (filter.type === "district") return records.filter((record) => (record.district || "Unknown district") === filter.value);
  if (filter.type === "insuranceCompany") return records.filter((record) => (record.insuranceCompany || "Unknown insurer") === filter.value);
  if (filter.type === "policyType") return records.filter((record) => (record.policyType || "Unknown policy type") === filter.value);
  if (filter.type === "recordIds") return records.filter((record) => filter.value.includes(record.id));
  if (filter.type === "missing") return records.filter((record) => !record[filter.value]);
  if (filter.type === "renewal") {
    const today = startOfDay(new Date());
    if (filter.value === "expired") {
      return records.filter((record) => {
        const expiry = parsePolicyDate(record.expiryDate);
        return expiry && expiry < today;
      });
    }
    return records.filter((record) => isExpiringWithin(record, today, Number(filter.value)));
  }

  return [];
}

export function isExpiringWithin(record, today, days) {
  const expiry = parsePolicyDate(record.expiryDate);
  if (!expiry || expiry < today) return false;

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  return expiry <= cutoff;
}

export function parsePolicyDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (match) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = new Date(Number(fullYear), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : startOfDay(date);
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

