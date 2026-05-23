import { filterRecordsForReport, isExpiringWithin, parsePolicyDate, startOfDay } from "@/app/lib/reporting/filters";
import { buildOverviewReport } from "@/app/lib/reporting/overview";
import { formatMoney, parseMoney } from "@/app/lib/reporting/totals";

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
  const missingPremium = records.filter((record) => !record.premium);
  const missingExpiry = records.filter((record) => !record.expiryDate);
  const missingContact = records.filter((record) => !record.contactNumber);
  const districts = groupRecords(records, (record) => record.district || "Unknown district", "district");
  const insurers = groupRecords(records, (record) => record.insuranceCompany || "Unknown insurer", "insuranceCompany");
  const policyTypes = groupRecords(records, (record) => record.policyType || "Unknown policy type", "policyType");
  const districtPremium = districts
    .map((item) => ({ ...item, amount: item.premium, hint: `${item.count} polic${item.count === 1 ? "y" : "ies"}` }))
    .sort((a, b) => b.amount - a.amount);
  const highValuePolicies = records
    .slice()
    .sort((a, b) => parseMoney(b.sumInsured) - parseMoney(a.sumInsured))
    .slice(0, 5)
    .map((record) => makeReportItem(
      `high-value-${record.id}`,
      record.policyNumber || record.insuredName || "Policy record",
      formatMoney(record.sumInsured),
      record.insuredName || record.policyType || "High value policy",
      { type: "recordIds", value: [record.id], title: record.policyNumber || "High Value Policy", label: "Single high-value policy record" }
    ));

  return {
    kpis: overview.kpis,
    renewals: [
      makeReportItem("expired", "Already expired", expired.length, "Needs immediate review", { type: "renewal", value: "expired", title: "Expired Policies", label: "Policies with expiry date before today" }),
      makeReportItem("expiring-7", "Expiring in 7 days", expiring7.length, "Urgent follow-up", { type: "renewal", value: "7", title: "Expiring in 7 Days", label: "Policies expiring within 7 days" }),
      makeReportItem("expiring-30", "Expiring in 30 days", expiring30.length, "Renewal pipeline", { type: "renewal", value: "30", title: "Expiring in 30 Days", label: "Policies expiring within 30 days" }),
      makeReportItem("expiring-60", "Expiring in 60 days", expiring60.length, "Upcoming renewals", { type: "renewal", value: "60", title: "Expiring in 60 Days", label: "Policies expiring within 60 days" })
    ],
    pdfDistribution: [
      makeReportItem("pdf-available", "With PDF", pdfRecords.length, "Download available", { type: "hasPdf", value: true, title: "Policies With PDF", label: "Records with PDF documents" }),
      makeReportItem("pdf-missing", "Missing PDF", missingPdf.length, "Document pending", { type: "hasPdf", value: false, title: "Missing PDF", label: "Records without PDF documents" })
    ],
    districts,
    districtPremium,
    insurers,
    policyTypes,
    highValuePolicies,
    customers: clients
      .slice()
      .sort((a, b) => b.premiumTotal - a.premiumTotal)
      .slice(0, 6),
    quality: [
      makeReportItem("quality-pdf", "Missing PDF", missingPdf.length, "Upload document", { type: "hasPdf", value: false, title: "Missing PDF", label: "Policies without PDF documents" }),
      makeReportItem("quality-policy", "Missing policy number", missingPolicyNumber.length, "Fix policy identity", { type: "missing", value: "policyNumber", title: "Missing Policy Number", label: "Records without policy number" }),
      makeReportItem("quality-premium", "Missing premium", missingPremium.length, "Fix financial data", { type: "missing", value: "premium", title: "Missing Premium", label: "Records without premium" }),
      makeReportItem("quality-expiry", "Missing expiry date", missingExpiry.length, "Fix renewal tracking", { type: "missing", value: "expiryDate", title: "Missing Expiry Date", label: "Records without expiry date" }),
      makeReportItem("quality-contact", "Missing contact", missingContact.length, "Fix customer follow-up", { type: "missing", value: "contactNumber", title: "Missing Contact", label: "Records without contact number" })
    ],
    maxDistrictCount: Math.max(1, ...districts.map((item) => item.count)),
    maxDistrictPremium: Math.max(1, ...districtPremium.map((item) => item.amount)),
    maxInsurerCount: Math.max(1, ...insurers.map((item) => item.count)),
    maxPolicyTypeCount: Math.max(1, ...policyTypes.map((item) => item.count))
  };
}


export function getReportRecords(records, report) {
  return filterRecordsForReport(records, report);
}

export function findReportById(records, reportId) {
  const analytics = buildAnalytics(records);
  const groups = [
    analytics.kpis,
    analytics.renewals,
    analytics.pdfDistribution,
    analytics.districts,
    analytics.insurers,
    analytics.districtPremium,
    analytics.policyTypes,
    analytics.customers,
    analytics.quality
  ];

  for (const group of groups) {
    const match = group.find((item) => item.id === reportId);


    if (match) return match;
  }

  return null;
}

function groupRecords(records, getKey, type) {
  const groups = new Map();

  records.forEach((record) => {
    const key = getKey(record);
    const current = groups.get(key) || { records: [], premium: 0, sumInsured: 0 };
    current.records.push(record);
    current.premium += parseMoney(record.premium);
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
        report: { id, type, value: key, title: key, label: `${group.records.length} polic${group.records.length === 1 ? "y" : "ies"}` }
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function makeReportItem(id, label, value, hint, report) {
  return { id, label, value, hint, report: { ...report, id, title: report.title || label } };
}

function buildClientProfiles(records) {
  const profiles = new Map();

  records.forEach((record) => {
    const name = record.insuredName || "Unnamed insured";
    const current = profiles.get(name) || {
      id: `client-${profiles.size}-${name}`,
      name,
      policies: [],
      premiumTotal: 0,
      sumInsuredTotal: 0,
      district: record.district || "",
      tehsil: record.tehsil || "",
      contactNumber: record.contactNumber || ""
    };

    current.policies.push(record);
    current.premiumTotal += parseMoney(record.premium);
    current.sumInsuredTotal += parseMoney(record.sumInsured);
    current.district ||= record.district || "";
    current.tehsil ||= record.tehsil || "";
    current.contactNumber ||= record.contactNumber || "";
    profiles.set(name, current);
  });

  return Array.from(profiles.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export { formatMoney, parseMoney };
