import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";

export default function BlogLoading() {
  return (
    <div className="landing-shell blog-feed-page bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
      <PublicHeader />
      <main>
        <section className="blog-hero">
          <div className="blog-hero-inner">
            <span className="blog-eyebrow">
              <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
              Insurance Knowledge Hub
            </span>
            <h1 className="blog-hero-title">
              Insurance Insights & <span className="blog-title-gradient">Expert Guides</span>
            </h1>
            <p className="blog-hero-subtitle">
              Practical guidance on claims, renewals, and risk management — written by insurance professionals.
            </p>
          </div>
        </section>

        <section style={{ padding: "60px 0", maxWidth: 1220, margin: "0 auto", width: "min(calc(100% - 40px), 1220px)" }}>
          <style>{`
            @keyframes skeletonShimmer {
              0%   { opacity: 1; }
              50%  { opacity: 0.5; }
              100% { opacity: 1; }
            }
          `}</style>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  background: "#f6f8fa",
                  overflow: "hidden",
                  animation: "skeletonShimmer 1.8s ease-in-out infinite",
                }}
              >
                <div style={{ height: 200, background: "#e9ecef" }} />
                <div style={{ padding: "20px 22px" }}>
                  <div style={{ height: 12, width: "40%", background: "#e2e8f0", borderRadius: 6, marginBottom: 12 }} />
                  <div style={{ height: 16, width: "90%", background: "#e2e8f0", borderRadius: 6, marginBottom: 8 }} />
                  <div style={{ height: 16, width: "70%", background: "#e2e8f0", borderRadius: 6, marginBottom: 16 }} />
                  <div style={{ height: 12, width: "60%", background: "#e9ecef", borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
