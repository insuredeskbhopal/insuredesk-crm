"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CalendarRange,
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
  "monthly-policies": CalendarRange,
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

const KPI_ICONS = [FileText, BriefcaseBusiness, TrendingUp, Activity];

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
                <Link className="bi-report-link" href={module.href} prefetch={false}>
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
          <Link className="primary-action" href="/dashboard/reports" prefetch={false}>
            Back to Reports
          </Link>
        </section>
      </main>
    );
  }

  const exportRows = flattenReportRows(report);
  const isMonthlyPolicyReport = report.category === "monthly-policies";
  const reportTables = (
    <section className={`bi-table-grid${isMonthlyPolicyReport ? " bi-monthly-table-grid" : ""}`}>
      {report.tables.map((table) => (
        <ReportTable table={table} key={table.title} />
      ))}
    </section>
  );

  return (
    <main className="bi-page">
      <ReportHero title={report.title} subtitle={report.description} lastUpdated={lastUpdated} />
      <div className="bi-report-nav">
        <Link className="bi-back-link" href="/dashboard/reports" prefetch={false}>
          <ArrowLeft size={16} /> Back to Reports
        </Link>
      </div>
      <ReportFilters filters={filters} users={users} report={report} />

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
        {report.kpis.map((item, index) => {
          const Icon = KPI_ICONS[index % KPI_ICONS.length];
          return (
            <article className="bi-metric-card" key={item.label}>
              <span className="bi-metric-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <div className="bi-metric-copy">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
                {item.hint ? (
                  <small>
                    <CalendarRange size={12} aria-hidden="true" />
                    {item.hint}
                  </small>
                ) : null}
              </div>
              <span className="bi-metric-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
            </article>
          );
        })}
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
              <p className="eyebrow">Category Action Center</p>
              <h2>Actions for this report</h2>
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
          <ChartCard
            chart={chart}
            key={`${chart.title}-${chart.rows.map((row) => `${row[0]}:${row[1]}`).join("|")}`}
          />
        ))}
      </section>

      {reportTables}
    </main>
  );
}

function ReportHero({ title, subtitle, lastUpdated }) {
  return (
    <section className="bi-hero">
      <div>
        <p className="eyebrow">Bima Headquarter BI</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <span>Last updated {formatRelative(lastUpdated)}</span>
    </section>
  );
}

