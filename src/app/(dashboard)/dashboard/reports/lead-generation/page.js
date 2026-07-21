export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSessionFromCookies } from "@/lib/records/scoped-data";
import { loadLeadAgentReport } from "@/lib/reports/lead-generation";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export default async function LeadGenerationReportPage({ searchParams }) {
  const session = await getCurrentSessionFromCookies();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/dashboard");

  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const q = String(query.q || "").trim();
  const report = await loadLeadAgentReport({ session, page, limit: 25, q });
  const pageHref = (targetPage) => {
    const values = new globalThis.URLSearchParams();
    if (q) values.set("q", q);
    if (targetPage > 1) values.set("page", String(targetPage));
    return values.size ? `?${values}` : "?";
  };

  return (
    <main className="analytics-report-page">
      <section className="glass-panel report-detail-card">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Super Admin Report</p>
            <h1>Lead generation by agent</h1>
            <p>Live database totals grouped by the user who created each lead.</p>
          </div>
          <Link className="secondary-action" href="/operations/lead-generation" prefetch={false}>
            Open Lead Generation
          </Link>
        </div>
        <div className="report-summary-grid">
          <div className="metric-card">
            <span>Agents with leads</span>
            <strong>{report.totalAgents}</strong>
          </div>
          <div className="metric-card">
            <span>Report access</span>
            <strong>Super Admin</strong>
          </div>
        </div>
      </section>

      <form className="glass-panel" method="get" style={{ display: "flex", gap: "10px", alignItems: "end", padding: "14px 18px" }}>
        <label style={{ flex: 1 }}>
          <span>Search agent</span>
          <input name="q" defaultValue={q} placeholder="Agent name or email" />
        </label>
        <button className="primary-action" type="submit">Apply</button>
      </form>

      <section className="glass-panel report-detail-table">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Agent contribution</p>
            <h2>Lead totals and outcomes</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Total Leads</th>
                <th>New</th>
                <th>Follow-up</th>
                <th>Interested</th>
                <th>Converted</th>
                <th>Lost</th>
                <th>Latest Lead</th>
              </tr>
            </thead>
            <tbody>
              {report.agents.length ? report.agents.map((agent) => (
                <tr key={agent.agentId || "unassigned"}>
                  <td>
                    <Link href={`/operations/lead-generation?createdById=${encodeURIComponent(agent.agentId || "unassigned")}`} prefetch={false}>
                      <strong>{agent.agentName}</strong>
                    </Link>
                    <br />
                    <small>{agent.agentEmail || "No linked user"}</small>
                  </td>
                  <td><strong>{agent.totalLeads}</strong></td>
                  <td>{agent.newLeads}</td>
                  <td>{agent.followUpRequired}</td>
                  <td>{agent.interested}</td>
                  <td>{agent.converted}</td>
                  <td>{agent.lost}</td>
                  <td>{formatDate(agent.latestLeadAt)}</td>
                </tr>
              )) : (
                <tr><td colSpan="8">No lead creators match this report.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Page {report.page} of {report.totalPages} · {report.totalAgents} agents</span>
          <div className="pagination-actions">
            {report.page > 1 ? <Link className="secondary-action" href={pageHref(report.page - 1)}>Previous</Link> : null}
            {report.page < report.totalPages ? <Link className="secondary-action" href={pageHref(report.page + 1)}>Next</Link> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
