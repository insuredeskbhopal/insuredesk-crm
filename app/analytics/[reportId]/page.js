import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import { findReportById, getReportRecords, formatMoney } from "@/lib/analytics";
import RecordsTable from "@/app/components/RecordsTable";

export default async function AnalyticsReportPage({ params }) {
  const { reportId } = await params;

  const records = await prisma.policyRecord.findMany({
    orderBy: { savedAt: "desc" },
    select: {
      id: true,
      savedAt: true,
      data: true,
      pdfFileName: true,
      pdfMimeType: true
    }
  });

  const normalizedRecords = records.map(normalizeRecord);
  const report = findReportById(normalizedRecords, reportId);
  const matchingRecords = getReportRecords(normalizedRecords, report?.report || report);
  const totalPremium = matchingRecords.reduce((sum, record) => sum + (Number(record.premium?.toString().replace(/,/g, "")) || 0), 0);
  const totalSumInsured = matchingRecords.reduce((sum, record) => sum + (Number(record.sumInsured?.toString().replace(/,/g, "")) || 0), 0);

  if (!report) {
    return (
      <main className="state-page">
        <section className="state-card error-state">
          <div className="state-icon">⚠️</div>
          <p className="eyebrow">Report not found</p>
          <h1>Unknown analytics report</h1>
          <p>The requested report ID does not match any available dashboard report.</p>
          <Link className="primary-action" href="/">Back to Dashboard</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="analytics-report-page">
      <section className="glass-panel report-detail-card">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Analytics Report</p>
            <h1>{report.report?.title || report.label}</h1>
            <p>{report.report?.label || report.hint}</p>
          </div>
          <Link className="secondary-action" href="/">
            Back to Dashboard
          </Link>
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
        </div>
      </section>

      <section className="glass-panel report-detail-table">
        <h2>Report records</h2>
        <RecordsTable records={matchingRecords} />
      </section>
    </main>
  );
}