function ReportFilters({ filters, users, report }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const updateMonthlyReport = (changes = {}) => {
    const month = changes.month ?? filters.month;
    const policyCategory = changes.policyCategory ?? filters.policyCategory;
    const params = new globalThis.URLSearchParams();
    params.set("month", month);
    if (policyCategory) params.set("policyCategory", policyCategory);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  if (report.category === "monthly-policies") {
    return (
      <form
        className="bi-filter-bar bi-monthly-filter-bar"
        key={`${filters.month}-${filters.policyCategory}`}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          updateMonthlyReport({
            month: String(formData.get("month") || filters.month),
            policyCategory: String(formData.get("policyCategory") || ""),
          });
        }}
      >
        <label>
          <span>Report Month</span>
          <input
            type="month"
            name="month"
            defaultValue={filters.month}
            onChange={(event) => updateMonthlyReport({ month: event.currentTarget.value })}
            required
          />
        </label>
        <label>
          <span>Policy Category</span>
          <select
            name="policyCategory"
            defaultValue={filters.policyCategory}
            onChange={(event) =>
              updateMonthlyReport({ policyCategory: event.currentTarget.value })
            }
          >
            <option value="">All Policy Types</option>
            {(report.filterOptions?.policyCategories || []).map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary-action" disabled={isPending}>
          {isPending ? "Updating Report..." : "View Monthly Report"}
        </button>
      </form>
    );
  }

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
  if (chart.type === "line") {
    return <LineChartCard chart={chart} />;
  }

  if (chart.type === "donut") {
    return <DonutChartCard chart={chart} />;
  }

  const values = chart.rows.map((row) => Number(row[1]) || 0);
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <section className="glass-panel bi-chart-card bi-bar-chart-card">
      <div className="bi-chart-header">
        <div>
          <p className="eyebrow">Portfolio distribution</p>
          <h2>{chart.title}</h2>
          <p className="bi-chart-caption">Ranked by policy volume for the selected report</p>
        </div>
        <div className="bi-chart-metrics" aria-label="Chart summary">
          <span><small>Total policies</small><strong>{total.toLocaleString("en-IN")}</strong></span>
          <span><small>Companies</small><strong>{chart.rows.length}</strong></span>
        </div>
      </div>
      <div className="bi-bars">
        {chart.rows.length ? (
          chart.rows.map((row, index) => {
            const value = Number(row[1]) || 0;
            const share = total ? (value / total) * 100 : 0;
            return (
              <div className="bi-bar-row" key={`${chart.title}-${row[0]}`}>
                <div className="bi-bar-label">
                  <b>{index + 1}</b>
                  <span title={row[0]}>{row[0]}</span>
                </div>
                <div className="bi-bar-value">
                  <strong>{value.toLocaleString("en-IN")}</strong>
                  <small>{share.toFixed(1)}%</small>
                </div>
                <div className="bi-bar-track" title={`${row[0]}: ${value} policies (${share.toFixed(1)}%)`}>
                  <i
                    style={{
                      "--bar-width": `${Math.max(3, (value / max) * 100)}%`,
                      "--bar-delay": `${index * 45}ms`,
                    }}
                  />
                </div>
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

function DonutChartCard({ chart }) {
  const palette = ["#247f74", "#527fd5", "#e5a23b", "#df7477", "#8b75d1", "#2e9b7e", "#7a8b98", "#65a6cf"];
  const values = chart.rows.map((row) => Number(row[1]) || 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const outerRadius = 88;
  const innerRadius = 59;
  let angle = 0;

  const segments = chart.rows.map((row, index) => {
    const value = values[index];
    const percentage = total ? (value / total) * 100 : 0;
    const sweep = total ? (value / total) * 360 : 0;
    const gap = chart.rows.length > 1 ? Math.min(1.8, sweep * 0.18) : 0;
    const startAngle = angle + gap / 2;
    const endAngle = angle + sweep - gap / 2;
    const segment = {
      row,
      value,
      percentage,
      path: describeDonutSegment(110, 110, outerRadius, innerRadius, startAngle, endAngle),
      color: palette[index % palette.length],
    };
    angle += sweep;
    return segment;
  });

  return (
    <section className="glass-panel bi-chart-card bi-donut-chart-card">
      <div className="bi-chart-header">
        <div>
          <p className="eyebrow">Portfolio distribution</p>
          <h2>{chart.title}</h2>
          <p className="bi-chart-caption">Insurance company share for the selected report</p>
        </div>
        <div className="bi-chart-metrics" aria-label="Chart summary">
          <span><small>Total policies</small><strong>{total.toLocaleString("en-IN")}</strong></span>
          <span><small>Companies</small><strong>{chart.rows.length}</strong></span>
        </div>
      </div>

      {segments.length ? (
        <div className="bi-donut-layout">
          <div className="bi-donut-visual">
            <svg viewBox="0 0 220 220" role="img" aria-label={chart.title}>
              <circle className="bi-donut-base" cx="110" cy="110" r={(outerRadius + innerRadius) / 2} />
              {segments.map((segment, index) => (
                <path
                  className="bi-donut-segment"
                  d={segment.path}
                  fill={segment.color}
                  key={`${segment.row[0]}-${index}`}
                  style={{ "--segment-delay": `${index * 70}ms` }}
                >
                  <title>{`${segment.row[0]}: ${segment.value} policies (${segment.percentage.toFixed(1)}%)`}</title>
                </path>
              ))}
              <g className="bi-donut-center-content">
                <circle className="bi-donut-center" cx="110" cy="110" r="58" />
                <text className="bi-donut-total" x="110" y="106" textAnchor="middle">{total.toLocaleString("en-IN")}</text>
                <text className="bi-donut-total-label" x="110" y="127" textAnchor="middle">Policies</text>
                <text className="bi-donut-company-count" x="110" y="145" textAnchor="middle">
                  {chart.rows.length} {chart.rows.length === 1 ? "company" : "companies"}
                </text>
              </g>
            </svg>
          </div>

          <div className="bi-donut-legend">
            {segments.map((segment, index) => (
              <div
                className="bi-donut-legend-row"
                key={`${segment.row[0]}-legend-${index}`}
                style={{ "--legend-delay": `${180 + index * 55}ms` }}
              >
                <i style={{ background: segment.color }} />
                <span title={segment.row[0]}>{segment.row[0]}</span>
                <strong>{segment.value.toLocaleString("en-IN")}</strong>
                <small>{segment.percentage.toFixed(1)}%</small>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="bi-empty">No records found for this filter.</p>
      )}
    </section>
  );
}

function LineChartCard({ chart }) {
  const gradientId = useId().replace(/:/g, "");
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const width = 760;
  const height = 300;
  const padding = { top: 22, right: 24, bottom: 38, left: 48 };
  const values = chart.rows.map((row) => Number(row[1]) || 0);
  const rawMax = Math.max(0, ...values);
  const max = niceChartMaximum(Math.max(1, rawMax));
  const total = values.reduce((sum, value) => sum + value, 0);
  const activeDays = values.filter((value) => value > 0).length;
  const average = chart.rows.length ? total / chart.rows.length : 0;
  const peakIndex = rawMax > 0 ? values.indexOf(rawMax) : -1;
  const peakLabel = peakIndex >= 0 ? chart.rows[peakIndex]?.[0] : "-";
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = chart.rows.map((row, index) => {
    const x = padding.left + (index / Math.max(1, chart.rows.length - 1)) * plotWidth;
    const y = height - padding.bottom - ((Number(row[1]) || 0) / max) * plotHeight;
    return { label: row[0], value: Number(row[1]) || 0, x, y };
  });
  const baseline = height - padding.bottom;
  const linePath = buildSmoothPath(points);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
    : "";
  const averageY = baseline - (average / max) * plotHeight;
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex];

  return (
    <section className="glass-panel bi-chart-card bi-trend-chart-card">
      <div className="bi-chart-header">
        <div>
          <p className="eyebrow">Activity trend</p>
          <h2>{chart.title}</h2>
          <p className="bi-chart-caption">Daily policies saved during the selected month</p>
        </div>
        <div className="bi-chart-metrics" aria-label="Trend summary">
          <span><small>Total</small><strong>{total.toLocaleString("en-IN")}</strong></span>
          <span><small>Daily avg.</small><strong>{average.toFixed(1)}</strong></span>
          <span><small>Active days</small><strong>{activeDays}</strong></span>
          <span><small>Peak</small><strong>{rawMax.toLocaleString("en-IN")}</strong><em>{peakIndex >= 0 ? `Day ${peakLabel}` : "No activity"}</em></span>
        </div>
      </div>
      {points.length ? (
        <div className="bi-line-chart">
          <div className="bi-line-legend" aria-hidden="true">
            <span><i />Policy volume</span>
            <span><i className="average" />Daily average</span>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={chart.title}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="52%" stopColor="#3b82f6" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.015" />
              </linearGradient>
              <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="48%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
              <filter id={`${gradientId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#4f46e5" floodOpacity="0.2" />
              </filter>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + ratio * plotHeight;
              const tick = Math.round(max * (1 - ratio));
              return (
                <g key={ratio}>
                  <line className="bi-grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                  <text className="bi-axis-label" x={padding.left - 12} y={y + 4} textAnchor="end">{tick}</text>
                </g>
              );
            })}
            {average > 0 && (
              <g className="bi-average-line">
                <line x1={padding.left} x2={width - padding.right} y1={averageY} y2={averageY} />
                <text x={width - padding.right - 4} y={averageY - 7} textAnchor="end">Avg {average.toFixed(1)}</text>
              </g>
            )}
            <path className="bi-line-area" d={areaPath} fill={`url(#${gradientId}-area)`} />
            <path
              className="bi-line-series"
              d={linePath}
              pathLength="1"
              stroke={`url(#${gradientId}-line)`}
              filter={`url(#${gradientId}-shadow)`}
            />
            {points.map((point, index) => (
              <g key={`${point.label}-${index}`}>
                <rect
                  className="bi-line-hit-area"
                  x={point.x - plotWidth / Math.max(1, points.length) / 2}
                  y={padding.top}
                  width={plotWidth / Math.max(1, points.length)}
                  height={plotHeight}
                  onMouseEnter={() => setHoveredIndex(index)}
                />
                {index === peakIndex && <circle className="bi-peak-halo" cx={point.x} cy={point.y} r="10" style={{ "--point-delay": `${420 + index * 18}ms` }} />}
                {point.value > 0 && (
                  <circle
                    className={index === peakIndex ? "bi-line-point peak" : "bi-line-point"}
                    cx={point.x}
                    cy={point.y}
                    r={index === peakIndex ? 5 : 3.5}
                    style={{ "--point-delay": `${420 + index * 18}ms` }}
                  />
                )}
                {(index === 0 || index === points.length - 1 || index % 5 === 0) && (
                  <text className="bi-axis-label" x={point.x} y={height - 12} textAnchor="middle">
                    {point.label}
                  </text>
                )}
              </g>
            ))}
            {hoveredPoint && (
              <g className="bi-line-tooltip" pointerEvents="none">
                <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1={padding.top} y2={baseline} />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="6" />
                <g transform={`translate(${Math.min(width - 142, Math.max(8, hoveredPoint.x - 66))}, ${Math.max(8, hoveredPoint.y - 62)})`}>
                  <rect width="134" height="48" rx="8" />
                  <text x="12" y="19">Day {hoveredPoint.label}</text>
                  <text className="bi-tooltip-value" x="12" y="37">{hoveredPoint.value} policies</text>
                </g>
              </g>
            )}
          </svg>
        </div>
      ) : (
        <p className="bi-empty">No records found for this filter.</p>
      )}
    </section>
  );
}

function niceChartMaximum(value) {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function buildSmoothPath(points) {
  if (!points.length) return "";
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function describeDonutSegment(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  if (endAngle <= startAngle) return "";
  const outerStart = polarPoint(cx, cy, outerRadius, startAngle);
  const outerEnd = polarPoint(cx, cy, outerRadius, endAngle);
  const innerEnd = polarPoint(cx, cy, innerRadius, endAngle);
  const innerStart = polarPoint(cx, cy, innerRadius, startAngle);
  if (endAngle - startAngle >= 359.999) {
    const outerMiddle = polarPoint(cx, cy, outerRadius, startAngle + 180);
    const innerMiddle = polarPoint(cx, cy, innerRadius, startAngle + 180);
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 0 1 ${outerMiddle.x} ${outerMiddle.y}`,
      `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 0 0 ${innerMiddle.x} ${innerMiddle.y}`,
      `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");
  }
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function polarPoint(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
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
