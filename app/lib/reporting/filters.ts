import insuranceCompanyMaster from "@/lib/master/insurance-companies.cjs";

const { normalizeInsuranceCompanyName } = insuranceCompanyMaster;

export function filterRecordsForReport(records, filter) {
  if (!filter) return [];

  if (filter.type === "all") return records;
  if (filter.type === "hasPdf") return records.filter((record) => Boolean(record.hasPdf) === filter.value);
  if (filter.type === "district")
    return records.filter((record) => (record.district || "Unknown district") === filter.value);
  if (filter.type === "insuranceCompany") {
    return records.filter(
      (record) => normalizeInsuranceCompanyReportName(record.insuranceCompany) === filter.value,
    );
  }
  if (filter.type === "policyType")
    return records.filter((record) => (record.policyType || "Unknown policy type") === filter.value);
  if (filter.type === "customerName")
    return records.filter((record) => (record.insuredName || "Unnamed insured") === filter.value);
  if (filter.type === "recordIds") return records.filter((record) => filter.value.includes(record.id));
  if (filter.type === "missing") return records.filter((record) => !record[filter.value]);
  if (filter.type === "policyFamily") {
    return records.filter(
      (record) => (FAMILY_LABELS[getRecordFamily(record)] || "Other Policies") === filter.value,
    );
  }
  if (filter.type === "makeModel") {
    return records.filter((record) => {
      const rawMake =
        String(record.makeModel || "")
          .trim()
          .split(/\s+/)[0] || "Unknown";
      const make = rawMake.charAt(0).toUpperCase() + rawMake.slice(1).toLowerCase();
      return make === filter.value;
    });
  }
  if (filter.type === "vehicleType") {
    return records.filter((record) => (record.policyType || "Unknown Motor Type") === filter.value);
  }
  if (filter.type === "ncbBracket") {
    return records.filter((record) => {
      const ncbDigits = String(record.ncb || "").replace(/[^0-9]/g, "");
      const ncbVal = ncbDigits ? parseInt(ncbDigits, 10) : 0;
      const bracket = ncbVal > 0 ? `${ncbVal}% NCB` : "0% / No NCB";
      return bracket === filter.value;
    });
  }
  if (filter.type === "tehsil") {
    return records.filter((record) => (record.tehsil || "Unknown tehsil") === filter.value);
  }
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

export const FAMILY_LABELS = {
  motor: "Motor Policy",
  fire: "Fire Policy",
  health: "Health Policy",
  life: "Life Policy",
  home: "Home Policy",
  cyber: "Cyber Policy",
  misc: "Other Policies",
};

export function normalizeInsuranceCompanyReportName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown insurer";
  return normalizeInsuranceCompanyName(raw) || raw.replace(/\s+/g, " ");
}

export function getRecordFamily(record) {
  const policyType = (record.policyType || "").toLowerCase();
  const sourceFile = (record.sourceFile || "").toLowerCase();
  const description = (record.description || "").toLowerCase();
  const haystack = `${policyType} ${sourceFile} ${description}`;

  // 1. Motor Check
  const hasMotorSignals =
    record.vehicleNumber ||
    record.registrationNumber ||
    record.engineNumber ||
    record.chassisNumber ||
    record.idv ||
    record.ncb ||
    record.policyCoverType ||
    record.makeModel ||
    /\b(motor|private car|two wheeler|bike|scooter|commercial vehicle|taxi|cab|bus|chassis|engine|fleet)\b/i.test(
      haystack,
    );
  if (hasMotorSignals) return "motor";

  // 2. Fire Check
  if (/\b(sfsp|fire|burglary|msme|warehouse|stock|property|contents)\b/i.test(haystack)) return "fire";

  // 3. Health Check
  if (/\b(health|mediclaim|hospital|family floater|tpa|floater)\b/i.test(haystack)) return "health";

  // 4. Life Check
  if (/\b(term life|endowment|life policy|life assured|nominee)\b/i.test(haystack)) return "life";

  // 5. Home Check
  if (/\b(home building|home contents|home policy)\b/i.test(haystack)) return "home";

  // 6. Cyber Check
  if (/\b(cyber|ransomware|data breach|network security)\b/i.test(haystack)) return "cyber";

  // 7. Misc Check
  if (/\b(marine|travel|liability)\b/i.test(haystack)) return "misc";

  // Fallbacks: If district/tehsil/riskLocation is present, default to fire
  if (record.district || record.tehsil || record.riskLocation) {
    return "fire";
  }

  return "misc";
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
