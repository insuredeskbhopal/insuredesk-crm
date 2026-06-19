export default function ReportPanel({ eyebrow = "Clickable Report", title, subtitle, children }) {
  return (
    <section className="glass-panel report-panel">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className="report-list">{children}</div>
    </section>
  );
}
