export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeRecord } from "@/lib/records";
import { getCurrentSessionFromCookies } from "@/lib/records/scoped-data";
import { formatMoney, parseMoney } from "@/lib/records/analytics";
import { loadPremiumReportPage } from "@/lib/dashboard/premium-data";

const REPORT_TIME_ZONE = "Asia/Kolkata";
const INDIA_TIME_OFFSET = "+05:30";

const REPORTS = {
  eod: {
    title: "EOD Total Premium",
    eyebrow: "Today Upload Report",
    description: "Policies saved today with uploader and basic policy details.",
    grouping: "records",
  },
  mtd: {
    title: "MTD Total Premium",
    eyebrow: "Month To Date Pivot",
    description: "Day-wise premium and policy count for this month.",
    grouping: "day",
  },
  ytd: {
    title: "YTD Total Premium",
    eyebrow: "Year To Date Pivot",
    description: "Month-wise premium and policy count for this year.",
    grouping: "month",
  },
  expired: {
    title: "Expired Premium",
    eyebrow: "Expired Renewal Report",
    description: "Active policies whose expiry date has passed.",
    grouping: "records",
  },
  renewed: {
    title: "Renewed Premium",
    eyebrow: "Renewed Policy Report",
    description: "Policies marked as renewed this month.",
    grouping: "records",
  },
  lost: {
    title: "Lost Premium",
    eyebrow: "Lost Renewal Report",
    description: "Policies marked as lost.",
    grouping: "records",
  },
};

