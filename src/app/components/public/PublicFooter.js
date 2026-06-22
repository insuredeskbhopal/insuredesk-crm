import Link from "next/link";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { BUSINESS_DETAILS } from "@/lib/seo/site";

const serviceLinks = [
  ["General Insurance", "/services/general-insurance"],
  ["Motor Insurance", "/services/motor-insurance"],
  ["Health Insurance", "/services/health-insurance"],
  ["Life Insurance", "/services/life-insurance"],
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
              <BrandLogo href="/" />
            </div>
            <p>Institutional insurance consultancy and claim assistance by {BUSINESS_DETAILS.legalName}.</p>
          </div>

          <div className="public-footer-actions" aria-label="Contact actions">
            <a href={`tel:${BUSINESS_DETAILS.phoneHref}`}>
              <span className="material-symbols-outlined">call</span>
              Call {BUSINESS_DETAILS.phone}
            </a>
            <a href={`mailto:${BUSINESS_DETAILS.email}`}>
              <span className="material-symbols-outlined">mail</span>
              {BUSINESS_DETAILS.email}
            </a>
            <a href={BUSINESS_DETAILS.mapsUrl} target="_blank" rel="noopener noreferrer">
              <span className="material-symbols-outlined">directions</span>
              Directions
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
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5>Services</h5>
              <ul className="public-footer-service-list">
                {serviceLinks.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="public-footer-bottom">
          <p>© {new Date().getFullYear()} BIMAHEADQUARTER. All rights reserved.</p>
          <div>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms-and-conditions">Terms</Link>
            <Link href="/faq">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
