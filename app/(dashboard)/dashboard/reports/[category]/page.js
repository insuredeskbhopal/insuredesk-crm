export const dynamic = "force-dynamic";

import Link from "next/link";
import { ReportDetailPage } from "@/app/components/reports/ReportingCenter";
import { REPORT_CATEGORIES, loadReportingCenterData } from "@/app/lib/reporting/business-intelligence";

export default async function BusinessIntelligenceReportPage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const category = String(params.category || "executive");
  const knownCategory = REPORT_CATEGORIES.some((item) => item.id === category);

  if (!knownCategory) {
    return (
      <main className="state-page">
        <section className="state-card error-state">
          <div className="state-icon">!</div>
          <p className="eyebrow">Report not found</p>
          <h1>Unknown reporting category</h1>
          <Link className="primary-action" href="/dashboard/reports">Back to Reports</Link>
        </section>
      </main>
    );
  }

  const data = await loadReportingCenterData({ category, searchParams });
  return (
    <ReportDetailPage
      report={data.report}
      filters={data.filters}
      users={data.users}
      lastUpdated={data.lastUpdated}
    />
  );
}
