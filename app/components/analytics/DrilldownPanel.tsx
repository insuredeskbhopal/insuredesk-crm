import { Download } from "lucide-react";

export default function DrilldownPanel({
  title,
  label,
  selectedReport,
  selectedReportRecords,
  onClearReport,
  onExportJson,
  children
}) {
  return (
    <section className="glass-panel report-drilldown">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Report Drill-down</p>
          <h2>{title}</h2>
          <p>{label}</p>
        </div>
        <div className="actions">
          <button type="button" disabled={!selectedReport} onClick={onClearReport}>Clear</button>
          <button type="button" disabled={!selectedReportRecords.length} onClick={onExportJson}>
            <Download size={17} /> JSON
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

