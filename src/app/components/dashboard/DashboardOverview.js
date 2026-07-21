"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileWarning,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { formatMoney } from "@/lib/records/analytics";

const EMPTY_SUMMARY = {
  activePolicies: 0,
  totalCustomers: 0,
  expiringToday: 0,
  expiring7Days: 0,
  expiring30Days: 0,
  pendingRenewals: 0,
  renewedPolicies: 0,
  lostPolicies: 0,
  todayFollowUps: 0,
  overdueFollowUps: 0,
  pendingPdfReviews: 0,
  failedExtractions: 0,
  totalClaims: 0,
  pendingClaims: 0,
  claimFollowUps: 0,
  claimDocumentsPending: 0,
  settledClaims: 0,
  rejectedClaims: 0,
  totalLeads: 0,
  newLeads: 0,
  leadFollowUps: 0,
  interestedLeads: 0,
  convertedLeads: 0,
  lostLeads: 0,
};

const EMPTY_PREMIUM = {
  eodPremium: 0,
  eodCount: 0,
  mtdPremium: 0,
  mtdCount: 0,
  ytdPremium: 0,
  ytdCount: 0,
  renewed: 0,
  renewedPremium: 0,
  lost: 0,
  lostPremium: 0,
};

async function fetchJson(url, signal) {
  const response = await fetch(url, { cache: "no-store", signal });
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || "Dashboard data could not be loaded.");
  }
  return payload;
}

function SummaryLink({ icon: Icon, label, value, note, href, tone = "blue", prominent = false }) {
  return (
    <Link
      className={`dashboard-summary-link tone-${tone}${prominent ? " prominent" : ""}`}
      href={href}
      prefetch={false}
    >
      <span className="dashboard-summary-icon"><Icon size={prominent ? 23 : 18} /></span>
      <span className="dashboard-summary-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {note ? <small>{note}</small> : null}
      </span>
    </Link>
  );
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section className="dashboard-overview-panel">
      <div className="dashboard-overview-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action || null}
      </div>
      {children}
    </section>
  );
}

function VerticalBarChart({ title, subtitle, items }) {
  const scale = Math.max(...items.map((item) => item.value), 1);
  return (
    <section className="dashboard-chart-card">
      <div className="dashboard-chart-head"><span>Bar graph</span><strong>{title}</strong><small>{subtitle}</small></div>
      <div className="dashboard-vertical-chart">
        {items.map((item) => (
          <Link key={item.label} href={item.href} prefetch={false}>
            <strong>{item.value}</strong>
            <i><i style={{ height: `${Math.max(item.value ? 5 : 1, (item.value / scale) * 100)}%`, background: item.color }} /></i>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LineChart({ title, subtitle, items }) {
  const width = 440;
  const height = 150;
  const left = 24;
  const top = 18;
  const bottom = 25;
  const plotHeight = height - top - bottom;
  const scale = Math.max(...items.map((item) => item.value), 1);
  const step = items.length > 1 ? (width - left * 2) / (items.length - 1) : 0;
  const points = items.map((item, index) => ({
    ...item,
    x: left + index * step,
    y: top + plotHeight - (item.value / scale) * plotHeight,
  }));

  return (
    <section className="dashboard-chart-card dashboard-line-card">
      <div className="dashboard-chart-head"><span>Line graph</span><strong>{title}</strong><small>{subtitle}</small></div>
      <svg className="dashboard-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {[0, 0.5, 1].map((position) => (
          <line key={position} x1={left} x2={width - left} y1={top + plotHeight * position} y2={top + plotHeight * position} />
        ))}
        <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" style={{ fill: point.color }} />
            <text className="dashboard-line-value" x={point.x} y={Math.max(12, point.y - 9)}>{point.value}</text>
            <text className="dashboard-line-label" x={point.x} y={height - 5}>{point.label}</text>
          </g>
        ))}
      </svg>
      <div className="dashboard-line-links">
        {items.map((item) => <Link key={item.label} href={item.href} prefetch={false}>{item.label}</Link>)}
      </div>
    </section>
  );
}

