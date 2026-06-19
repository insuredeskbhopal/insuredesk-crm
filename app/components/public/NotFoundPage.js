import Link from "next/link";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";

const quickLinks = [
  { label: "Explore Services", href: "/services", icon: "shield" },
  { label: "Claims Assistance", href: "/services/claims-assistance", icon: "support_agent" },
  { label: "Policy Renewals", href: "/services/policy-renewals", icon: "event_repeat" },
];

export default function NotFoundPage() {
  return (
    <div className="landing-shell not-found-page bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
      <PublicHeader />

      <main>
        <section className="not-found-hero">
          <div className="not-found-hero-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="not-found-copy">
              <span className="not-found-eyebrow">
                <span className="material-symbols-outlined">travel_explore</span>
                Page not found
              </span>
              <p className="not-found-code">404</p>
              <h1>This route is not insured.</h1>
              <p>
                The address may be mistyped or the page may have moved. Head back to BIMAHEADQUARTER
                and continue with insurance services, claims help, or renewals.
              </p>
              <div className="not-found-actions">
                <Link href="/" className="not-found-primary-action">
                  Back to Home
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link href="/contact" className="not-found-secondary-action">
                  Contact Team
                </Link>
              </div>
            </div>

            <div className="not-found-panel" aria-label="Helpful links">
              <div className="not-found-panel-icon">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <h2>Find the right desk</h2>
              <p>Use a trusted path below instead of retrying the broken route.</p>
              <div className="not-found-link-list">
                {quickLinks.map((item) => (
                  <Link href={item.href} key={item.href}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span>{item.label}</span>
                    <span className="material-symbols-outlined">chevron_right</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
