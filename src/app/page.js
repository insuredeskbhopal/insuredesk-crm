import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import LandingEffects from "@/app/components/LandingEffects";
import PublicFooter from "@/app/components/public/PublicFooter";
import { INSURER_LOGOS } from "@/app/components/brand/logoAssets";
import { BUSINESS_DETAILS, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/seo/site";
import { HOMEPAGE_CONTENT } from "@/content/homepage";
import { SERVICES } from "@/content/services";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: "Bima Headquarter",
      legalName: BUSINESS_DETAILS.legalName,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/main-logo-wide.webp`,
      email: BUSINESS_DETAILS.email,
      telephone: BUSINESS_DETAILS.phoneHref,
      description: SITE_DESCRIPTION,
      areaServed: BUSINESS_DETAILS.serviceArea,
      knowsAbout: [
        "Insurance consulting",
        "Claim assistance",
        ...SERVICES.map((s) => s.title),
      ],
    },
    {
      "@type": "InsuranceAgency",
      "@id": `${SITE_URL}/#local-business`,
      name: SITE_NAME,
      url: SITE_URL,
      image: `${SITE_URL}/brand/main-logo-wide.webp`,
      telephone: BUSINESS_DETAILS.phoneHref,
      email: BUSINESS_DETAILS.email,
      address: {
        "@type": "PostalAddress",
        ...BUSINESS_DETAILS.address,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 23.1956,
        longitude: 77.4608,
      },
      areaServed: {
        "@type": "Country",
        name: BUSINESS_DETAILS.serviceArea,
      },
      parentOrganization: {
        "@id": `${SITE_URL}/#organization`,
      },
      priceRange: "$$",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      headline: SITE_TITLE,
      description: SITE_DESCRIPTION,
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      inLanguage: "en-IN",
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#insurance-consulting-service`,
      name: "Insurance and Claim Consulting",
      serviceType: "Insurance consulting and claim assistance",
      provider: {
        "@id": `${SITE_URL}/#organization`,
      },
      areaServed: {
        "@type": "Country",
        name: BUSINESS_DETAILS.serviceArea,
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Insurance Consulting Services",
        itemListElement: SERVICES.map((s) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: s.fullName || s.title,
          },
        })),
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: HOMEPAGE_CONTENT.faqSection.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
      ],
    },
  ],
};

