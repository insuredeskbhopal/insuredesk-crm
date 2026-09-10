"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import LandingEffects from "@/app/components/LandingEffects";
import PublicFooter from "@/app/components/public/PublicFooter";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { BUSINESS_DETAILS, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { HOMEPAGE_CONTENT } from "@/content/homepage";

const CATEGORIES = [
  { id: "all", label: "All Insurance", count: 13 },
  { id: "corporate", label: "Business & Commercial", count: 5 },
  { id: "personal", label: "Personal & Family", count: 5 },
  { id: "advisory", label: "Claims & Renewals", count: 3 },
];

const SERVICES_DATA = [
  {
    title: "Commercial Insurance",
    slug: "commercial-insurance",
    category: "corporate",
    categoryLabel: "Business & Factory",
    icon: "apartment",
    image: "/brand/services/commercial.jpg",
    desc: "Protect your factory, machinery, office, and business against fire, breakdowns, cyber risks, and financial loss.",
    highlights: [
      "Machinery breakdown, factory & office fire cover",
      "Public liability & employee accident protection",
      "Best coverage terms negotiated across 25+ insurers",
    ],
  },
  {
    title: "Fire & Property Insurance",
    slug: "fire-insurance",
    category: "corporate",
    categoryLabel: "Property & Factory",
    icon: "local_fire_department",
    image: "/brand/services/fire.jpg",
    desc: "Protect your factory, warehouse, office building, machinery, and commercial stock against fire, explosion, and natural disasters.",
    highlights: [
      "Building, plant, machinery & stock reinstatement value cover",
      "Protection against fire, storm, flood, and earthquake damage",
      "Fast surveyor coordination and claim documentation assistance",
    ],
  },
  {
    title: "Warehouse Insurance",
    slug: "warehouse-insurance",
    category: "corporate",
    categoryLabel: "Storage & Stock",
    icon: "inventory_2",
    image: "/brand/services/warehouse.jpg",
    desc: "Protect your warehouse, stored goods, stock, and cold storage against fire, flood, storm, and theft.",
    highlights: [
      "Multi-location inventory cover under a single policy",
      "Fire, flood, earthquake, and burglary protection",
      "Pay premium only for the actual stock you hold",
    ],
  },
  {
    title: "Marine Cargo Insurance",
    slug: "marine-insurance",
    category: "corporate",
    categoryLabel: "Goods in Transit",
    icon: "directions_boat",
    image: "/brand/services/marine.jpg",
    desc: "Insure your goods and cargo during transport across India or overseas by road, rail, air, or sea against damage and theft.",
    highlights: [
      "Single trip or yearly open policy for regular dispatches",
      "Door-to-door protection across road, rail, air, and sea",
      "Fast damage inspection and quick claim settlement support",
    ],
  },
  {
    title: "Risk Advisory Services",
    slug: "risk-advisory",
    category: "corporate",
    categoryLabel: "Policy Audit",
    icon: "analytics",
    image: "/brand/services/risk-advisory.jpg",
    desc: "Expert review of your existing policies to find hidden gaps, eliminate unnecessary costs, and save on premium.",
    highlights: [
      "Detailed check for hidden conditions and exclusions",
      "Price and feature comparison across 25+ insurers",
      "Correct property valuation to avoid claim deductions",
    ],
  },
  {
    title: "Health Insurance",
    slug: "health-insurance",
    category: "personal",
    categoryLabel: "Family Healthcare",
    icon: "medical_services",
    image: "/brand/services/health.jpg",
    desc: "Cashless medical insurance for you and your family with 10,000+ network hospitals, zero waiting hassles, and no hidden co-pay.",
    highlights: [
      "Cashless admission across 10,000+ hospitals in India",
      "Covers pre-existing diseases, surgeries & daycare",
      "Dedicated emergency support for quick hospital approvals",
    ],
  },
  {
    title: "Motor & Fleet Insurance",
    slug: "motor-insurance",
    category: "personal",
    categoryLabel: "Car & Fleet",
    icon: "directions_car",
    image: "/brand/services/motor.jpg",
    desc: "Complete car, bike, and commercial vehicle insurance with zero-depreciation cover and 24x7 roadside assistance.",
    highlights: [
      "Zero-depreciation bumper-to-bumper and engine protect cover",
      "Transfer and save up to 50% No Claim Bonus (NCB) discount",
      "Cashless repairs at authorized network garages across India",
    ],
  },
  {
    title: "Life Insurance & Term Plans",
    slug: "life-insurance",
    category: "personal",
    categoryLabel: "Family Protection",
    icon: "family_restroom",
    image: "/brand/services/life.jpg",
    desc: "Secure your family's future and clear loan liabilities with affordable high-cover term life insurance.",
    highlights: [
      "High life cover up to ₹1 Crore+ at low monthly premiums",
      "Quick policy approval with simple documentation",
      "Business partner & key person life insurance covers",
    ],
  },
  {
    id: "home-insurance",
    title: "Home Insurance",
    slug: "home-insurance",
    href: "/services/general-insurance",
    category: "personal",
    categoryLabel: "Home & Property",
    icon: "home",
    image: "/brand/services/home.jpg",
    desc: "Protect your apartment, villa, furniture, and valuables against fire, earthquake, flood, and burglary.",
    highlights: [
      "Complete coverage for building structure and household contents",
      "Protection against flood, storm, earthquake, and burglary",
      "Affordable plans for homeowners and tenants across India",
    ],
  },
  {
    id: "travel-insurance",
    title: "Travel Insurance",
    slug: "travel-insurance",
    href: "/services/general-insurance",
    category: "personal",
    categoryLabel: "Travel & Visa",
    icon: "flight_takeoff",
    image: "/brand/services/travel.jpg",
    desc: "Comprehensive overseas medical, baggage loss, trip cancellation, and flight delay coverage for visas and vacations.",
    highlights: [
      "Schengen, USA & global visa-compliant medical covers",
      "Cashless emergency hospitalization and doctor visits abroad",
      "Lost baggage, passport loss, and flight cancellation refund",
    ],
  },
  {
    title: "Claims Advocacy & Assistance",
    slug: "claims-assistance",
    category: "advisory",
    categoryLabel: "Claim Support",
    icon: "gavel",
    image: "/brand/services/claims.jpg",
    desc: "Having trouble with a claim? Our experts guide you with paperwork, surveyor visits, and follow-ups to get your claim settled.",
    highlights: [
      "Immediate claim filing and surveyor coordination",
      "Document review to prevent claim delays or rejections",
      "Help with fighting unfair deductions and claim rejections",
    ],
  },
  {
    title: "Policy Renewal Management",
    slug: "policy-renewals",
    category: "advisory",
    categoryLabel: "Timely Renewals",
    icon: "sync",
    image: "/brand/services/renewal.jpg",
    desc: "Never miss a renewal date or lose your NCB discount. We track your policies and compare renewal quotes in advance.",
    highlights: [
      "Advance renewal reminders with better price options",
      "Switch to a better insurer without losing accumulated benefits",
      "Protect your No Claim Bonus and optimize vehicle IDV",
    ],
  },
  {
    title: "General Insurance Consulting",
    slug: "general-insurance",
    category: "advisory",
    categoryLabel: "General Insurance",
    icon: "shield",
    image: "/brand/services/general.jpg",
    desc: "Honest guidance for home insurance, shopkeeper policies, overseas travel insurance, and custom business risks.",
    highlights: [
      "Home structure and contents insurance against fire & flood",
      "Travel insurance for international trips and visa requirements",
      "Unbiased advice to help you get the best coverage for your money",
    ],
  },
];

const servicesSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/services#webpage`,
      url: `${SITE_URL}/services`,
      name: `Insurance Services Across India | Bima Headquarter`,
      description: `Explore insurance services across India with Bima Headquarter. We offer commercial, fire, health, motor, life, home, travel, marine, warehouse insurance, claims assistance, and policy reviews.`,
      isPartOf: {
        "@id": `${SITE_URL}/#website`,
      },
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services#main-service`,
      name: "Insurance Services & Claim Assistance",
      provider: {
        "@type": "Organization",
        name: SITE_NAME,
        legalName: BUSINESS_DETAILS.legalName,
        url: SITE_URL,
      },
      areaServed: {
        "@type": "Country",
        name: BUSINESS_DETAILS.serviceArea,
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Bima Headquarter Service Catalog",
        itemListElement: SERVICES_DATA.map((service) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service.title,
            description: service.desc,
            url: `${SITE_URL}${service.href || `/services/${service.slug}`}`,
          },
        })),
      },
    },
  ],
};

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredServices = useMemo(() => {
    if (activeCategory === "all") return SERVICES_DATA;
    return SERVICES_DATA.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  return (
    <>
      <LandingEffects />
      <Script
        id="services-structured-data"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesSchema) }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .landing-shell #hero .hero-inner-container {
          width: min(100% - 64px, 1500px) !important;
          max-width: 1500px !important;
          margin: 0 auto !important;
          padding: 0 !important;
        }
        .landing-shell #hero .hero-content {
          margin: 0 !important;
          padding: 0 !important;
          text-align: left !important;
          align-items: flex-start !important;
        }
        @media (max-width: 768px) {
          .landing-shell #hero .hero-inner-container {
            width: 100% !important;
            padding: 0 20px !important;
          }
        }
      `,
        }}
      />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />
        <main>
          {/* =========================================================================
              1. Hero Section (Matches Homepage Guidance & Advisory Architecture)
              ========================================================================= */}
          <header
            className="services-hero-header relative pt-24 pb-28 flex items-center justify-start min-h-[640px] lg:min-h-[calc(100vh-84px)] isolate"
            id="hero"
          >
            <div className="hero-inner-container max-w-container-max w-full mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
              <div className="hero-content flex flex-col items-start text-left justify-center max-w-[680px]">
                <div className="sh-section-kicker text-left mb-3 tracking-wider font-extrabold uppercase">
                  OUR INSURANCE SERVICES
                </div>
                <h1 className="font-display-lg text-display-lg text-primary mb-3 leading-tight text-[38px] md:text-[46px] font-bold text-left">
                  Insurance Services for Every Personal &amp; Business Risk
                </h1>
                <p className="text-secondary text-[20px] md:text-[23px] font-bold mb-4 leading-snug">
                  Compare, Review, Renew &amp; Get Claim Assistance — All in One Place.
                </p>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 max-w-2xl text-[16px] md:text-[17px] leading-relaxed text-left">
                  Explore insurance solutions across commercial, warehouse, marine cargo, health, motor &amp; fleet, life and other specialized risks. Bima Headquarter helps you understand policy terms, compare suitable options, review coverage gaps, manage renewals and get assistance with claim documentation.
                </p>
                <div className="flex flex-wrap gap-4 justify-start">
                  <a
                    href="#services-catalog"
                    className="px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-xl hover:translate-y-[-2px] transition-all border-0 min-h-0 text-[14px] font-semibold inline-flex items-center gap-2 text-center"
                  >
                    <span>Explore Insurance Services</span>
                    <span className="text-base leading-none">↓</span>
                  </a>
                  <Link
                    href="/contact"
                    className="px-8 py-4 border-2 border-secondary text-secondary rounded-xl font-label-md text-label-md hover:bg-secondary/5 transition-all bg-transparent min-h-0 text-[14px] font-semibold inline-block text-center"
                  >
                    Request a Policy Review
                  </Link>
                </div>
                <div className="hero-stats-container">
                  {HOMEPAGE_CONTENT.hero.stats.map((stat, idx) => (
                    <div className="hero-stat-col" key={idx}>
                      <span
                        className="hero-stat-value"
                        id={stat.id}
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

          {/* =========================================================================
              2. Category Filter & Services Directory
              ========================================================================= */}
          <section className="sh-directory-section" id="services-catalog">
            <div className="sh-directory-container">
              {/* Section Header */}
              <div className="sh-directory-header">
                <div className="sh-catalog-kicker">
                  <span className="sh-kicker-dot" aria-hidden="true" />
                  <span>Insurance Solutions Directory</span>
                </div>
                <h2 className="sh-section-heading">Find the Right Insurance Solution for Your Needs</h2>
                <p className="sh-section-desc">
                  Compare quotes from 25+ top insurers, understand what is covered without hidden surprises,
                  and get complete support from policy purchase to claim settlement.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="sh-filter-tabs-wrap">
                <div className="sh-filter-tabs" role="tablist" aria-label="Insurance Service Categories">
                  {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`sh-tab-btn ${isActive ? "sh-tab-btn-active" : ""}`}
                      >
                        <span>{cat.label}</span>
                        <span className="sh-tab-count">{cat.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service Cards Grid */}
              <div className="sh-services-grid">
                {filteredServices.map((service, index) => (
                  <article key={service.id || service.slug} className="sh-service-card">
                    {/* Top Row: Icon & Tag & Index */}
                    <div className="sh-card-header">
                      <div className="sh-card-header-left">
                        <div className="sh-card-icon-bubble">
                          <span className="material-symbols-outlined">{service.icon}</span>
                        </div>
                        <span className="sh-card-category-tag">{service.categoryLabel}</span>
                      </div>
                      <span className="sh-card-index">{String(index + 1).padStart(2, "0")}</span>
                    </div>

                    {/* Hero Area: Left Text + Right Integrated Artwork with Wave */}
                    <div className="sh-card-hero-area">
                      <div className="sh-card-text-col">
                        <h3 className="sh-card-title">{service.title}</h3>
                        <p className="sh-card-desc">{service.desc}</p>
                      </div>

                      <div className="sh-card-art-col">
                        <div className="sh-card-art-glow" aria-hidden="true" />
                        <div className="sh-card-art-img-wrap">
                          <Image
                            src={service.image}
                            alt={service.title}
                            width={320}
                            height={220}
                            className="sh-card-art-img"
                            unoptimized
                          />
                          <svg
                            className="sh-card-wave-overlay"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M 0,0 L 28,0 C 58,22 14,42 10,62 C 6,80 40,94 85,100 L 0,100 Z"
                              fill="#ffffff"
                            />
                          </svg>
                        </div>

                        {/* Floating Shield Badge */}
                        <div className="sh-card-shield-badge" aria-hidden="true">
                          <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M16 2L3 7.5V17C3 25.5 8.5 33 16 36C23.5 33 29 25.5 29 17V7.5L16 2Z"
                              fill="url(#shieldGrad)"
                            />
                            <path
                              d="M10.5 17.5L14.5 21.5L22 13.5"
                              stroke="#ffffff"
                              strokeWidth="2.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <defs>
                              <linearGradient id="shieldGrad" x1="3" y1="2" x2="29" y2="36" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#22c55e" />
                                <stop offset="1" stopColor="#15803d" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Coverage Key Points */}
                    <div className="sh-card-highlights">
                      {service.highlights.map((point, pIdx) => (
                        <div key={pIdx} className="sh-highlight-item">
                          <span className="sh-highlight-icon-wrap" aria-hidden="true">
                            <span className="material-symbols-outlined sh-highlight-icon">check</span>
                          </span>
                          <span className="sh-highlight-text">{point}</span>
                        </div>
                      ))}
                    </div>

                    {/* Card Footer Button */}
                    <div className="sh-card-footer">
                      <Link href={service.href || `/services/${service.slug}`} className="sh-card-cta-btn">
                        <span>View Policy Details</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* =========================================================================
              3. 4-Step Process ("How We Help You")
              ========================================================================= */}
          <section className="sh-protocol-section" id="methodology">
            <div className="sh-protocol-container">
              <div className="sh-protocol-header">
                <div className="sh-section-kicker">HOW WE HELP YOU</div>
                <h2 className="sh-section-heading">Our 4-Step Process to Protect You</h2>
                <p className="sh-section-desc">
                  How we help you pick the best policy, save money on premiums, and avoid claim rejections.
                </p>
              </div>

              <div className="sh-protocol-grid">
                <div className="sh-protocol-card">
                  <div className="sh-protocol-step-num">01</div>
                  <div className="sh-protocol-icon">
                    <span className="material-symbols-outlined">policy</span>
                  </div>
                  <h3 className="sh-protocol-title">1. Check Hidden Conditions</h3>
                  <p className="sh-protocol-desc">
                    We check your policy for hidden terms, deductibles, room rent limits, and exclusions that insurers often use to reject claims.
                  </p>
                </div>

                <div className="sh-protocol-card">
                  <div className="sh-protocol-step-num">02</div>
                  <div className="sh-protocol-icon">
                    <span className="material-symbols-outlined">balance</span>
                  </div>
                  <h3 className="sh-protocol-title">2. Compare Top Insurers</h3>
                  <p className="sh-protocol-desc">
                    We compare quotes and benefits across 25+ leading insurance companies to get you the highest coverage at the lowest premium.
                  </p>
                </div>

                <div className="sh-protocol-card">
                  <div className="sh-protocol-step-num">03</div>
                  <div className="sh-protocol-icon">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <h3 className="sh-protocol-title">3. Timely Renewal Tracking</h3>
                  <p className="sh-protocol-desc">
                    We remind you well before your policy expires so you never lose your insurance coverage or your accumulated No Claim Bonus (NCB) discount.
                  </p>
                </div>

                <div className="sh-protocol-card">
                  <div className="sh-protocol-step-num">04</div>
                  <div className="sh-protocol-icon">
                    <span className="material-symbols-outlined">support_agent</span>
                  </div>
                  <h3 className="sh-protocol-title">4. Complete Claim Assistance</h3>
                  <p className="sh-protocol-desc">
                    If you have a claim, our team helps with paperwork and speaks directly to insurance surveyors to get your claim approved quickly.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
              4. Bottom CTA Banner (White Card + Fading Blue Glow)
              ========================================================================= */}
          <section className="home-cta-section home-section-container" id="services-cta" aria-labelledby="services-cta-heading">
            <div className="home-cta-card">
              <div className="home-cta-mesh-bg" aria-hidden="true">
                <div className="home-cta-glow-blue-1" />
                <div className="home-cta-glow-blue-2" />
                <div className="home-cta-mesh-pattern" />
              </div>

              <div className="home-cta-split-layout">
                {/* Left Column */}
                <div className="home-cta-left">
                  <div className="home-cta-brand-wrap">
                    <BrandLogo className="home-cta-brand-logo" />
                  </div>

                  <h2 id="services-cta-heading" className="home-cta-heading">
                    Need Help Choosing the Right Policy?
                  </h2>

                  <p className="home-cta-desc">
                    Get free guidance, compare quotes from 25+ top insurance companies, and get honest advice with zero sales pressure.
                  </p>

                  <div className="home-cta-trust-list">
                    <div className="home-cta-trust-point">
                      <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                      <span>25+ Top Insurance Companies</span>
                    </div>
                    <div className="home-cta-trust-point">
                      <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                      <span>100% Free Policy Review</span>
                    </div>
                    <div className="home-cta-trust-point">
                      <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                      <span>Fast Pan-India Claim Support</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Action Card */}
                <div className="home-cta-action-card">
                  <div className="home-cta-action-header">
                    <div className="home-cta-action-avatar" aria-hidden="true">
                      <span className="material-symbols-outlined">headset_mic</span>
                    </div>
                    <div>
                      <h3 className="home-cta-action-title">Speak with an Advisor</h3>
                      <p className="home-cta-action-desc">Free, honest advice for personal and business insurance.</p>
                    </div>
                  </div>

                  <div className="home-cta-action-buttons">
                    <a href={`tel:${BUSINESS_DETAILS.phoneHref}`} className="home-cta-btn-call">
                      <span className="material-symbols-outlined" aria-hidden="true">call</span>
                      <span>Call Now: {BUSINESS_DETAILS.phone}</span>
                    </a>

                    <Link href="/contact" className="home-cta-btn-schedule">
                      <span>Get Free Policy Review</span>
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
