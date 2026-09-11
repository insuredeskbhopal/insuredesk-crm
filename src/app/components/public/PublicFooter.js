import Link from "next/link";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { BUSINESS_DETAILS, SITE_NAME } from "@/lib/seo/site";

const serviceLinks = [
  ["General Insurance", "/services/general-insurance"],
  ["Health Insurance", "/services/health-insurance"],
  ["Motor Insurance", "/services/motor-insurance"],
  ["Life Insurance", "/services/life-insurance"],
  ["Home Insurance", "/services/general-insurance"],
  ["Travel Insurance", "/services/general-insurance"],
  ["Fire Insurance", "/services/fire-insurance"],
];

const moreCoverageLinks = [
  ["Commercial Insurance", "/services/commercial-insurance"],
  ["Warehouse Insurance", "/services/warehouse-insurance"],
  ["Marine Insurance", "/services/marine-insurance"],
  ["Claims Assistance", "/services/claims-assistance"],
  ["Policy Renewals", "/services/policy-renewals"],
  ["Risk Advisory", "/services/risk-advisory"],
];

const quickLinks = [
  ["Home", "/"],
  ["Services", "/services"],
  ["About", "/about"],
  ["Blog", "/blog"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"],
];

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div className="public-footer-top">
          <div className="public-footer-brand-block">
            <div className="footer-brand">
              <BrandLogo href="/" variant="white" />
            </div>

            <div className="footer-brand-badge">
              <span className="footer-badge-dot" />
              <span>IRDAI Regd. IMF · Lic. No. IMF182444280220190240</span>
            </div>

            <p className="footer-brand-desc">
              Independent insurance consultancy delivering unbiased risk advisory, multi-insurer quote comparisons, and end-to-end claim advocacy across India.
            </p>

            <div className="footer-brand-chips">
              <span className="footer-chip">
                <span className="material-symbols-outlined" aria-hidden="true">verified</span>
                25+ Insurers
              </span>
              <span className="footer-chip">
                <span className="material-symbols-outlined" aria-hidden="true">support_agent</span>
                Claims Advocacy
              </span>
              <span className="footer-chip">
                <span className="material-symbols-outlined" aria-hidden="true">shield</span>
                Est. {BUSINESS_DETAILS.foundingDate || "2015"}
              </span>
            </div>
          </div>

          <div className="public-footer-actions" aria-label="Contact actions">
            <a href={`tel:${BUSINESS_DETAILS.phoneHref}`} className="footer-action-call">
              <span className="material-symbols-outlined" aria-hidden="true">call</span>
              <span className="footer-action-desktop">Call {BUSINESS_DETAILS.phone}</span>
              <span className="footer-action-mobile">Call</span>
            </a>
            <a href={`mailto:${BUSINESS_DETAILS.email}`} className="footer-action-mail">
              <span className="material-symbols-outlined" aria-hidden="true">mail</span>
              <span className="footer-action-desktop">{BUSINESS_DETAILS.email}</span>
              <span className="footer-action-mobile">Email</span>
            </a>
            <a href={BUSINESS_DETAILS.mapsUrl} target="_blank" rel="noopener noreferrer" className="footer-action-dir">
              <span className="material-symbols-outlined" aria-hidden="true">directions</span>
              <span className="footer-action-desktop">Directions</span>
              <span className="footer-action-mobile">Directions</span>
            </a>
          </div>
        </div>

        <div className="public-footer-main">
          <section className="public-footer-contact" aria-labelledby="footer-contact-heading">
            <span className="public-footer-eyebrow">Corporate Office</span>
            <h5 id="footer-contact-heading">{BUSINESS_DETAILS.legalName}</h5>
            <a
              href={BUSINESS_DETAILS.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="public-footer-address"
            >
              <span className="material-symbols-outlined">location_on</span>
              <span>{BUSINESS_DETAILS.shortAddress}</span>
            </a>
            <div className="public-footer-meta">
              <span className="material-symbols-outlined">schedule</span>
              <span>{BUSINESS_DETAILS.hours}</span>
            </div>
            <a
              href={BUSINESS_DETAILS.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="public-footer-direction"
            >
              <span className="material-symbols-outlined">directions</span>
              Directions
            </a>
          </section>

          <nav className="public-footer-nav" aria-label="Footer navigation">
            <div>
              <h5>Company</h5>
              <ul>
                {quickLinks.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5>Services</h5>
              <ul>
                {serviceLinks.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5>More Coverage</h5>
              <ul>
                {moreCoverageLinks.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="public-footer-bottom">
          <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved. Bima Headquarter is a brand owned and operated by InsureDesk IMF Pvt. Ltd. (IRDAI Regd. IMF License No. IMF182444280220190240 · CIN: U66000MP2018PTC046788). Regulated Intermediary under IRDAI guidelines. Insurance is the subject matter of solicitation. Policy issuance, terms, rates, and claim settlements are subject to insurer underwriting decisions.</p>
          <div>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms-and-conditions">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
            <Link href="/faq">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
