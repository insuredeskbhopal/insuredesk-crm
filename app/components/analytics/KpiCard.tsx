export default function KpiCard({ item, onClick }) {
  return (
    <button className="report-kpi-card" type="button" onClick={onClick}>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <small>{item.hint}</small>
    </button>
  );
}
