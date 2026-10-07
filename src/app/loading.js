export default function Loading() {
  return (
    <div className="page-inner" style={{ padding: "20px", display: "grid", gap: "16px" }}>
      <div style={{ display: "grid", gap: "8px" }}>
        <div className="skeleton title-line" />
        <div className="skeleton subtitle-line" />
      </div>
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="skeleton-panel">
        <div className="skeleton table-head-line" />
        <div className="skeleton table-row-line" />
        <div className="skeleton table-row-line" />
        <div className="skeleton table-row-line" />
        <div className="skeleton table-row-line" />
        <div className="skeleton table-row-line" />
      </div>
    </div>
  );
}
