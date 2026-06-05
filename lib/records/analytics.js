import { filterRecordsForReport, isExpiringWithin, parsePolicyDate, startOfDay, FAMILY_LABELS, getRecordFamily, normalizeInsuranceCompanyReportName } from "@/app/lib/reporting/filters";
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
  const missingPremium = records.filter((record) => !getReportPremiumValue(record));
  const missingExpiry = records.filter((record) => !record.expiryDate);
  const missingContact = records.filter((record) => !record.contactNumber);

  // Group policy families
  const policyFamilies = groupRecords(records, (record) => FAMILY_LABELS[getRecordFamily(record)] || "Other Policies", "policyFamily");
  const familyPremium = policyFamilies
    .map((item) => ({ ...item, amount: item.premium, hint: `${item.count} polic${item.count === 1 ? "y" : "ies"}` }))
    .sort((a, b) => b.amount - a.amount);

  // Group motor specific stats
  const motorRecords = records.filter((r) => getRecordFamily(r) === "motor");
  const makeModels = groupRecords(motorRecords, (record) => {
    const rawMake = String(record.makeModel || "").trim().split(/\s+/)[0] || "Unknown";
    return rawMake.charAt(0).toUpperCase() + rawMake.slice(1).toLowerCase();
  }, "makeModel");
  const vehicleTypes = groupRecords(motorRecords, (record) => record.policyType || "Unknown Motor Type", "vehicleType");
  const ncbBrackets = groupRecords(motorRecords, (record) => {
    const ncbDigits = String(record.ncb || "").replace(/[^0-9]/g, "");
    const ncbVal = ncbDigits ? parseInt(ncbDigits, 10) : 0;
    return ncbVal > 0 ? `${ncbVal}% NCB` : "0% / No NCB";
  }, "ncbBracket");

  // Group fire specific stats
  const fireRecords = records.filter((r) => getRecordFamily(r) === "fire");
  const districts = groupRecords(fireRecords, (record) => record.district || "Unknown district", "district");
  const districtPremium = districts
    .map((item) => ({ ...item, amount: item.premium, hint: `${item.count} polic${item.count === 1 ? "y" : "ies"}` }))
    .sort((a, b) => b.amount - a.amount);
  const tehsils = groupRecords(fireRecords, (record) => record.tehsil || "Unknown tehsil", "tehsil");

  const insurers = groupRecords(records, (record) => normalizeInsuranceCompanyReportName(record.insuranceCompany), "insuranceCompany");
  const policyTypes = groupRecords(records, (record) => record.policyType || "Unknown policy type", "policyType");
  
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
    policyFamilies,
    familyPremium,
    makeModels,
    vehicleTypes,
    ncbBrackets,
    districts,
    districtPremium,
    tehsils,
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
    maxTehsilCount: Math.max(1, ...tehsils.map((item) => item.count)),
    maxInsurerCount: Math.max(1, ...insurers.map((item) => item.count)),
    maxPolicyTypeCount: Math.max(1, ...policyTypes.map((item) => item.count)),
    maxFamilyCount: Math.max(1, ...policyFamilies.map((item) => item.count)),
    maxFamilyPremium: Math.max(1, ...familyPremium.map((item) => item.amount)),
    maxMakeModelCount: Math.max(1, ...makeModels.map((item) => item.count)),
    maxVehicleTypeCount: Math.max(1, ...vehicleTypes.map((item) => item.count)),
    maxNcbBracketCount: Math.max(1, ...ncbBrackets.map((item) => item.count))
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
    analytics.policyFamilies,
    analytics.familyPremium,
    analytics.makeModels,
    analytics.vehicleTypes,
    analytics.ncbBrackets,
    analytics.districts,
    analytics.districtPremium,
    analytics.tehsils,
    analytics.insurers,
    analytics.policyTypes,
    analytics.highValuePolicies,
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
        label: "Customer policy portfolio"
      }
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

function getReportPremiumValue(record = {}) {
  return record.netPremium || record.totalPremium || record.premium || "";
}

export { formatMoney, parseMoney };
