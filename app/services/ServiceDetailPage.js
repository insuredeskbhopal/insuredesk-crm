
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import LandingEffects from "@/app/components/LandingEffects";
import PublicFooter from "@/app/components/public/PublicFooter";
import { BUSINESS_DETAILS } from "@/lib/seo/site";
import { getRelatedServices, getServicePageSchema } from "./servicePageData";

export default function ServiceDetailPage({ service }) {
  const pageSchema = getServicePageSchema(service);
  const relatedServices = getRelatedServices(service);

  return (
    <>
      <LandingEffects />
      <Script
        id={`${service.slug}-schema`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />

      <div className="landing-shell service-detail-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />

        <header className="service-detail-hero">
          <div className="service-detail-hero-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="service-detail-hero-copy reveal">
              <span className="service-detail-eyebrow">
                <span className="material-symbols-outlined">{service.icon}</span>
                {service.eyebrow}
              </span>
              <h1>{service.title}</h1>
              <p>{service.description}</p>
              <div className="service-detail-actions">
                <Link href="/contact">Get Consultation</Link>
                <a href={`tel:${BUSINESS_DETAILS.phoneHref}`}>Call {BUSINESS_DETAILS.phone}</a>
              </div>
            </div>
            <div className="service-detail-hero-media reveal" aria-hidden="true">
              <div style={{ backgroundImage: `url(${service.heroImage})` }} />
            </div>
          </div>
        </header>

        <main className="service-detail-main">
          <div className="service-detail-main-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <article className="service-detail-content reveal">
              <section className="service-detail-section">
                <span className="service-detail-section-kicker">Overview</span>
                <h2>Built for real-world insurance decisions</h2>
                <div className="service-detail-prose">
                  {service.overview.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>

              <section className="service-detail-section">
                <span className="service-detail-section-kicker">Who Needs This</span>
                <h2>Best suited for</h2>
                <div className="service-detail-audience-grid">
                  {service.audiences.map((audience) => (
                    <div key={audience}>
                      <span className="material-symbols-outlined">check_circle</span>
                      <p>{audience}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="service-detail-section">
                <span className="service-detail-section-kicker">Benefits</span>
                <h2>What our advisory helps you avoid</h2>
                <div className="service-detail-benefits">
                  {service.benefits.map(([title, text]) => (
                    <div key={title}>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="service-detail-section">
                <span className="service-detail-section-kicker">Questions</span>
                <h2>Frequently asked questions</h2>
                <div className="service-detail-faqs">
                  {service.faqs.map(([question, answer]) => (
                    <details key={question}>
                      <summary>
                        <span>{question}</span>
                        <span className="material-symbols-outlined">expand_more</span>
                      </summary>
                      <p>{answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            </article>

            <aside className="service-detail-sidebar reveal">
              <div className="service-detail-side-card service-detail-side-cta">
                <span className="material-symbols-outlined">{service.icon}</span>
                <h3>Speak to an Advisor</h3>
                <p>Get policy guidance from a licensed insurance marketing firm serving clients across India.</p>
                <a href={`tel:${BUSINESS_DETAILS.phoneHref}`}>Call {BUSINESS_DETAILS.phone}</a>
                <Link href="/contact">Request Callback</Link>
              </div>

              <div className="service-detail-side-card">
                <h3>Related Services</h3>
                <ul>
                  {relatedServices.map((item) => (
                    <li key={item.slug}>
                      <Link href={`/services/${item.slug}`}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="service-detail-side-card service-detail-trust-card">
                <p>BIMAHEADQUARTER is a brand of</p>
                <strong>{BUSINESS_DETAILS.legalName}</strong>
                <span>IRDAI Registered Insurance Marketing Firm. Serving clients across India.</span>
              </div>
            </aside>
          </div>
        </main>

        <section className="service-detail-bottom-cta">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div>
              <span>{service.eyebrow}</span>
              <h2>{service.ctaTitle}</h2>
              <p>{service.ctaText}</p>
              <Link href="/contact">Start Consultation</Link>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
