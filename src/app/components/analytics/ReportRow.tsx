export default function ReportRow({ item, onClick }) {
  return (
    <button className="report-row" type="button" onClick={onClick}>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <small>{item.hint}</small>
    </button>
  );
}
