"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardList,
  Download,
  FileBarChart,
  FileCheck2,
  FileText,
  Mail,
  Printer,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

const ICONS = {
  executive: TrendingUp,
  policies: FileText,
  customers: Users,
  renewals: RefreshCw,
  claims: ShieldCheck,
  endorsements: FileCheck2,
  "lead-generation": Users,
  "service-requests": ClipboardList,
  team: Activity,
  operations: BriefcaseBusiness,
  documents: FileBarChart,
};

const RANGE_OPTIONS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["this_week", "This Week"],
  ["last_week", "Last Week"],
  ["this_month", "This Month"],
  ["last_month", "Last Month"],
  ["quarter", "Quarter"],
  ["year", "Year"],
  ["custom", "Custom Range"],
];

export function ReportIndexPage({ modules, lastUpdated }) {
  return (
    <main className="bi-page">
      <ReportHero
        title="Business Intelligence & Reporting Center"
        subtitle="Enterprise reporting for management, renewals, claims, endorsements, documents, teams, and operations."
        lastUpdated={lastUpdated}
      />

      <section className="bi-module-grid">
        {modules.map((module) => {
          const Icon = ICONS[module.id] || BarChart3;
          return (
            <article className="bi-module-card" key={module.id}>
              <div className="bi-module-head">
                <span>
                  <Icon size={21} />
                </span>
                <small>{module.phase}</small>
              </div>
              <h2>{module.title}</h2>
              <p>{module.description}</p>
              <div className="bi-module-footer">
                <div className="bi-module-meta">
                  <strong>{module.kpi}</strong>
                  <span>Updated {formatRelative(module.lastUpdated)}</span>
                </div>
                <Link className="bi-report-link" href={module.href}>
                  <span>Open Report</span>
                  <ChevronRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export function ReportDetailPage({ report, filters, users, lastUpdated }) {
  if (!report) {
    return (
      <main className="state-page">
        <section className="state-card error-state">
          <div className="state-icon">!</div>
          <p className="eyebrow">Report unavailable</p>
          <h1>Business report not found</h1>
          <Link className="primary-action" href="/dashboard/reports">
            Back to Reports
          </Link>
        </section>
      </main>
    );
  }

  const exportRows = flattenReportRows(report);

  return (
    <main className="bi-page">
      <ReportHero title={report.title} subtitle={report.description} lastUpdated={lastUpdated} />
      <div className="bi-report-nav">
        <Link className="bi-back-link" href="/dashboard/reports">
          <ArrowLeft size={16} /> Back to Reports
        </Link>
      </div>
      <ReportFilters filters={filters} users={users} />

      <section className="bi-action-strip">
        <div>
          <p className="eyebrow">Export System</p>
          <h2>Report actions</h2>
        </div>
        <div className="title-actions">
          <button type="button" className="secondary-action" onClick={() => window.print()}>
            <Printer size={16} /> Print Report
          </button>
          <button
            type="button"
            className="secondary-action"
            onClick={() => downloadCsv(`${report.category}-report.csv`, exportRows)}
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            type="button"
            className="secondary-action"
            onClick={() => downloadCsv(`${report.category}-report.xls`, exportRows)}
          >
            <Download size={16} /> Export Excel
          </button>
          <button type="button" className="secondary-action" onClick={() => window.print()}>
            <Download size={16} /> Export PDF
          </button>
          <button type="button" className="secondary-action" disabled title="Future ready">
            <Mail size={16} /> Email Report
          </button>
        </div>
      </section>

      {report.unavailable?.length ? (
        <section className="alert-card warning">
          <span>!</span>
          <div>
            <strong>Data source not configured</strong>
            <p>{report.unavailable.join(" ")}</p>
          </div>
        </section>
      ) : null}

      <section className="bi-kpi-grid">
        {report.kpis.map((item) => (
          <div className="metric-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.hint ? <small>{item.hint}</small> : null}
          </div>
        ))}
      </section>

      {report.health?.length ? (
        <section className="glass-panel bi-health-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Business Health Score</p>
              <h2>Management health indicators</h2>
            </div>
          </div>
          <div className="bi-health-grid">
            {report.health.map(([label, value]) => (
              <div className={`bi-health-card ${getHealthClass(value)}`} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <div>
                  <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {report.actions?.length ? (
        <section className="glass-panel bi-action-center">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Management Action Center</p>
              <h2>Immediate work requiring attention</h2>
            </div>
          </div>
          <div className="bi-action-grid">
            {report.actions.map(([label, value]) => (
              <div className={Number(value) > 0 ? "bi-action-item active" : "bi-action-item"} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="bi-chart-grid">
        {report.charts.map((chart) => (
          <ChartCard chart={chart} key={chart.title} />
        ))}
      </section>

      <section className="bi-table-grid">
        {report.tables.map((table) => (
          <ReportTable table={table} key={table.title} />
        ))}
      </section>
    </main>
  );
}

function ReportHero({ title, subtitle, lastUpdated }) {
  return (
    <section className="bi-hero">
      <div>
        <p className="eyebrow">BimaHeadquarter BI</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <span>Last updated {formatRelative(lastUpdated)}</span>
    </section>
  );
}

function ReportFilters({ filters, users }) {
  return (
    <form className="bi-filter-bar">
      <label>
        <span>Date Range</span>
        <select name="range" defaultValue={filters.range}>
          {RANGE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>From</span>
        <input type="date" name="from" defaultValue={filters.from} />
      </label>
      <label>
        <span>To</span>
        <input type="date" name="to" defaultValue={filters.to} />
      </label>
      <label>
        <span>User</span>
        <select name="user" defaultValue={filters.user}>
          <option value="">All Users</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name || user.email}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Company</span>
        <input name="company" defaultValue={filters.company} placeholder="Company" />
      </label>
      <label>
        <span>Policy Type / LOB</span>
        <input name="policyType" defaultValue={filters.policyType || filters.lob} placeholder="Policy type" />
      </label>
      <label>
        <span>Status</span>
        <input name="status" defaultValue={filters.status} placeholder="Status" />
      </label>
      <button type="submit" className="primary-action">
        Apply Filters
      </button>
    </form>
  );
}

function ChartCard({ chart }) {
  const max = Math.max(1, ...chart.rows.map((row) => Number(row[1]) || 0));
  return (
    <section className="glass-panel bi-chart-card">
      <div>
        <p className="eyebrow">Chart</p>
        <h2>{chart.title}</h2>
      </div>
      <div className="bi-bars">
        {chart.rows.length ? (
          chart.rows.map((row) => {
            const value = Number(row[1]) || 0;
            return (
              <div className="bi-bar-row" key={`${chart.title}-${row[0]}`}>
                <span>{row[0]}</span>
                <div>
                  <i style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
                </div>
                <strong>{row[1]}</strong>
              </div>
            );
          })
        ) : (
          <p className="bi-empty">No records found for this filter.</p>
        )}
      </div>
    </section>
  );
}

function ReportTable({ table }) {
  return (
    <section className="glass-panel bi-table-card">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Table</p>
          <h2>{table.title}</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {table.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length ? (
              table.rows.map((row, index) => (
                <tr key={`${table.title}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${table.title}-${index}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.headers.length}>No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function flattenReportRows(report) {
  const rows = [["Report", report.title], ["Generated", new Date().toLocaleString("en-IN")], []];
  report.kpis.forEach((item) => rows.push([item.label, item.value]));
  report.tables.forEach((table) => {
    rows.push([]);
    rows.push([table.title]);
    rows.push(table.headers);
    table.rows.forEach((row) => rows.push(row));
  });
  return rows;
}

function downloadCsv(fileName, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getHealthClass(value) {
  if (value >= 75) return "good";
  if (value >= 45) return "warn";
  return "risk";
}

function formatRelative(value) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
