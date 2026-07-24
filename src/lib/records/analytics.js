import {
  filterRecordsForReport,
  isExpiringWithin,
  parsePolicyDate,
  startOfDay,
  FAMILY_LABELS,
  getRecordFamily,
  normalizeInsuranceCompanyReportName,
} from "@/app/lib/reporting/filters";
import { buildOverviewReport } from "@/app/lib/reporting/overview";
import { formatMoney, parseMoney } from "@/app/lib/reporting/totals";

function getReportPremiumValue(record = {}) {
  return record.netPremium || record.totalPremium || record.premium || "";
}

function makeReportItem(id, label, value, hint, report) {
  return { id, label, value, hint, report: { ...report, id, title: report.title || label } };
}

function groupRecords(records, getKey, type) {
  const groups = new Map();

  records.forEach((record) => {
    const key = getKey(record);
    const current = groups.get(key) || { records: [], premium: 0, sumInsured: 0 };
    current.records.push(record);
    current.premium += parseMoney(getReportPremiumValue(record));
    current.sumInsured += parseMoney(record.sumInsured);
    groups.set(key, current);
  });

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const id = `${type}-${key}`;
      return {
        id,
        label: key,
        count: group.records.length,
        value: group.records.length,
        premium: group.premium,
        sumInsured: group.sumInsured,
        hint: formatMoney(group.premium),
        report: {
          id,
          type,
          value: key,
          title: key,
          label: `${group.records.length} polic${group.records.length === 1 ? "y" : "ies"}`,
        },
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildClientProfiles(records) {
  const profiles = new Map();

  records.forEach((record) => {
    const name = record.insuredName || "Unnamed insured";
    const id = `customer-${name}`;
    const current = profiles.get(name) || {
      id,
      name,
      policies: [],
      premiumTotal: 0,
      sumInsuredTotal: 0,
      district: record.district || "",
      tehsil: record.tehsil || "",
      contactNumber: record.contactNumber || "",
      report: {
        id,
        type: "customerName",
        value: name,
        title: name,
        label: "Customer policy portfolio",
      },
    };

    current.policies.push(record);
    current.premiumTotal += parseMoney(getReportPremiumValue(record));
    current.sumInsuredTotal += parseMoney(record.sumInsured);
    current.district ||= record.district || "";
    current.tehsil ||= record.tehsil || "";
    current.contactNumber ||= record.contactNumber || "";
    profiles.set(name, current);
  });

  return Array.from(profiles.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function buildAnalytics(records) {
  const clients = buildClientProfiles(records);
  const overview = buildOverviewReport(records, clients);
  const pdfRecords = records.filter((record) => record.hasPdf);
  const today = startOfDay(new Date());
  const expired = records.filter((record) => {
    const expiry = parsePolicyDate(record.expiryDate);
    return expiry && expiry < today;
  });
  const expiring7 = records.filter((record) => isExpiringWithin(record, today, 7));
  const expiring30 = records.filter((record) => isExpiringWithin(record, today, 30));
  const expiring60 = records.filter((record) => isExpiringWithin(record, today, 60));
  const missingPdf = records.filter((record) => !record.hasPdf);
  const missingPolicyNumber = records.filter((record) => !record.policyNumber);
  const missingPremium = records.filter((record) => !getReportPremiumValue(record));
  const missingExpiry = records.filter((record) => !record.expiryDate);
  const missingContact = records.filter((record) => !record.contactNumber);

  // Group policy families
  const policyFamilies = groupRecords(
    records,
    (record) => FAMILY_LABELS[getRecordFamily(record)] || "Other Policies",
    "policyFamily",
  );
  const familyPremium = policyFamilies
    .map((item) => ({
      ...item,
      amount: item.premium,
      hint: `${item.count} polic${item.count === 1 ? "y" : "ies"}`,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Group motor specific stats
  const motorRecords = records.filter((r) => getRecordFamily(r) === "motor");
  const makeModels = groupRecords(
    motorRecords,
    (record) => {
      const rawMake =
        String(record.makeModel || "")
          .trim()
          .split(/\s+/)[0] || "Unknown";
      return rawMake.charAt(0).toUpperCase() + rawMake.slice(1).toLowerCase();
    },
    "makeModel",
  );
  const vehicleTypes = groupRecords(
    motorRecords,
    (record) => record.policyType || "Unknown Motor Type",
    "vehicleType",
  );
  const ncbBrackets = groupRecords(
    motorRecords,
    (record) => {
      const ncbDigits = String(record.ncb || "").replace(/[^0-9]/g, "");
      const ncbVal = ncbDigits ? parseInt(ncbDigits, 10) : 0;
      return ncbVal > 0 ? `${ncbVal}% NCB` : "0% / No NCB";
    },
    "ncbBracket",
  );

  // Group fire specific stats
  const fireRecords = records.filter((r) => getRecordFamily(r) === "fire");
  const districts = groupRecords(fireRecords, (record) => record.district || "Unknown district", "district");
  const districtPremium = districts
    .map((item) => ({
      ...item,
      amount: item.premium,
      hint: `${item.count} polic${item.count === 1 ? "y" : "ies"}`,
    }))
    .sort((a, b) => b.amount - a.amount);
  const tehsils = groupRecords(fireRecords, (record) => record.tehsil || "Unknown tehsil", "tehsil");

  const insurers = groupRecords(
    records,
    (record) => normalizeInsuranceCompanyReportName(record.insuranceCompany),
    "insuranceCompany",
  );
  const policyTypes = groupRecords(
    records,
    (record) => record.policyType || "Unknown policy type",
    "policyType",
  );

  const highValuePolicies = records
    .slice()
    .sort((a, b) => parseMoney(b.sumInsured) - parseMoney(a.sumInsured))
    .slice(0, 5)
    .map((record) =>
      makeReportItem(
        `high-val-${record.id}`,
        record.insuredName || "Unnamed insured",
        parseMoney(record.sumInsured),
        record.policyNumber || "No policy number",
        {
          id: `high-val-${record.id}`,
          type: "policyNumber",
          value: record.policyNumber,
          title: record.insuredName || "High-value policy",
          label: "Policy details",
        },
      ),
    );

  const keyMetricReports = [
    makeReportItem("total-policies", "Total Policies", records.length, "All stored policies", {
      type: "all",
      title: "All Policies",
      label: "Complete policy list",
    }),

    makeReportItem("active-policies", "Active Policies", records.length - expired.length, "Currently in-force", {
      type: "active",
      title: "Active Policies",
      label: "In-force policies",
    }),

    makeReportItem("expired-policies", "Expired Policies", expired.length, "Requires renewal review", {
      type: "expired",
      title: "Expired Policies",
      label: "Expired policy list",
    }),

    makeReportItem("pdf-coverage", "PDF Available", pdfRecords.length, "Source document linked", {
      type: "pdf",
      title: "Policies with PDF",
      label: "Verified document list",
    }),
  ];

  const actionReports = [
    makeReportItem("expiring-7-action", "Renew 7-Day Expiring", expiring7.length, "High priority outreach", {
      type: "expiring-7",
      title: "Expiring within 7 Days",
      label: "Urgent renewals",
    }),

    makeReportItem("expiring-30-action", "Prepare 30-Day Renewals", expiring30.length, "Standard renewal workflow", {
      type: "expiring-30",
      title: "Expiring within 30 Days",
      label: "Upcoming renewals",
    }),

    makeReportItem("missing-policy-num", "Missing Policy No.", missingPolicyNumber.length, "Data cleanup required", {
      type: "missing-policy-number",
      title: "Missing Policy Numbers",
      label: "Incomplete records",
    }),

    makeReportItem("missing-premium-val", "Missing Premium", missingPremium.length, "Financial record update", {
      type: "missing-premium",
      title: "Missing Premium Values",
      label: "Financial data cleanup",
    }),
  ];

  return {
    overview,
    keyMetricReports,
    actionReports,
    policyFamilies,
    familyPremium,
    insurers,
    policyTypes,
    highValuePolicies,

    motor: {
      makeModels,
      vehicleTypes,
      ncbBrackets,
    },

    fire: {
      districts,
      districtPremium,
      tehsils,
    },

    quality: {
      missingPdf: missingPdf.length,
      missingPolicyNumber: missingPolicyNumber.length,
      missingPremium: missingPremium.length,
      missingExpiry: missingExpiry.length,
      missingContact: missingContact.length,
    },

    expiry: {
      expired: expired.length,
      expiring7: expiring7.length,
      expiring30: expiring30.length,
      expiring60: expiring60.length,
    },
  };
}

export function findReportById(records, reportId) {
  const analytics = buildAnalytics(records);

  const collections = [
    analytics.keyMetricReports,
    analytics.actionReports,
    analytics.policyFamilies,
    analytics.familyPremium,
    analytics.insurers,
    analytics.policyTypes,
    analytics.highValuePolicies,
    analytics.motor?.makeModels,
    analytics.motor?.vehicleTypes,
    analytics.motor?.ncbBrackets,
    analytics.fire?.districts,
    analytics.fire?.districtPremium,
    analytics.fire?.tehsils,
  ].filter(Boolean);

  for (const list of collections) {
    const found = list.find((item) => item.id === reportId || item.report?.id === reportId);
    if (found) return found;
  }

  return null;
}

export function getReportRecords(records, report) {
  if (!report) return records;
  const { type, value } = report;

  if (!type || type === "all") return records;

  const today = startOfDay(new Date());

  if (type === "active") {
    return records.filter((r) => {
      const exp = parsePolicyDate(r.expiryDate);
      return !exp || exp >= today;
    });
  }

  if (type === "expired") {
    return records.filter((r) => {
      const exp = parsePolicyDate(r.expiryDate);
      return exp && exp < today;
    });
  }

  if (type === "pdf") {
    return records.filter((r) => r.hasPdf);
  }

  if (type === "expiring-7") {
    return records.filter((r) => isExpiringWithin(r, today, 7));
  }

  if (type === "expiring-30") {
    return records.filter((r) => isExpiringWithin(r, today, 30));
  }

  if (type === "missing-policy-number") {
    return records.filter((r) => !r.policyNumber);
  }

  if (type === "missing-premium") {
    return records.filter((r) => !getReportPremiumValue(r));
  }

  if (type === "insuranceCompany") {
    return records.filter((r) => normalizeInsuranceCompanyReportName(r.insuranceCompany) === value);
  }

  if (type === "policyType") {
    return records.filter((r) => (r.policyType || "Unknown policy type") === value);
  }

  if (type === "policyFamily") {
    return records.filter((r) => (FAMILY_LABELS[getRecordFamily(r)] || "Other Policies") === value);
  }

  if (type === "customerName") {
    return records.filter((r) => (r.insuredName || "Unnamed insured") === value);
  }

  if (type === "district") {
    return records.filter((r) => (r.district || "Unknown district") === value);
  }

  if (type === "tehsil") {
    return records.filter((r) => (r.tehsil || "Unknown tehsil") === value);
  }

  if (type === "makeModel") {
    return records.filter((r) => {
      const rawMake = String(r.makeModel || "").trim().split(/\s+/)[0] || "Unknown";
      const normalized = rawMake.charAt(0).toUpperCase() + rawMake.slice(1).toLowerCase();
      return normalized === value;
    });
  }

  if (type === "vehicleType") {
    return records.filter((r) => (r.policyType || "Unknown Motor Type") === value);
  }

  if (type === "ncbBracket") {
    return records.filter((r) => {
      const ncbDigits = String(r.ncb || "").replace(/[^0-9]/g, "");
      const ncbVal = ncbDigits ? parseInt(ncbDigits, 10) : 0;
      const bracket = ncbVal > 0 ? `${ncbVal}% NCB` : "0% / No NCB";
      return bracket === value;
    });
  }

  return records;
}

export { formatMoney, parseMoney };
