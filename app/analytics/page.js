import Link from "next/link";

export default function AnalyticsIndexPage() {
  return (
    <main className="state-page">
      <section className="state-card">
        <div className="state-icon">📊</div>
        <p className="eyebrow">Analytics</p>
        <h1>Choose a report from the dashboard</h1>
        <p>
          The analytics pages are generated from the policy data in your database. Open the main dashboard and click any KPI or report item to view a dedicated report page.
        </p>
        <Link className="primary-action" href="/">
          Back to Dashboard
        </Link>
      </section>
    </main>
  );
}