export default async function PremiumReportPage({ params, searchParams }) {
  const session = await getCurrentSessionFromCookies();
  if (!session || session.role === "VIEWER") {
    redirect("/dashboard");
  }

  const { period } = await params;
  const query = await searchParams;
  const reportId = String(period || "").toLowerCase();
  const config = REPORTS[reportId];

  if (!config) {
    return (
      <main className="state-page" style={{ minHeight: "calc(100vh - 200px)" }}>
        <section className="state-card error-state">
          <p className="eyebrow">Premium Report</p>
          <h1>Unknown premium report</h1>
          <p>The selected premium card does not match any available report.</p>
          <Link className="primary-action" href="/dashboard" prefetch={false}>
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit || "25", 10) || 25));
  const q = String(query.q || "").trim();
  const sort = ["newest", "oldest", "premium_desc"].includes(query.sort) ? query.sort : "newest";
  const now = new Date();
  const todayParts = getIndiaDateParts(now);
  const today = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;
  const report = await loadPremiumReportPage({
    session,
    reportId,
    today,
    startToday: startOfIndiaDay(now).toISOString(),
    startMonth: startOfIndiaMonth(now).toISOString(),
    startYear: startOfIndiaYear(now).toISOString(),
    startNextMonth: startOfNextIndiaMonth(now).toISOString(),
    page,
    limit,
    q,
    sort,
  });
  const filteredRecords = report.records.map((record) => ({ ...normalizeRecord(record), reportDate: record.reportDate }));
  const pivotRows = buildPivotRows(filteredRecords, config.grouping);
  const latestRecord = filteredRecords[0];
  const pageHref = (targetPage) => {
    const values = new globalThis.URLSearchParams();
    if (targetPage > 1) values.set("page", String(targetPage));
    if (limit !== 25) values.set("limit", String(limit));
    if (q) values.set("q", q);
    if (sort !== "newest") values.set("sort", sort);
    return values.size ? `?${values}` : "?";
  };

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
            <Link className="secondary-action" href="/dashboard" prefetch={false}>
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="report-summary-grid">
          <div className="metric-card">
            <span>Policy count</span>
            <strong>{report.totalCount}</strong>
          </div>
          <div className="metric-card">
            <span>Premium total</span>
            <strong>{formatMoney(report.totalPremium)}</strong>
          </div>
          <div className="metric-card">
            <span>Latest saved</span>
            <strong>
              {latestRecord ? formatDateTime(latestRecord.reportDate || latestRecord.savedAt || latestRecord.uploadedAt) : "-"}
            </strong>
          </div>
          <div className="metric-card">
            <span>Report basis</span>
            <strong>{getBasisLabel(reportId)}</strong>
          </div>
        </div>
      </section>

      <form className="glass-panel" method="get" style={{ display: "flex", gap: "10px", alignItems: "end", padding: "14px 18px" }}>
        <label style={{ flex: 1 }}>
          <span>Search within this report</span>
          <input name="q" defaultValue={q} placeholder="Policyholder, policy number, company or policy type" />
        </label>
        <label>
          <span>Sort</span>
          <select name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="premium_desc">Highest premium</option>
          </select>
        </label>
        <button className="primary-action" type="submit">Apply</button>
      </form>

      {pivotRows.length ? (
        <section className="glass-panel report-detail-table">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Pivot Report</p>
              <h2>
                {config.grouping === "month"
                  ? "Month-wise premium"
                  : config.grouping === "day"
                    ? "Day-wise premium"
                    : "Current page breakdown"}
              </h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="records-table">
              <thead>
                <tr>
                  <th>
                    {config.grouping === "month"
                      ? "Month"
                      : config.grouping === "day"
                        ? "Date"
                        : "Uploaded By"}
                  </th>
                  <th>Policies</th>
                  <th>Total Premium</th>
                </tr>
              </thead>
              <tbody>
                {pivotRows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <strong>{row.label}</strong>
                    </td>
                    <td>{row.count}</td>
                    <td>
                      <span className="record-code">{formatMoney(row.premium)}</span>
                    </td>
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
              {filteredRecords.length ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDateTime(record.reportDate || record.savedAt || record.uploadedAt)}</td>
                    <td>{record.uploadedBy || "-"}</td>
                    <td>
                      <strong>{record.insuredName || "Unnamed"}</strong>
                    </td>
                    <td>
                      <span className="record-code">{record.policyNumber || "-"}</span>
                    </td>
                    <td>{record.insuranceCompany || "-"}</td>
                    <td>{record.policyType || "-"}</td>
                    <td>
                      <span className="record-code">{formatMoney(getPremium(record))}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", color: "var(--text-secondary)", padding: "28px" }}
                  >
                    No policies found for this report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="table-pagination" aria-label="Premium report pagination">
        <span>Page {report.page} of {report.totalPages} ({report.totalCount} matching policies)</span>
        <div>
          {report.page > 1 ? <Link href={pageHref(report.page - 1)}>Previous</Link> : <span>Previous</span>}
          {report.page < report.totalPages ? <Link href={pageHref(report.page + 1)}>Next</Link> : <span>Next</span>}
        </div>
      </nav>
    </main>
  );
}

function buildPivotRows(records, grouping) {
  const groups = new Map();

  for (const record of records) {
    const savedDate = getSavedDate(record);
    let key = record.uploadedBy || "Unknown uploader";
    let label = key;

    if (grouping === "day") {
      key = savedDate ? formatDateKey(savedDate) : "unknown-date";
      label = savedDate
        ? savedDate.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: REPORT_TIME_ZONE,
          })
        : "Unknown date";
    } else if (grouping === "month") {
      const parts = savedDate ? getIndiaDateParts(savedDate) : null;
      key = parts ? `${parts.year}-${String(parts.month).padStart(2, "0")}` : "unknown-month";
      label = savedDate
        ? savedDate.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
            timeZone: REPORT_TIME_ZONE,
          })
        : "Unknown month";
    }

    const current = groups.get(key) || { key, label, count: 0, premium: 0 };
    current.count += 1;
    current.premium += getPremium(record);
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function getSavedDate(record) {
  const value = record.reportDate || record.savedAt || record.uploadedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPremium(record) {
  return parseMoney(record.netPremium || record.totalPremium || record.premium);
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
    minute: "2-digit",
    timeZone: REPORT_TIME_ZONE,
  });
}

function formatDateKey(date) {
  const parts = getIndiaDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function startOfIndiaDay(date) {
  const parts = getIndiaDateParts(date);
  return makeIndiaDate(parts.year, parts.month, parts.day);
}

function startOfIndiaMonth(date) {
  const parts = getIndiaDateParts(date);
  return makeIndiaDate(parts.year, parts.month, 1);
}

function startOfNextIndiaMonth(date) {
  const parts = getIndiaDateParts(date);
  const nextMonth = parts.month === 12 ? 1 : parts.month + 1;
  const year = parts.month === 12 ? parts.year + 1 : parts.year;
  return makeIndiaDate(year, nextMonth, 1);
}

function startOfIndiaYear(date) {
  const parts = getIndiaDateParts(date);
  return makeIndiaDate(parts.year, 1, 1);
}

function makeIndiaDate(year, month, day) {
  return new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00${INDIA_TIME_OFFSET}`,
  );
}

function getIndiaDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
  };
}

function getBasisLabel(reportId) {
  if (reportId === "eod") return "Saved today";
  if (reportId === "mtd") return "Saved this month";
  if (reportId === "ytd") return "Saved this year";
  if (reportId === "expired") return "Expiry date";
  if (reportId === "renewed") return "Renewal status / renewal upload";
  if (reportId === "lost") return "Lost status";
  return "Policy records";
}
