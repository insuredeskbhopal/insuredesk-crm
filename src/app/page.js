import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import LandingEffects from "@/app/components/LandingEffects";
import PublicFooter from "@/app/components/public/PublicFooter";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { INSURER_LOGOS } from "@/app/components/brand/logoAssets";
import { BUSINESS_DETAILS, SITE_URL } from "@/lib/seo/site";
import { HOMEPAGE_CONTENT, SERVICE_CARD_META } from "@/content/homepage";
import { SERVICES } from "@/content/services";

const homepageFaqs = HOMEPAGE_CONTENT.faqSection.faqs.slice(0, 6);

const companyName = "Bima Headquarter by Insuredesk IMF Pvt. Ltd.";
const homepageTitle = "Bima Headquarter by Insuredesk IMF Pvt. Ltd. | Insurance Guidance";
const homepageDescription = "Bima Headquarter by Insuredesk IMF Pvt. Ltd. offers insurance guidance in Bhopal, policy comparisons, renewal assistance and claim documentation support.";

export const metadata = {
  title: { absolute: homepageTitle },
  description: homepageDescription,
  applicationName: companyName,
  authors: [{ name: companyName, url: SITE_URL }],
  creator: companyName,
  publisher: companyName,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: companyName,
    title: homepageTitle,
    description: homepageDescription,
    images: [{ url: "/brand/main-logo-wide.webp", width: 1024, height: 570, alt: `${companyName} logo` }],
  },
  twitter: {
    card: "summary_large_image",
    title: homepageTitle,
    description: homepageDescription,
    images: ["/brand/main-logo-wide.webp"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "LocalBusiness", "InsuranceAgency"],
      "@id": `${SITE_URL}/#organization`,
      name: companyName,
      alternateName: ["BimaHeadquarter", "bimaheadquarter.com"],
      legalName: companyName,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/main-logo-wide.webp`,
      image: `${SITE_URL}/brand/main-logo-wide.webp`,
      email: BUSINESS_DETAILS.email,
      telephone: BUSINESS_DETAILS.phoneHref,
      description: homepageDescription,
      foundingDate: BUSINESS_DETAILS.foundingDate,
      slogan: "Trusted Insurance Consultancy",
      address: {
        "@type": "PostalAddress",
        ...BUSINESS_DETAILS.address,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 23.1956,
        longitude: 77.4608,
      },
      hasMap: BUSINESS_DETAILS.mapsUrl,
      areaServed: {
        "@type": "Country",
        name: BUSINESS_DETAILS.serviceArea,
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: BUSINESS_DETAILS.openingHours.days,
        opens: BUSINESS_DETAILS.openingHours.opens,
        closes: BUSINESS_DETAILS.openingHours.closes,
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: BUSINESS_DETAILS.phoneHref,
        email: BUSINESS_DETAILS.email,
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
      founder: {
        "@type": "Person",
        "@id": `${SITE_URL}/about#anand-soni`,
        name: "Anand Soni",
        jobTitle: "Founder Director",
        sameAs: ["https://www.linkedin.com/in/anand-soni-976b7024/"],
      },
      knowsAbout: [
        "Insurance consulting",
        "Claim assistance",
        ...SERVICES.map((s) => s.title),
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: companyName,
      headline: homepageTitle,
      description: homepageDescription,
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/blog?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
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
      mainEntity: homepageFaqs.map((faq) => ({
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
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 0px 10px 30px rgba(26, 43, 78, 0.05);
            position: relative;
            overflow: hidden;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease;
            transform: perspective(1000px) rotateX(calc(var(--tilt-y, 0) * -4deg)) rotateY(calc(var(--tilt-x, 0) * 4deg)) translateY(0);
            transform-style: preserve-3d;
        }

        .glass-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: radial-gradient(400px circle at var(--mouse-x, var(--x, 50%)) var(--mouse-y, var(--y, 50%)), rgba(22, 163, 74, 0.15) 0%, rgba(255, 255, 255, 0.25) 40%, transparent 70%);
            opacity: 0;
            transition: opacity 0.35s ease;
            pointer-events: none;
            z-index: 1;
        }

        .glass-card:hover::before {
            opacity: 1;
        }

        .glass-card:hover {
            transform: perspective(1000px) rotateX(calc(var(--tilt-y, 0) * -6deg)) rotateY(calc(var(--tilt-x, 0) * 6deg)) translateY(-7px) scale3d(1.015, 1.015, 1.015);
            box-shadow: 0px 24px 50px rgba(26, 43, 78, 0.12), 0 0 0 1px rgba(22, 163, 74, 0.2);
        }

        /* Crystal-Clear Hardware-Accelerated Reveal */
        .reveal {
            opacity: 0;
            transform: translateY(24px);
            transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
            transition-delay: var(--reveal-delay, 0ms);
            will-change: opacity, transform;
        }

        .reveal.active {
            opacity: 1;
            transform: translateY(0);
        }

        .entry-anim {
            animation: crispEntry 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes crispEntry {
            0% {
                opacity: 0;
                transform: translateY(18px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Shimmer Button Sweep */
        @keyframes shimmerSweep {
            0% { transform: translateX(-160%) skewX(-20deg); }
            100% { transform: translateX(260%) skewX(-20deg); }
        }

        .btn-shimmer {
            position: relative;
            overflow: hidden;
            transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .btn-shimmer::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 60%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.32), transparent);
            transform: translateX(-160%) skewX(-20deg);
            pointer-events: none;
        }

        .btn-shimmer:hover::after {
            animation: shimmerSweep 1s ease-out;
        }

        .btn-shimmer:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 16px 32px -4px rgba(3, 22, 56, 0.28);
        }

        .btn-shimmer:active {
            transform: translateY(0) scale(0.98);
        }

        /* Hero Badge Pill */
        .hero-badge-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 16px;
            border-radius: 9999px;
            background: rgba(28, 108, 57, 0.08);
            border: 1px solid rgba(28, 108, 57, 0.2);
            color: #145d38;
            font-size: 12.5px;
            font-weight: 700;
            letter-spacing: 0.04em;
            margin-bottom: 16px;
            backdrop-filter: blur(8px);
        }

        .hero-badge-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #16a34a;
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.3);
            animation: dotPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes dotPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.25); }
        }

        .preserve-3d {
            transform-style: preserve-3d;
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
                <div className="hero-badge-pill entry-anim" style={{ animationDelay: "60ms" }}>
                  <span className="hero-badge-dot" />
                  <span>IRDAI Compliant Advisory • Pan India</span>
                </div>
                <h1 className="typing-headline font-display-lg text-display-lg text-primary mb-3 leading-tight text-[40px] md:text-[48px] font-bold text-left entry-anim" style={{ animationDelay: "150ms" }}>
                  {HOMEPAGE_CONTENT.hero.heading}
                </h1>
                <p className="text-secondary text-[20px] md:text-[24px] font-bold mb-5 entry-anim" style={{ animationDelay: "260ms" }}>
                  {HOMEPAGE_CONTENT.hero.subheading}
                </p>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-2xl text-[18px] text-left entry-anim" style={{ animationDelay: "360ms" }}>
                  {HOMEPAGE_CONTENT.hero.description}
                </p>
                <div className="flex flex-wrap gap-4 justify-start entry-anim" style={{ animationDelay: "460ms" }}>
                  <a
                    href="#solutions"
                    className="btn-shimmer px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-xl border-0 min-h-0 text-[14px] inline-block text-center"
                  >
                    {HOMEPAGE_CONTENT.hero.ctaConsultationText}
                  </a>
                  <a
                    href="#process"
                    className="btn-shimmer px-8 py-4 border-2 border-secondary text-secondary rounded-xl font-label-md text-label-md hover:bg-secondary/10 bg-transparent min-h-0 text-[14px] inline-block text-center"
                  >
                    {HOMEPAGE_CONTENT.hero.ctaClaimsText}
                  </a>
                </div>
                <div className="hero-stats-container entry-anim" style={{ animationDelay: "560ms" }}>
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
                  aria-hidden={index >= INSURER_LOGOS.length ? true : undefined}
                >
                  <Image unoptimized src={logo.src} alt={`${logo.name} logo`} width={136} height={44} />
                </span>
              ))}
            </div>
          </section>

          {/* Insurance Categories Grid */}
          <section className="services-section py-24 relative overflow-hidden" id="solutions">
            <div className="services-section-texture absolute inset-0"></div>
            <div className="relative home-section-container">
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
                {SERVICES.filter((s) => s.slug !== "risk-advisory").slice(0, 6).map((service, index) => {
                  const meta = SERVICE_CARD_META[service.slug] || {
                    pill: service.eyebrow?.toUpperCase() || "INSURANCE",
                    checklist: [
                      "Comprehensive coverage comparison",
                      "Independent policy gap review",
                      "Renewal and claim assistance support",
                    ],
                    slogan: ["TRUSTED", "ADVISORY", "TOTAL", "SECURITY"],
                    image: service.image,
                  };
                  const seqNum = String(index + 1).padStart(2, "0");

                  return (
                    <Link
                      key={index}
                      href={service.route}
                      className="service-card group reveal"
                    >
                      {/* Top Header: Icon + Pill on Left, Sequence Number on Right */}
                      <div className="service-card-top">
                        <div className="service-card-top-left">
                          <div className="service-card-icon" aria-hidden="true">
                            <span className="material-symbols-outlined">{service.icon}</span>
                          </div>
                          <span className="service-card-pill">{meta.pill}</span>
                        </div>
                        <span className="service-card-index">{seqNum}</span>
                      </div>

                      {/* Title & Description */}
                      <div className="service-card-header">
                        <h3 className="service-card-title">{service.title}</h3>
                        <p className="service-card-desc">{service.desc}</p>
                      </div>

                      {/* Organic Hero Visual */}
                      <div className="service-card-visual">
                        <div className="service-card-visual-glow" aria-hidden="true" />
                        <div className="service-card-visual-frame">
                          <Image
                            src={meta.image || service.image}
                            alt={`${service.title} consultancy by Bima Headquarter`}
                            width={600}
                            height={360}
                            className="service-card-photo"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          <div className="service-card-fade-mask" aria-hidden="true" />
                        </div>
                      </div>

                      {/* Feature Checklist */}
                      <ul className="service-card-checklist" aria-label={`${service.title} highlights`}>
                        {meta.checklist.map((point, pIdx) => (
                          <li key={pIdx} className="service-card-check-item">
                            <span className="service-card-check-circle" aria-hidden="true">
                              <span className="material-symbols-outlined">check</span>
                            </span>
                            <span className="service-card-check-text">{point}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Partial Horizontal Divider */}
                      <div className="service-card-divider" />

                      {/* Bottom Action Button & Micro-Creed Slogan */}
                      <div className="service-card-bottom">
                        <span className="service-card-btn">
                          Learn More{" "}
                          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                        </span>
                        <div className="service-card-creed" aria-hidden="true">
                          <div className="service-card-creed-lines">
                            {meta.slogan.map((word, wIdx) => (
                              <span key={wIdx}>{word}</span>
                            ))}
                          </div>
                          <span className="service-card-creed-bar" />
                        </div>
                      </div>

                      {/* Decorative Concentric Corner Wave Graphic */}
                      <svg
                        className="service-card-corner-wave"
                        viewBox="0 0 160 140"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M160,0 C110,35 60,85 0,140 L160,140 Z"
                          fill="url(#cardWaveGrad)"
                        />
                        <path
                          d="M160,30 C120,58 80,98 32,140"
                          stroke="rgba(22, 163, 74, 0.14)"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M160,65 C132,84 102,112 68,140"
                          stroke="rgba(22, 163, 74, 0.09)"
                          strokeWidth="1.2"
                        />
                        <defs>
                          <radialGradient id="cardWaveGrad" cx="100%" cy="100%" r="100%">
                            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.07" />
                            <stop offset="65%" stopColor="#16a34a" stopOpacity="0.02" />
                            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                      </svg>
                    </Link>
                  );
                })}
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

          {/* Company overview */}
          <section className="company-overview" aria-labelledby="company-overview-heading">
            <div className="home-section-container">
              <div className="company-overview-layout">
                <div className="company-overview-intro">
                  <BrandLogo className="company-overview-brand" />
                  <div>
                    <h2 id="company-overview-heading">
                      {HOMEPAGE_CONTENT.whyChooseUs.heading}
                    </h2>
                    <p>{HOMEPAGE_CONTENT.whyChooseUs.subheading}</p>
                  </div>
                  <a href="#process" className="company-overview-cta">
                    {HOMEPAGE_CONTENT.whyChooseUs.ctaText}
                    <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                  </a>
                </div>
                <div className="company-overview-details">
                  {HOMEPAGE_CONTENT.whyChooseUs.cards.map((card) => (
                    <article className="company-overview-item" key={card.title}>
                      <span className="company-overview-icon material-symbols-outlined" aria-hidden="true">
                        {card.icon}
                      </span>
                      <div>
                        <h3>{card.title}</h3>
                        <p>{card.desc}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Claim Assistance Process */}
          <section
            className="claims-process home-section-container"
            id="process"
            aria-labelledby="claims-process-heading"
          >
            <div className="claims-process-header">
              <div>
                <span className="claims-process-kicker">{HOMEPAGE_CONTENT.processSection.kicker}</span>
                <h2 id="claims-process-heading">{HOMEPAGE_CONTENT.processSection.heading}</h2>
              </div>
              <a href="#cta-banner" className="claims-process-cta">
                {HOMEPAGE_CONTENT.processSection.ctaText}
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </a>
            </div>
            <div className="claims-process-layout">
              <div className="claims-process-media">
                <Image
                  alt="Bima Headquarter insurance claim assistance consultation"
                  src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80"
                  width={1200}
                  height={675}
                  sizes="(max-width: 900px) 100vw, 45vw"
                />
              </div>
              <ol className="claims-process-timeline" role="list">
                {HOMEPAGE_CONTENT.processSection.steps.map((step) => (
                  <li className="claims-process-step" key={step.number}>
                    <span className="claims-process-number" aria-hidden="true">{step.number}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* FAQ Section */}
          <section
            className="home-faq home-section-container"
            id="faq"
            aria-labelledby="home-faq-heading"
          >
            <div className="home-faq-layout">
              {/* Left Column: Context & Direct Advisor Card */}
              <div className="home-faq-sidebar">
                <div className="home-faq-badge">
                  <span className="home-faq-pulse-dot" aria-hidden="true" />
                  <span>Clear Answers • No Jargon</span>
                </div>

                <h2 id="home-faq-heading" className="home-faq-title">
                  {HOMEPAGE_CONTENT.faqSection.heading}
                </h2>

                <p className="home-faq-subtitle">
                  {HOMEPAGE_CONTENT.faqSection.subheading}
                </p>

                {/* Direct Advisor Support Card */}
                <div className="home-faq-advisor-card">
                  <div className="home-faq-advisor-status">
                    <span className="home-faq-status-dot" aria-hidden="true" />
                    <span>Live Advisory Assistance</span>
                  </div>

                  <div className="home-faq-advisor-header">
                    <div className="home-faq-advisor-avatar" aria-hidden="true">
                      <span className="material-symbols-outlined">support_agent</span>
                    </div>
                    <div>
                      <h3 className="home-faq-advisor-title">Have a specific question?</h3>
                      <p className="home-faq-advisor-desc">Talk directly with a certified insurance advisor.</p>
                    </div>
                  </div>

                  <div className="home-faq-advisor-actions">
                    <a
                      href={`tel:${BUSINESS_DETAILS.phoneHref}`}
                      className="home-faq-advisor-btn-call"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">call</span>
                      <span>Call +91 {BUSINESS_DETAILS.phone}</span>
                    </a>
                    <Link
                      href="/contact"
                      className="home-faq-advisor-btn-contact"
                    >
                      <span>Request Consultation</span>
                      <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                <Link href="/faq" className="home-faq-view-all">
                  <span>Browse All 17+ FAQs</span>
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_outward</span>
                </Link>
              </div>

              {/* Right Column: Interactive FAQ Accordion Cards */}
              <div className="home-faq-accordion-group">
                {homepageFaqs.map((faq, idx) => (
                  <details
                    key={faq.question}
                    name="homepage-faq"
                    className="home-faq-card"
                    {...(idx === 0 ? { open: true } : {})}
                  >
                    <summary className="home-faq-summary">
                      <div className="home-faq-question-wrap">
                        {faq.category && (
                          <span className="home-faq-category-tag">{faq.category}</span>
                        )}
                        <span className="home-faq-question-text">{faq.question}</span>
                      </div>
                      <span className="home-faq-icon-bubble" aria-hidden="true">
                        <span className="material-symbols-outlined home-faq-icon-plus">add</span>
                        <span className="material-symbols-outlined home-faq-icon-minus">remove</span>
                      </span>
                    </summary>
                    <div className="home-faq-answer-wrap">
                      <p className="home-faq-answer-text">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Banner */}
          <section
            className="home-cta-section home-section-container"
            id="cta-banner"
            aria-labelledby="cta-banner-heading"
          >
            <div className="home-cta-card">
              <div className="home-cta-mesh-bg" aria-hidden="true">
                <div className="home-cta-glow-blue-1" />
                <div className="home-cta-glow-blue-2" />
                <div className="home-cta-mesh-pattern" />
              </div>

              <div className="home-cta-split-layout">
                {/* Left Column: Brand & Value Proposition */}
                <div className="home-cta-left">
                  <div className="home-cta-brand-wrap">
                    <BrandLogo className="home-cta-brand-logo" />
                  </div>

                  <h2 id="cta-banner-heading" className="home-cta-heading">
                    {HOMEPAGE_CONTENT.ctaBanner.heading}
                  </h2>

                  <p className="home-cta-desc">
                    {HOMEPAGE_CONTENT.ctaBanner.subheading}
                  </p>

                  <div className="home-cta-trust-list">
                    <div className="home-cta-trust-point">
                      <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                      <span>25+ Partner Insurers</span>
                    </div>
                    <div className="home-cta-trust-point">
                      <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                      <span>100% Free Assessment</span>
                    </div>
                    <div className="home-cta-trust-point">
                      <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                      <span>Pan-India Claims Support</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Elevated Action Card */}
                <div className="home-cta-action-card">
                  <div className="home-cta-action-header">
                    <div className="home-cta-action-avatar" aria-hidden="true">
                      <span className="material-symbols-outlined">headset_mic</span>
                    </div>
                    <div>
                      <h3 className="home-cta-action-title">Speak with a Specialist</h3>
                      <p className="home-cta-action-desc">Immediate guidance, zero sales pressure.</p>
                    </div>
                  </div>

                  <div className="home-cta-action-buttons">
                    <a
                      href={`tel:${BUSINESS_DETAILS.phoneHref}`}
                      className="home-cta-btn-call"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">call</span>
                      <span>{HOMEPAGE_CONTENT.ctaBanner.callCtaText} {BUSINESS_DETAILS.phone}</span>
                    </a>

                    <Link
                      href="/contact"
                      className="home-cta-btn-schedule"
                    >
                      <span>{HOMEPAGE_CONTENT.ctaBanner.scheduleCtaText}</span>
                      <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                    </Link>
                  </div>

                  <div className="home-cta-action-hours">
                    <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                    <span>Available Mon – Sat • 9:00 AM – 6:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
