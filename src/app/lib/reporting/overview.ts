import { calculateReportTotals, formatMoney } from "./totals";

export function buildOverviewReport(records, clients = buildClientSummaries(records)) {
  const totals = calculateReportTotals(records);
  const pdfRecords = records.filter((record) => record.hasPdf);
  const missingPdf = records.filter((record) => !record.hasPdf);

  return {
    title: "Overview",
    filter: { type: "all", title: "All Policies", label: "All saved policy records" },
    ...totals,
    records,
    chartData: [],
    kpis: [
      makeKpi("policies", "Total Policies", records.length, "All saved policy records", {
        type: "all",
        title: "All Policies",
        label: "All saved policy records",
      }),
      makeKpi("premium", "Total Premium", formatMoney(totals.totalPremium), "Premium across all records", {
        type: "all",
        title: "All Premium Records",
        label: "All records used for total premium",
      }),
      makeKpi(
        "sum-insured",
        "Total Sum Insured",
        formatMoney(totals.totalSumInsured),
        "Insured value across all records",
        { type: "all", title: "All Sum Insured Records", label: "All records used for sum insured" },
      ),
      makeKpi("clients", "Active Clients", clients.length, "Customers with saved policies", {
        type: "all",
        title: "All Client Policies",
        label: "All policies grouped under clients",
      }),
      makeKpi("with-pdf", "Policies With PDF", pdfRecords.length, "Documents available to download", {
        type: "hasPdf",
        value: true,
        title: "Policies With PDF",
        label: "Records that have PDF files",
      }),
      makeKpi("missing-pdf", "Missing PDF", missingPdf.length, "Needs document follow-up", {
        type: "hasPdf",
        value: false,
        title: "Policies Missing PDF",
        label: "Records without PDF files",
      }),
    ],
  };
}

function makeKpi(id, label, value, hint, report) {
  return { id, label, value, hint, report: { ...report, id, title: report.title || label } };
}

function buildClientSummaries(records) {
  const profiles = new Map();

  records.forEach((record) => {
    const name = record.insuredName || "Unnamed insured";
    profiles.set(name, true);
  });

  return Array.from(profiles.keys());
}
