export default function Loading() {
  return (
    <main className="loading-shell" aria-label="Loading BIMAHEADQUARTER">
      <aside className="loading-side">
        <div className="skeleton logo-line" />
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="skeleton nav-line" key={index} />
        ))}
      </aside>
      <section className="loading-main">
        <div className="loading-top">
          <div className="skeleton search-line" />
          <div className="skeleton avatar-line" />
        </div>
        <div className="loading-content">
          <div className="skeleton title-line" />
          <div className="skeleton subtitle-line" />
          <div className="skeleton-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="skeleton-card" key={index}>
                <div className="skeleton small-line" />
                <div className="skeleton medium-line" />
              </div>
            ))}
          </div>
          <div className="skeleton-panel">
            <div className="skeleton table-head-line" />
            {Array.from({ length: 7 }).map((_, index) => (
              <div className="skeleton table-row-line" key={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
