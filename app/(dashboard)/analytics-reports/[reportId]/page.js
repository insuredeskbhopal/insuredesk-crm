export const dynamic = "force-dynamic";

import Link from "next/link";
import { normalizeRecord } from "@/lib/records";
import { loadScopedPolicyRecords } from "@/lib/records/scoped-data";
import { findReportById, getReportRecords, formatMoney } from "@/lib/records/analytics";
import RecordsTable from "@/app/components/RecordsTable";

export default async function AnalyticsReportPage({ params }) {
  const { reportId } = await params;
  const normalizedReportId = decodeURIComponent(reportId);

  const records = await loadScopedPolicyRecords();

  const normalizedRecords = records.map(normalizeRecord);
  const report = findReportById(normalizedRecords, normalizedReportId) || findReportById(normalizedRecords, reportId);

  if (!report) {
    return (
      <main className="state-page" style={{ minHeight: "calc(100vh - 200px)" }}>
        <section className="state-card error-state">
          <div className="state-icon">⚠️</div>
          <p className="eyebrow">Report not found</p>
          <h1>Unknown analytics report</h1>
          <p>The requested report ID does not match any available dashboard report.</p>
          <Link className="primary-action" href="/analytics-reports">Back to Analytics</Link>
        </section>
      </main>
    );
  }

  const reportFilter = report.report || report;
  const matchingRecords = getReportRecords(normalizedRecords, reportFilter);
  const totalPremium = matchingRecords.reduce((sum, record) => sum + parseMoneyValue(record.premium), 0);
  const totalSumInsured = matchingRecords.reduce((sum, record) => sum + parseMoneyValue(record.sumInsured), 0);
  const pdfCount = matchingRecords.filter((record) => record.hasPdf).length;
  const latestRecord = matchingRecords
    .slice()
    .sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime())[0];
  const pageTitle = reportFilter.title || report.label || report.name || "Analytics Report";
  const pageDescription = reportFilter.label || report.hint || "Matching policy records";
  const contextItems = buildContextItems(reportFilter, matchingRecords, latestRecord);

  return (
    <main className="analytics-report-page">
      <section className="glass-panel report-detail-card">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Analytics Report</p>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
          </div>
          <div className="title-actions">
            {reportFilter.type === "customerName" ? (
              <Link className="secondary-action" href={`/customer-management/${encodeURIComponent(reportFilter.value)}`}>
                Open Customer
              </Link>
            ) : null}
            {reportFilter.type === "recordIds" && matchingRecords[0] ? (
              <Link
                className="secondary-action"
                href={`/customer-management/${encodeURIComponent(matchingRecords[0].insuredName || "")}/policy/${matchingRecords[0].id}`}
              >
                Open Policy
              </Link>
            ) : null}
            <Link className="secondary-action" href="/analytics-reports">
              Back to Analytics
            </Link>
          </div>
        </div>

        <div className="report-summary-grid">
          <div className="metric-card">
            <span>Matching policies</span>
            <strong>{matchingRecords.length}</strong>
          </div>
          <div className="metric-card">
            <span>Premium total</span>
            <strong>{formatMoney(totalPremium)}</strong>
          </div>
          <div className="metric-card">
            <span>Sum insured</span>
            <strong>{formatMoney(totalSumInsured)}</strong>
          </div>
          <div className="metric-card">
            <span>PDF available</span>
            <strong>{pdfCount}</strong>
          </div>
        </div>
      </section>

      <section className="glass-panel report-detail-card">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Report Logic</p>
            <h2>How this page is filtered</h2>
          </div>
        </div>
        <div className="report-context-grid">
          {contextItems.map((item) => (
            <div className="metric-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel report-detail-table">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Policy Records</p>
            <h2>Report records</h2>
          </div>
        </div>
        <RecordsTable records={matchingRecords} />
      </section>
    </main>
  );
}

function parseMoneyValue(value) {
  return Number(String(value || "").replace(/,/g, "")) || 0;
}

function buildContextItems(report, records, latestRecord) {
  const filterValue = report.value === undefined || report.value === null ? "All records" : String(report.value);
  const latestSavedAt = latestRecord?.savedAt ? new Date(latestRecord.savedAt) : null;

  return [
    { label: "Filter type", value: getReportTypeLabel(report.type) },
    { label: "Filter value", value: filterValue },
    { label: "Records returned", value: records.length },
    {
      label: "Latest saved",
      value: latestSavedAt && !Number.isNaN(latestSavedAt.getTime())
        ? latestSavedAt.toLocaleDateString("en-IN")
        : "-"
    }
  ];
}

function getReportTypeLabel(type) {
  const labels = {
    all: "All policy records",
    hasPdf: "PDF availability",
    district: "District",
    insuranceCompany: "Insurance company",
    policyType: "Policy type",
    customerName: "Customer",
    recordIds: "Selected policy",
    missing: "Data quality",
    policyFamily: "Policy family",
    makeModel: "Vehicle make",
    vehicleType: "Vehicle type",
    ncbBracket: "NCB bracket",
    tehsil: "Tehsil",
    renewal: "Renewal bucket"
  };

  return labels[type] || "Custom report";
}
