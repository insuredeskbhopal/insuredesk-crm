export const dynamic = "force-dynamic";

import Link from "next/link";
import { normalizeRecord } from "@/lib/records";
import { loadScopedPolicyRecords } from "@/lib/records/scoped-data";
import { formatMoney, parseMoney } from "@/lib/records/analytics";
import { parsePolicyDate, startOfDay } from "@/app/lib/reporting/filters";

const REPORTS = {
  eod: {
    title: "EOD Total Premium",
    eyebrow: "Today Upload Report",
    description: "Policies saved today with uploader and basic policy details.",
    grouping: "records"
  },
  mtd: {
    title: "MTD Total Premium",
    eyebrow: "Month To Date Pivot",
    description: "Day-wise premium and policy count for this month.",
    grouping: "day"
  },
  ytd: {
    title: "YTD Total Premium",
    eyebrow: "Year To Date Pivot",
    description: "Month-wise premium and policy count for this year.",
    grouping: "month"
  },
  expired: {
    title: "Expired Premium",
    eyebrow: "Expired Renewal Report",
    description: "Active policies whose expiry date has passed.",
    grouping: "records"
  },
  renewed: {
    title: "Renewed Premium",
    eyebrow: "Renewed Policy Report",
    description: "Policies marked as renewed.",
    grouping: "records"
  },
  lost: {
    title: "Lost Premium",
    eyebrow: "Lost Renewal Report",
    description: "Policies marked as lost.",
    grouping: "records"
  }
};

export default async function PremiumReportPage({ params }) {
  const { period } = await params;
  const reportId = String(period || "").toLowerCase();
  const config = REPORTS[reportId];

  if (!config) {
    return (
      <main className="state-page" style={{ minHeight: "calc(100vh - 200px)" }}>
        <section className="state-card error-state">
          <p className="eyebrow">Premium Report</p>
          <h1>Unknown premium report</h1>
          <p>The selected premium card does not match any available report.</p>
          <Link className="primary-action" href="/dashboard">Back to Dashboard</Link>
        </section>
      </main>
    );
  }

  const rawRecords = await loadScopedPolicyRecords({ includeInactive: true });
  const records = rawRecords.map(normalizeRecord);
  const today = startOfDay(new Date());
  const filteredRecords = filterPremiumRecords(records, reportId, today);
  const pivotRows = buildPivotRows(filteredRecords, config.grouping);
  const totalPremium = filteredRecords.reduce((sum, record) => sum + getPremium(record), 0);
  const latestRecord = filteredRecords[0];

  return (
    <main className="analytics-report-page">
      <section className="glass-panel report-detail-card">
        <div className="panel-head">
          <div>
            <p className="eyebrow">{config.eyebrow}</p>
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
          <div className="title-actions">
            <Link className="secondary-action" href="/dashboard">Back to Dashboard</Link>
          </div>
        </div>

        <div className="report-summary-grid">
          <div className="metric-card">
            <span>Policy count</span>
            <strong>{filteredRecords.length}</strong>
          </div>
          <div className="metric-card">
            <span>Premium total</span>
            <strong>{formatMoney(totalPremium)}</strong>
          </div>
          <div className="metric-card">
            <span>Latest saved</span>
            <strong>{latestRecord ? formatDateTime(latestRecord.savedAt || latestRecord.uploadedAt) : "-"}</strong>
          </div>
          <div className="metric-card">
            <span>Report basis</span>
            <strong>{getBasisLabel(reportId)}</strong>
          </div>
        </div>
      </section>

      {pivotRows.length ? (
        <section className="glass-panel report-detail-table">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Pivot Report</p>
              <h2>{config.grouping === "month" ? "Month-wise premium" : config.grouping === "day" ? "Day-wise premium" : "Uploader summary"}</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th>{config.grouping === "month" ? "Month" : config.grouping === "day" ? "Date" : "Uploaded By"}</th>
                  <th>Policies</th>
                  <th>Total Premium</th>
                </tr>
              </thead>
              <tbody>
                {pivotRows.map((row) => (
                  <tr key={row.key}>
                    <td><strong>{row.label}</strong></td>
                    <td>{row.count}</td>
                    <td><span className="record-code">{formatMoney(row.premium)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="glass-panel report-detail-table">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Policy Records</p>
            <h2>{reportId === "eod" ? "Today uploads" : "Matching policies"}</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th>Saved At</th>
                <th>Uploaded By</th>
                <th>Insured Name</th>
                <th>Policy No.</th>
                <th>Company</th>
                <th>Policy Type</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length ? filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>{formatDateTime(record.savedAt || record.uploadedAt)}</td>
                  <td>{record.uploadedBy || "-"}</td>
                  <td><strong>{record.insuredName || "Unnamed"}</strong></td>
                  <td><span className="record-code">{record.policyNumber || "-"}</span></td>
                  <td>{record.insuranceCompany || "-"}</td>
                  <td>{record.policyType || "-"}</td>
                  <td><span className="record-code">{formatMoney(getPremium(record))}</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "28px" }}>
                    No policies found for this report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function filterPremiumRecords(records, reportId, today) {
  const startToday = startOfDay(today);
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startYear = new Date(today.getFullYear(), 0, 1);

  return records
    .filter((record) => {
      const savedDate = getSavedDate(record);
      if (reportId === "eod") return savedDate && savedDate >= startToday;
      if (reportId === "mtd") return savedDate && savedDate >= startMonth;
      if (reportId === "ytd") return savedDate && savedDate >= startYear;
      if (reportId === "renewed") return record.renewalStatus === "RENEWED";
      if (reportId === "lost") return record.renewalStatus === "LOST";
      if (reportId === "expired") {
        if (!record.isActivePolicy) return false;
        const expiry = parsePolicyDate(record.expiryDate);
        return expiry && expiry < today;
      }
      return false;
    })
    .sort((a, b) => (getSavedDate(b)?.getTime() || 0) - (getSavedDate(a)?.getTime() || 0));
}

function buildPivotRows(records, grouping) {
  const groups = new Map();

  for (const record of records) {
    const savedDate = getSavedDate(record);
    let key = record.uploadedBy || "Unknown uploader";
    let label = key;

    if (grouping === "day") {
      key = savedDate ? formatDateKey(savedDate) : "unknown-date";
      label = savedDate ? savedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Unknown date";
    } else if (grouping === "month") {
      key = savedDate ? `${savedDate.getFullYear()}-${String(savedDate.getMonth() + 1).padStart(2, "0")}` : "unknown-month";
      label = savedDate ? savedDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Unknown month";
    }

    const current = groups.get(key) || { key, label, count: 0, premium: 0 };
    current.count += 1;
    current.premium += getPremium(record);
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function getSavedDate(record) {
  const value = record.savedAt || record.uploadedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPremium(record) {
  return parseMoney(record.totalPremium || record.premium);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getBasisLabel(reportId) {
  if (reportId === "eod") return "Saved today";
  if (reportId === "mtd") return "Saved this month";
  if (reportId === "ytd") return "Saved this year";
  if (reportId === "expired") return "Expiry date";
  if (reportId === "renewed") return "Renewal status";
  if (reportId === "lost") return "Lost status";
  return "Policy records";
}