export default function RootPage() {
  const partnerLogos = [...INSURER_LOGOS, ...INSURER_LOGOS];

  return (
    <>
      <Script
        id="bimaheadquarter-structured-data"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0px 10px 30px rgba(26, 43, 78, 0.05);
            position: relative;
            overflow: hidden;
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .glass-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.4) 0%, transparent 50%);
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }

        .glass-card:hover::before {
            opacity: 1;
        }

        .glass-card:hover {
            transform: translateY(-4px);
            box-shadow: 0px 20px 40px rgba(26, 43, 78, 0.1);
        }

        .partner-slider {
            animation: slide 40s linear infinite;
        }

        @keyframes slide {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }

        .reveal {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .reveal.active {
            opacity: 1;
            transform: translateY(0);
        }

        .entry-anim {
            opacity: 0;
            transform: translateY(20px);
            animation: entry 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes entry {
            to { opacity: 1; transform: translateY(0); }
        }

        .preserve-3d {
            transform-style: preserve-3d;
        }
        
        .hero-brand-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(28, 108, 57, 0.08) !important;
            color: #1c6c39 !important;
            font-size: 11px;
            font-weight: 700;
            padding: 6px 14px;
            border-radius: 9999px;
            border: 1px solid rgba(28, 108, 57, 0.12);
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 24px;
        }
        .hero-brand-pill .material-symbols-outlined {
            color: #1c6c39 !important;
            font-size: 16px;
        }
        .hero-stats-container {
            display: flex;
            flex-wrap: wrap;
            align-items: stretch;
            row-gap: 20px;
            column-gap: 40px;
            margin-top: 48px;
            width: 100%;
            justify-content: flex-start;
        }
        .hero-stat-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-start;
            position: relative;
        }
        .hero-stat-col:not(:last-child)::after {
            content: "";
            position: absolute;
            right: -20px;
            top: 10%;
            height: 80%;
            width: 1px;
            background-color: #c5c6cf;
        }
        .hero-stat-value {
            font-size: 30px;
            font-weight: 700;
            color: #031638 !important;
            line-height: 1.1;
        }

        .hero-stat-label {
            font-size: 12px;
            font-weight: 700;
            color: #5c5d66 !important;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-top: 6px;
            line-height: 1.2;
        }
        @media (max-width: 640px) {
            .hero-stats-container {
                display: flex !important;
                flex-direction: row !important;
                column-gap: 24px !important;
                row-gap: 8px !important;
                margin-top: 32px !important;
                justify-content: center !important;
                width: 100% !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }
            .hero-stat-col:not(:last-child)::after {
                right: -12px !important;
                display: block !important;
            }
            .hero-stat-value {
                font-size: 20px !important;
            }
            .hero-stat-label {
                font-size: 10px !important;
                margin-top: 4px !important;
            }
            .typing-headline {
                font-size: 32px !important;
                line-height: 1.15 !important;
            }
            .hero-content p {
                font-size: 15px !important;
                line-height: 1.55 !important;
            }
        }
        @media (max-width: 480px) {
            .hero-stats-container {
                column-gap: 20px !important;
            }
            .hero-stat-col:not(:last-child)::after {
                right: -10px !important;
            }
            .hero-stat-value {
                font-size: 18px !important;
            }
            .hero-stat-label {
                font-size: 9px !important;
                letter-spacing: 0.05em !important;
            }
            .typing-headline {
                font-size: 28px !important;
            }
            .hero-content .flex-wrap {
                width: 100% !important;
            }
            .hero-content .flex-wrap a {
                width: 100% !important;
            }
        }
        .typing-headline {
            text-align: left !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
        }
        .typing-line {
            display: block !important;
            text-align: left !important;
            margin-left: 0 !important;
            margin-right: auto !important;
            width: fit-content !important;
        }
      `,
        }}
      />

      <LandingEffects />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />
        <main>
          <header
            className="relative pt-24 pb-32 flex items-center justify-start min-h-[640px] lg:min-h-[680px] isolate"
            id="hero"
          >
            <div className="max-w-container-max w-full mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
              <div className="hero-content flex flex-col items-start text-left justify-center max-w-[680px]">
                <div className="hero-brand-pill">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  {HOMEPAGE_CONTENT.hero.brandBadge}
                </div>
                <h1 className="typing-headline font-display-lg text-display-lg text-primary mb-6 leading-tight text-[40px] md:text-[48px] font-bold text-left">
                  <span className="typing-line typing-line-one">{HOMEPAGE_CONTENT.hero.headlineLine1}</span>
                  <span className="typing-line typing-line-two">
                    <span className="text-secondary">{HOMEPAGE_CONTENT.hero.headlineLine2Highlight}</span>{HOMEPAGE_CONTENT.hero.headlineLine2Tail}
                  </span>
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-2xl text-[18px] text-left">
                  {HOMEPAGE_CONTENT.hero.description}
                </p>
                <div className="flex flex-wrap gap-4 justify-start">
                  <a
                    href="#solutions"
                    className="px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-xl hover:translate-y-[-2px] transition-all border-0 min-h-0 text-[14px] inline-block text-center"
                  >
                    {HOMEPAGE_CONTENT.hero.ctaConsultationText}
                  </a>
                  <a
                    href="#process"
                    className="px-8 py-4 border-2 border-secondary text-secondary rounded-xl font-label-md text-label-md hover:bg-secondary/5 transition-all bg-transparent min-h-0 text-[14px] inline-block text-center"
                  >
                    {HOMEPAGE_CONTENT.hero.ctaClaimsText}
                  </a>
                </div>
                <div className="hero-stats-container">
                  {HOMEPAGE_CONTENT.hero.stats.map((stat, idx) => (
                    <div className="hero-stat-col" key={idx}>
                      <span
                        className="hero-stat-value"
                        id={stat.id}
                        suppressHydrationWarning={stat.suppressHydrationWarning || stat.isCounter}
                      >
                        {stat.value}
                      </span>
                      <span className="hero-stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {/* Partner Slider */}
          <section
            className="pt-4 pb-8 bg-surface-container-lowest overflow-hidden border-t border-b border-outline-variant/30"
            id="partners"
          >
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-2 text-center reveal">
              <p className="font-label-md text-on-surface-variant uppercase tracking-widest text-[12px] font-semibold">
                {HOMEPAGE_CONTENT.partnerSliderTitle}
              </p>
            </div>
            <div className="flex partner-slider whitespace-nowrap gap-10 items-center">
              {partnerLogos.map((logo, index) => (
                <span
                  className={`partner-logo-card ${logo.className || ""}`.trim()}
                  key={`${logo.src}-${index}`}
                >
                  <Image unoptimized src={logo.src} alt={`${logo.name} logo`} width={136} height={44} />
                </span>
              ))}
            </div>
          </section>

          {/* Insurance Categories Grid */}
          <section className="services-section py-24 relative overflow-hidden" id="solutions">
            <div className="services-section-texture absolute inset-0"></div>
            <div className="relative max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="services-heading text-center reveal">
                <div className="services-kicker">
                  <div></div>
                  <span>{HOMEPAGE_CONTENT.servicesSection.kicker}</span>
                  <div></div>
                </div>
                <h2 className="font-headline-lg font-extrabold tracking-tight">
                  {HOMEPAGE_CONTENT.servicesSection.heading}
                </h2>
                <p className="font-body-lg">
                  {HOMEPAGE_CONTENT.servicesSection.subheading.split("\n").map((line, lIdx) => (
                    <span key={lIdx}>
                      {line}
                      {lIdx < HOMEPAGE_CONTENT.servicesSection.subheading.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>

              <div className="services-grid">
                {SERVICES.filter((s) => s.slug !== "risk-advisory").map((service, index) => (
                  <Link
                    key={index}
                    href={service.route}
                    className="service-card group reveal"
                    style={{ transitionDelay: service.delay }}
                  >
                    <div className="service-card-copy">
                      {/* Shield background overlay */}
                      <div className="service-card-watermark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>

                      <div>
                        <div className="service-card-icon">
                          <span className="material-symbols-outlined text-[24px]">{service.icon}</span>
                        </div>
                        <h3 className="font-headline-md font-bold">{service.title}</h3>
                        <p className="text-body-md">{service.desc}</p>
                      </div>

                      <span className="service-card-link font-label-md group/btn">
                        Learn More{" "}
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </span>
                    </div>

                    <div className="service-card-media">
                      <div className="service-image-clip">
                        <Image src={service.image} alt={service.title} width={600} height={400} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Trust Indicator Bar */}
              <div className="services-trust-bar reveal">
                {HOMEPAGE_CONTENT.trustBar.map((item, idx) => (
                  <span key={idx} className="contents">
                    <div className="services-trust-item">
                      <span className="material-symbols-outlined">{item.icon}</span>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                    {idx < HOMEPAGE_CONTENT.trustBar.length - 1 && (
                      <div className="services-trust-divider"></div>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Why Choose Us: Bento Grid Layout */}
          <section className="py-24 bg-surface-container-low">
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 reveal">
                <div className="max-w-xl">
                  <h2 className="font-headline-lg text-headline-lg text-primary mb-4 text-[32px] font-bold">
                    {HOMEPAGE_CONTENT.whyChooseUs.heading}
                  </h2>
                  <p className="font-body-lg text-body-lg text-on-surface-variant text-[18px]">
                    {HOMEPAGE_CONTENT.whyChooseUs.subheading}
                  </p>
                </div>
                <a
                  href="#process"
                  className="font-label-md text-label-md text-primary inline-flex items-center gap-2 px-6 py-3 border border-outline rounded-xl hover:bg-white transition-all bg-transparent min-h-0 text-[14px]"
                >
                  {HOMEPAGE_CONTENT.whyChooseUs.ctaText}
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                {HOMEPAGE_CONTENT.whyChooseUs.cards.map((card, index) => (
                  <div
                    key={index}
                    className="glass-card p-10 rounded-3xl flex flex-col justify-between reveal border border-outline-variant/20"
                    style={{ transitionDelay: `${index * 0.1}s` }}
                  >
                    <div>
                      <span className="material-symbols-outlined text-secondary text-[40px] mb-6">
                        {card.icon}
                      </span>
                      <h3 className="font-headline-md text-headline-md text-primary mb-3 font-semibold text-[24px]">
                        {card.title}
                      </h3>
                      <p className="text-body-md text-on-surface-variant text-[16px] leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Claim Assistance Process */}
          <section
            className="py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop"
            id="process"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="order-2 lg:order-1 reveal">
                <Image
                  alt="Insurance claim assistance meeting with documents"
                  className="rounded-3xl shadow-2xl w-full aspect-video object-cover"
                  src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80"
                  width={1200}
                  height={675}
                />
              </div>
              <div className="order-1 lg:order-2 reveal" style={{ transitionDelay: "0.2s" }}>
                <span className="font-label-md text-secondary uppercase tracking-widest text-[12px] mb-4 block font-semibold">
                  {HOMEPAGE_CONTENT.processSection.kicker}
                </span>
                <h2 className="font-headline-lg text-headline-lg text-primary mb-8 text-[32px] font-bold">
                  {HOMEPAGE_CONTENT.processSection.heading}
                </h2>
                <div className="space-y-8">
                  {HOMEPAGE_CONTENT.processSection.steps.map((step) => (
                    <div className="flex gap-6 group" key={step.number}>
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold transition-transform group-hover:scale-110">
                        {step.number}
                      </div>
                      <div>
                        <h3 className="font-headline-md text-[18px] text-primary mb-1 font-semibold">
                          {step.title}
                        </h3>
                        <p className="text-body-md text-on-surface-variant">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <a
                  href="#cta-banner"
                  className="mt-12 px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md hover:shadow-lg transition-all reveal border-0 min-h-0 text-[14px] inline-block text-center"
                  style={{ transitionDelay: "0.4s" }}
                >
                  {HOMEPAGE_CONTENT.processSection.ctaText}
                </a>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section
            className="py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop"
            id="faq"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="reveal">
                <h2 className="font-headline-lg text-headline-lg text-primary mb-6 text-[32px] font-bold">
                  {HOMEPAGE_CONTENT.faqSection.heading}
                </h2>
                <p className="text-body-lg text-on-surface-variant mb-8 text-[18px]">
                  {HOMEPAGE_CONTENT.faqSection.subheading}
                </p>
                <a
                  href="#cta-banner"
                  className="text-secondary font-label-md inline-flex items-center gap-2 hover:underline group bg-transparent p-0 min-h-0 shadow-none hover:translate-y-0 text-[14px]"
                >
                  {HOMEPAGE_CONTENT.faqSection.ctaText}{" "}
                  <span className="material-symbols-outlined group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                    arrow_outward
                  </span>
                </a>
              </div>
              <div className="lg:col-span-2 space-y-4">
                {HOMEPAGE_CONTENT.faqSection.faqs.map((faq, index) => (
                  <details
                    key={index}
                    className="group bg-white rounded-2xl p-6 border border-outline-variant/30 open:shadow-md transition-all reveal"
                    style={{ transitionDelay: `${(index + 1) * 0.1}s` }}
                  >
                    <summary className="list-none cursor-pointer flex justify-between items-center font-headline-md text-[18px] text-primary font-semibold">
                      {faq.question}
                      <span className="material-symbols-outlined group-open:rotate-180 transition-transform">
                        expand_more
                      </span>
                    </summary>
                    <p className="mt-4 text-body-md text-on-surface-variant">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Banner */}
          <section
            className="py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-margin-desktop"
            id="cta-banner"
          >
            <div className="relative bg-primary rounded-3xl p-12 lg:p-20 overflow-hidden text-center text-on-primary shadow-2xl reveal border border-primary/20">
              <div className="absolute inset-0 -z-10 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
              </div>
              <h2 className="font-display-lg text-display-lg mb-6 entry-anim text-white text-[48px] font-bold">
                {HOMEPAGE_CONTENT.ctaBanner.heading}
              </h2>
              <p
                className="font-body-lg text-body-lg mb-10 opacity-80 max-w-2xl mx-auto entry-anim text-white/80 text-[18px]"
                style={{ animationDelay: "0.2s" }}
              >
                {HOMEPAGE_CONTENT.ctaBanner.subheading}
              </p>
              <div
                className="flex flex-wrap justify-center gap-6 entry-anim"
                style={{ animationDelay: "0.4s" }}
              >
                <a
                  href={`tel:${BUSINESS_DETAILS.phoneHref}`}
                  className="px-10 py-5 bg-secondary text-white rounded-xl font-label-md text-label-md flex items-center gap-3 hover:scale-105 transition-all text-[14px]"
                >
                  <span className="material-symbols-outlined">call</span> {HOMEPAGE_CONTENT.ctaBanner.callCtaText}{" "}
                  {BUSINESS_DETAILS.phone}
                </a>
                <Link
                  href="/contact"
                  className="px-10 py-5 bg-white text-primary rounded-xl font-label-md text-label-md flex items-center gap-3 hover:scale-105 transition-all border-0 min-h-0 text-[14px]"
                >
                  {HOMEPAGE_CONTENT.ctaBanner.scheduleCtaText}
                </Link>
              </div>
            </div>
          </section>
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
