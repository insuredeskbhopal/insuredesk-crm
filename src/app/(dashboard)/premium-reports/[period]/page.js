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
  const pivotRows = formatPivotSummary(report.pivotSummary, filteredRecords, config.grouping);
  const categoryTotals = pivotRows.reduce(
    (acc, r) => {
      acc.motor += r.motor || 0;
      acc.health += r.health || 0;
      acc.warehouse += r.warehouse || 0;
      acc.nonMotor += r.nonMotor || 0;
      acc.count += r.count || 0;
      acc.premium += r.premium || 0;
      return acc;
    },
    { motor: 0, health: 0, warehouse: 0, nonMotor: 0, count: 0, premium: 0 }
  );
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
    <main className="mtd-premium-v3">
      <header className="mtd-premium-v3-header">
        <div>
          <Link className="mtd-premium-v3-back" href="/dashboard" prefetch={false}>← Reports</Link>
          <p>{config.eyebrow}</p>
          <h1>{config.title}</h1>
          <span>{config.description}</span>
        </div>
        <div className="mtd-premium-v3-status">
          <span>Reporting basis</span>
          <strong>{getBasisLabel(reportId)}</strong>
        </div>
      </header>

      <section className="mtd-premium-v3-summary" aria-label="Report summary">
        <article className="mtd-premium-v3-total">
          <span>Premium written</span>
          <strong>{formatMoney(report.totalPremium)}</strong>
          <small>{report.totalCount} policies in this report</small>
        </article>
        <article>
          <span>Policies</span>
          <strong>{report.totalCount}</strong>
          <small>Recorded in this period</small>
        </article>
        <article>
          <span>Latest activity</span>
          <strong>{latestRecord ? formatDateTime(latestRecord.reportDate || latestRecord.savedAt || latestRecord.uploadedAt) : "No activity"}</strong>
          <small>Most recently saved policy</small>
        </article>
      </section>

      <form className="mtd-premium-v3-filter" method="get">
        <label>
          <span>Search records</span>
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
        <button type="submit">Filter report</button>
      </form>

      {pivotRows.length ? (
        <section className="mtd-premium-v3-section mtd-premium-v3-pivot">
          <div className="mtd-premium-v3-section-head">
            <div>
              <p className="eyebrow">Pivot Report</p>
              <h2>
                {config.grouping === "month"
                  ? "Month-wise category breakdown"
                  : config.grouping === "day"
                    ? "Day-wise category breakdown"
                    : "Current page breakdown"}
              </h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="records-table pivot-table-spacious">
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>
                    {config.grouping === "month"
                      ? "Month"
                      : config.grouping === "day"
                        ? "Date"
                        : "Uploaded By"}
                  </th>
                  {config.grouping !== "records" && <th className="text-center" style={{ width: "12%" }}>Motor</th>}
                  {config.grouping !== "records" && <th className="text-center" style={{ width: "12%" }}>Health</th>}
                  {config.grouping !== "records" && <th className="text-center" style={{ width: "12%" }}>Warehouse</th>}
                  {config.grouping !== "records" && <th className="text-center" style={{ width: "12%" }}>Non-Motor</th>}
                  <th className="text-center" style={{ width: "14%" }}>Total Policies</th>
                  <th className="text-right" style={{ width: "18%" }}>Total Premium</th>
                </tr>
              </thead>
              <tbody>
                {pivotRows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <strong>{row.label}</strong>
                    </td>
                    {config.grouping !== "records" && (
                      <td className="text-center">
                        <span className={`pivot-num-cell ${row.motor ? "" : "dimmed"}`}>
                          {row.motor || 0}
                        </span>
                      </td>
                    )}
                    {config.grouping !== "records" && (
                      <td className="text-center">
                        <span className={`pivot-num-cell ${row.health ? "" : "dimmed"}`}>
                          {row.health || 0}
                        </span>
                      </td>
                    )}
                    {config.grouping !== "records" && (
                      <td className="text-center">
                        <span className={`pivot-num-cell ${row.warehouse ? "" : "dimmed"}`}>
                          {row.warehouse || 0}
                        </span>
                      </td>
                    )}
                    {config.grouping !== "records" && (
                      <td className="text-center">
                        <span className={`pivot-num-cell ${row.nonMotor ? "" : "dimmed"}`}>
                          {row.nonMotor || 0}
                        </span>
                      </td>
                    )}
                    <td className="text-center">
                      <span className="pivot-num-cell total-bold">{row.count}</span>
                    </td>
                    <td className="text-right">
                      <span className="record-code">{formatMoney(row.premium)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {config.grouping !== "records" && pivotRows.length > 1 && (
                <tfoot>
                  <tr className="pivot-tfoot-clean">
                    <td>Total</td>
                    <td className="text-center">{categoryTotals.motor}</td>
                    <td className="text-center">{categoryTotals.health}</td>
                    <td className="text-center">{categoryTotals.warehouse}</td>
                    <td className="text-center">{categoryTotals.nonMotor}</td>
                    <td className="text-center">{categoryTotals.count}</td>
                    <td className="text-right">
                      <span className="record-code">{formatMoney(categoryTotals.premium)}</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      ) : null}

      <section className="mtd-premium-v3-section mtd-premium-v3-records">
        <div className="mtd-premium-v3-section-head">
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

function formatPivotSummary(pivotSummary = [], records = [], grouping) {
  if (Array.isArray(pivotSummary) && pivotSummary.length > 0 && grouping !== "records") {
    const rowMap = new Map();

    for (const item of pivotSummary) {
      const key = item.key;
      let label = key;
      if (grouping === "month" && key && key.includes("-")) {
        const [yearStr, monthStr] = key.split("-");
        const year = Number.parseInt(yearStr, 10);
        const month = Number.parseInt(monthStr, 10);
        if (!Number.isNaN(year) && !Number.isNaN(month)) {
          const d = new Date(year, month - 1, 1);
          label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: REPORT_TIME_ZONE });
        }
      } else if (grouping === "day" && key && key.includes("-")) {
        const [yearStr, monthStr, dayStr] = key.split("-");
        const year = Number.parseInt(yearStr, 10);
        const month = Number.parseInt(monthStr, 10);
        const day = Number.parseInt(dayStr, 10);
        if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
          const d = new Date(year, month - 1, day);
          label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: REPORT_TIME_ZONE });
        }
      }

      const existing = rowMap.get(key) || {
        key,
        label,
        motor: 0,
        health: 0,
        warehouse: 0,
        nonMotor: 0,
        count: 0,
        premium: 0,
      };

      const cat = String(item.category || "").toLowerCase();
      if (cat === "motor") {
        existing.motor += item.count;
      } else if (cat === "health") {
        existing.health += item.count;
      } else if (cat === "warehouse") {
        existing.warehouse += item.count;
      } else {
        existing.nonMotor += item.count;
      }

      existing.count += item.count;
      existing.premium += item.premium;
      rowMap.set(key, existing);
    }

    return Array.from(rowMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  }
  return buildPivotRows(records, grouping);
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

    const catKey = getRecordCategory(record);
    const current = groups.get(key) || {
      key,
      label,
      motor: 0,
      health: 0,
      warehouse: 0,
      nonMotor: 0,
      count: 0,
      premium: 0,
    };
    current[catKey] = (current[catKey] || 0) + 1;
    current.count += 1;
    current.premium += getPremium(record);
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function getRecordCategory(record = {}) {
  const haystack = [
    record.policyCategory,
    record.documentCategory,
    record.selectedServiceCategory,
    record.detectedServiceCategory,
    record.policyType,
    record.selectedPolicyType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(warehouse|godown)\b/.test(haystack)) {
    return "warehouse";
  }
  if (/\b(health|mediclaim|medical|hospital|personal\s*accident)\b/.test(haystack)) {
    return "health";
  }
  if (/\b(motor|vehicle|private\s*car|two\s*wheeler|commercial\s*vehicle|gcv|pcv|car|scooter|bike)\b/.test(haystack)) {
    return "motor";
  }
  return "nonMotor";
}

function getSavedDate(record) {
  const value = record?.reportDate || record?.savedAt || record?.uploadedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPremium(record) {
  if (typeof record?.premium === "number") return record.premium;
  return parseMoney(record?.netPremium || record?.totalPremium || record?.premium);
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