export default function DashboardOverview() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [premium, setPremium] = useState(EMPTY_PREMIUM);
  const [viewerRole, setViewerRole] = useState("");
  const [leadAgents, setLeadAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboard = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const [overviewData, reportingData, renewalData, followUpData, claimsData, leadsData] = await Promise.all([
        fetchJson("/api/dashboard/overview", signal),
        fetchJson("/api/dashboard/header-data?summaryOnly=true", signal),
        fetchJson("/api/renewals/policies?summaryOnly=true&tab=renewed", signal),
        fetchJson("/api/renewals/follow-ups?filter=today&page=1&limit=1", signal),
        fetchJson("/api/claims?summaryOnly=true", signal),
        fetchJson("/api/customer-profiles?summaryOnly=true", signal),
      ]);
      const renewalCounts = renewalData.summaryCounts || {};
      const followUpCounts = followUpData.filterCounts || {};
      const claimCounts = claimsData.filterCounts || {};
      const leadCounts = leadsData.counters || {};
      setSummary({
        ...EMPTY_SUMMARY,
        ...(overviewData.summary || {}),
        expiringToday: Number(renewalCounts.dueToday) || 0,
        expiring7Days: Number(renewalCounts.due7) || 0,
        expiring30Days: Number(renewalCounts.due30) || 0,
        pendingRenewals: Number(renewalCounts.pending) || 0,
        renewedPolicies: Number(renewalCounts.renewed) || 0,
        lostPolicies: Number(renewalCounts.lost) || 0,
        todayFollowUps: Number(followUpCounts.today) || 0,
        overdueFollowUps: Number(followUpCounts.overdue) || 0,
        totalClaims: Number(claimCounts.all) || 0,
        pendingClaims: Number(claimCounts.pending) || 0,
        claimFollowUps: Number(claimCounts["follow-up"]) || 0,
        claimDocumentsPending: Number(claimCounts.documents) || 0,
        settledClaims: Number(claimCounts.settled) || 0,
        rejectedClaims: Number(claimCounts.rejected) || 0,
        totalLeads: Number(leadCounts.totalProfiles) || 0,
        newLeads: Number(leadCounts.newLeads) || 0,
        leadFollowUps: Number(leadCounts.followUpRequired) || 0,
        interestedLeads: Number(leadCounts.interested) || 0,
        convertedLeads: Number(leadCounts.converted) || 0,
        lostLeads: Number(leadCounts.lost) || 0,
      });
      setPremium({ ...EMPTY_PREMIUM, ...(reportingData.renewalCounts || {}) });
      setViewerRole(overviewData.viewerRole || "");
      setLeadAgents(overviewData.leadAgentReport?.agents || []);
    } catch (loadError) {
      if (loadError?.name !== "AbortError") {
        setError(loadError?.message || "Dashboard data could not be loaded.");
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new globalThis.AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard, refreshKey]);

  const renewalChart = [
    { label: "Pending", value: summary.pendingRenewals, color: "#f59e0b", href: "/dashboard/renewals/policies?tab=all" },
    { label: "Renewed", value: summary.renewedPolicies, color: "#10b981", href: "/dashboard/renewals/renewed" },
    { label: "Lost", value: summary.lostPolicies, color: "#ef4444", href: "/dashboard/renewals/lost" },
  ];
  const claimChart = [
    { label: "Pending", value: summary.pendingClaims, color: "#f97316", href: "/operations/claims-management?filter=pending" },
    { label: "Settled", value: summary.settledClaims, color: "#10b981", href: "/operations/claims-management?filter=settled" },
    { label: "Rejected", value: summary.rejectedClaims, color: "#ef4444", href: "/operations/claims-management?filter=rejected" },
  ];
  const leadChart = [
    { label: "New", value: summary.newLeads, color: "#3b82f6", href: "/operations/lead-generation?status=New%20Lead" },
    { label: "Follow-up", value: summary.leadFollowUps, color: "#f59e0b", href: "/operations/lead-generation?status=Follow-up%20Required" },
    { label: "Interested", value: summary.interestedLeads, color: "#8b5cf6", href: "/operations/lead-generation?status=Interested" },
    { label: "Converted", value: summary.convertedLeads, color: "#10b981", href: "/operations/lead-generation?status=Converted" },
    { label: "Lost", value: summary.lostLeads, color: "#ef4444", href: "/operations/lead-generation?status=Lost" },
  ];

  if (loading) {
    return (
      <div className="dashboard-overview-loading">
        <RefreshCw className="spin" size={24} />
        <span>Loading management overview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-overview-error">
        <AlertTriangle size={19} />
        <span>{error} Dashboard totals are hidden until live data is available.</span>
        <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      <div className="dashboard-overview-toolbar">
        <div>
          <span className="dashboard-overview-eyebrow">Live operations</span>
          <h1>Today at a glance</h1>
          <p>Policies, renewals, follow-ups, uploads and team activity in one place.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <section className="dashboard-command-grid">
        <SummaryLink
          prominent
          icon={ShieldCheck}
          label="Active Policies"
          value={summary.activePolicies}
          note="Current live portfolio"
           href="/policy-records?lifecycle=active"
          tone="green"
        />
        <SummaryLink
          prominent
          icon={Users}
          label="Total Customers"
          value={summary.totalCustomers}
          note="Distinct active customers"
           href="/customer-management?scope=active-policyholders"
          tone="blue"
        />
        <section className="dashboard-renewal-window">
          <div className="dashboard-summary-panel-head">
            <div>
              <span>Renewal window</span>
              <strong>Policies approaching expiry</strong>
            </div>
            <CalendarClock size={21} />
          </div>
          <div className="dashboard-renewal-window-grid">
             <Link href="/dashboard/renewals/policies?tab=due_today" prefetch={false}>
              <span>Today</span><strong>{summary.expiringToday}</strong><small>Immediate</small>
            </Link>
            <Link href="/dashboard/renewals/policies?tab=due_7" prefetch={false}>
              <span>7 Days</span><strong>{summary.expiring7Days}</strong><small>Near term</small>
            </Link>
            <Link href="/dashboard/renewals/policies?tab=due_30" prefetch={false}>
              <span>30 Days</span><strong>{summary.expiring30Days}</strong><small>Pipeline</small>
            </Link>
          </div>
        </section>
      </section>

      <section className="dashboard-status-grid">
        <section className="dashboard-summary-panel renewal-pipeline">
          <div className="dashboard-summary-panel-head">
            <div><span>Renewal pipeline</span><strong>Current outcomes</strong></div>
            <RefreshCw size={20} />
          </div>
          <div className="dashboard-summary-link-grid three">
             <SummaryLink icon={Clock3} label="Pending" value={summary.pendingRenewals} href="/dashboard/renewals/policies?tab=all" tone="amber" />
             <SummaryLink icon={CheckCircle2} label="Renewed" value={summary.renewedPolicies} href="/dashboard/renewals/renewed" tone="green" />
             <SummaryLink icon={XCircle} label="Lost" value={summary.lostPolicies} href="/dashboard/renewals/lost" tone="red" />
          </div>
        </section>

        <section className="dashboard-summary-panel work-queue">
          <div className="dashboard-summary-panel-head">
            <div><span>Work queue</span><strong>Items requiring action</strong></div>
            <Activity size={20} />
          </div>
          <div className="dashboard-summary-link-grid four">
             <SummaryLink icon={PhoneCall} label="Follow-ups Today" value={summary.todayFollowUps} href="/dashboard/renewals/follow-ups?filter=today" tone="blue" />
             <SummaryLink icon={AlertTriangle} label="Overdue" value={summary.overdueFollowUps} href="/dashboard/renewals/follow-ups?filter=overdue" tone="red" />
             <SummaryLink icon={FileCheck2} label="PDF Reviews" value={summary.pendingPdfReviews} href="/upload-history?status=REVIEW_REQUIRED" tone="purple" />
             <SummaryLink icon={FileWarning} label="Failed" value={summary.failedExtractions} href="/upload-history?status=FAILED" tone="red" />
          </div>
        </section>
      </section>

      <section className="dashboard-status-grid dashboard-domain-grid">
        <section className="dashboard-summary-panel">
          <div className="dashboard-summary-panel-head">
            <div><span>Claims</span><strong>Claim workload</strong></div>
            <ClipboardList size={20} />
          </div>
          <div className="dashboard-summary-link-grid six">
            <SummaryLink icon={ClipboardList} label="All Claims" value={summary.totalClaims} href="/operations/claims-management" tone="blue" />
            <SummaryLink icon={AlertTriangle} label="Pending Claims" value={summary.pendingClaims} href="/operations/claims-management?filter=pending" tone="red" />
            <SummaryLink icon={PhoneCall} label="Claim Follow-ups" value={summary.claimFollowUps} href="/operations/claims-management?filter=follow-up" tone="amber" />
            <SummaryLink icon={FileWarning} label="Documents Pending" value={summary.claimDocumentsPending} href="/operations/claims-management?filter=documents" tone="purple" />
            <SummaryLink icon={CheckCircle2} label="Settled Claims" value={summary.settledClaims} href="/operations/claims-management?filter=settled" tone="green" />
            <SummaryLink icon={XCircle} label="Rejected Claims" value={summary.rejectedClaims} href="/operations/claims-management?filter=rejected" tone="red" />
          </div>
        </section>

        <section className="dashboard-summary-panel">
          <div className="dashboard-summary-panel-head">
            <div><span>Lead generation</span><strong>Customer acquisition pipeline</strong></div>
            <UserPlus size={20} />
          </div>
          <div className="dashboard-summary-link-grid six">
            <SummaryLink icon={Users} label="Total Leads" value={summary.totalLeads} href="/operations/lead-generation" tone="blue" />
            <SummaryLink icon={UserPlus} label="New Leads" value={summary.newLeads} href="/operations/lead-generation?status=New%20Lead" tone="green" />
            <SummaryLink icon={PhoneCall} label="Lead Follow-ups" value={summary.leadFollowUps} href="/operations/lead-generation?status=Follow-up%20Required" tone="amber" />
            <SummaryLink icon={UserCheck} label="Interested" value={summary.interestedLeads} href="/operations/lead-generation?status=Interested" tone="purple" />
            <SummaryLink icon={UserCheck} label="Converted" value={summary.convertedLeads} href="/operations/lead-generation?status=Converted" tone="green" />
            <SummaryLink icon={XCircle} label="Lost Leads" value={summary.lostLeads} href="/operations/lead-generation?status=Lost" tone="red" />
          </div>
        </section>
      </section>

      <Panel title="Premium performance" subtitle="Saved and renewal premium totals">
        <div className="dashboard-premium-grid">
          {[
            ["Today", "eod", premium.eodPremium, `${premium.eodCount} policies`],
            ["This Month", "mtd", premium.mtdPremium, `${premium.mtdCount} policies`],
            ["This Year", "ytd", premium.ytdPremium, `${premium.ytdCount} policies`],
            ["Renewed", "renewed", premium.renewedPremium, `${premium.renewed} policies`],
            ["Lost", "lost", premium.lostPremium, `${premium.lost} policies`],
          ].map(([label, period, value, note]) => (
            <Link key={label} className="dashboard-premium-card" href={`/premium-reports/${period}`} prefetch={false}>
              <CircleDollarSign size={18} />
              <span>{label}</span>
              <strong>{formatMoney(value || 0)}</strong>
              <small>{note}</small>
            </Link>
          ))}
        </div>
      </Panel>

      <section className="dashboard-chart-grid">
        <VerticalBarChart title="Renewal outcomes" subtitle="Pending, renewed and lost" items={renewalChart} />
        <VerticalBarChart title="Claims distribution" subtitle={`${summary.totalClaims} claims in total`} items={claimChart} />
        <LineChart title="Lead pipeline" subtitle={`${summary.totalLeads} leads in total`} items={leadChart} />
      </section>

      {viewerRole === "SUPER_ADMIN" ? (
        <Panel
          title="Lead generation by agent"
          subtitle="All agents ranked by leads added"
          action={<Link className="dashboard-panel-link" href="/dashboard/reports/lead-generation" prefetch={false}>Full report <ArrowRight size={14} /></Link>}
        >
          <div className="dashboard-agent-list">
            {leadAgents.length ? leadAgents.map((agent, index) => (
              <Link
                key={agent.agentId || `unassigned-${index}`}
                className="dashboard-agent-row dashboard-agent-row-link"
                href={`/operations/lead-generation?createdById=${encodeURIComponent(agent.agentId || "unassigned")}`}
                prefetch={false}
              >
                <span className="dashboard-agent-rank">{index + 1}</span>
                <div><strong>{agent.agentName}</strong><span>{agent.newLeads} new · {agent.followUpRequired} follow-up · {agent.converted} converted</span></div>
                <strong>{agent.totalLeads} leads</strong>
              </Link>
            )) : <div className="dashboard-empty-list">No agent-created leads available.</div>}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
