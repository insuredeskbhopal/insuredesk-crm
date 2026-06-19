import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import LandingEffects from "@/app/components/LandingEffects";
import PublicFooter from "@/app/components/public/PublicFooter";
import { BUSINESS_DETAILS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const SERVICES_LIST = [
  {
    title: "General Insurance",
    slug: "general-insurance",
    icon: "shield",
    desc: "Protect your personal assets, property, households, and miscellaneous exposures with curated insurance consulting.",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Health Insurance",
    slug: "health-insurance",
    icon: "medical_services",
    desc: "Secure cashless hospitalization, critical illness support, and family health protection plans with expert guidance.",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Motor Insurance",
    slug: "motor-insurance",
    icon: "directions_car",
    desc: "Comprehensive coverage and claims support for personal cars, two-wheelers, and commercial logistics fleets.",
    image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Life Insurance",
    slug: "life-insurance",
    icon: "family_restroom",
    desc: "Ensure your family's financial security with term life plans, savings strategies, and Keyman business protection.",
    image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Commercial Insurance",
    slug: "commercial-insurance",
    icon: "apartment",
    desc: "Cover warehouses, factory assets, cyber liabilities, marine transits, and fire risks with compliant packages.",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Warehouse Insurance",
    slug: "warehouse-insurance",
    icon: "inventory_2",
    desc: "Protect warehouse stock, inventory, burglary risks, and storage liabilities from fire and hazards.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Marine Insurance",
    slug: "marine-insurance",
    icon: "directions_boat",
    desc: "Insure goods in transit via road, rail, air, or sea cargo policies and annual movement exposure.",
    image: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Policy Renewals",
    slug: "policy-renewals",
    icon: "sync",
    desc: "Track and renew your active policies across leading insurers in India seamlessly without any coverage lapses.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Claims Assistance",
    slug: "claims-assistance",
    icon: "gavel",
    desc: "Get independent, professional representation, documentation reviews, and coordination support for claim approvals.",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Risk Advisory Services",
    slug: "risk-advisory",
    icon: "analytics",
    desc: "Identify coverage gaps, audit asset values, and implement risk control strategies to mitigate corporate exposures.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80",
  },
];

const servicesSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/services#webpage`,
      url: `${SITE_URL}/services`,
      name: `Insurance Services Across India | BimaHeadquarter`,
      description: `Explore insurance services across India with BimaHeadquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory.`,
      isPartOf: {
        "@id": `${SITE_URL}/#website`,
      },
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services#main-service`,
      name: "Insurance & Claim Consulting Services",
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
        name: "BimaHeadquarter Service Catalog",
        itemListElement: SERVICES_LIST.map((service) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service.title,
            description: service.desc,
            url: `${SITE_URL}/services/${service.slug}`,
          },
        })),
      },
    },
  ],
};

export default function ServicesPage() {
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
        .landing-page, .landing-page * {
            color: inherit !important;
        }
        .landing-page body, .landing-page .bg-background {
            background-color: #f8f9ff !important;
            color: #0b1c30 !important;
        }
        .landing-page h1, .landing-page h2, .landing-page h3, .landing-page h4 {
            color: #031638 !important;
        }
      `,
        }}
      />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />
        <main>
          {/* Hero Section */}
          <header className="service-page-hero relative pt-16 pb-20">
            <div className="service-page-hero-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="service-hero-copy entry-anim">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[12px] mb-6">
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  CERTIFIED CONSULTING IN INDIA
                </div>
                <h1 className="font-display-lg text-display-lg text-primary mb-6 leading-tight text-[48px] font-bold max-w-3xl">
                  BimaHeadquarter <span className="text-secondary">Services Hub</span>
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-[18px]">
                  Providing independent coverage engineering, claim settlement advocacy, and corporate risk
                  engineering services backed by {BUSINESS_DETAILS.legalName} across India.
                </p>
              </div>

              <div className="service-hero-media entry-anim" aria-hidden="true">
                <Image src="/brand/service-bg.webp" alt="" width={720} height={520} priority />
              </div>
            </div>
          </header>

          {/* Services Directory */}
          <section className="services-directory-section">
            <div className="services-directory-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="services-directory-heading reveal">
                <span>Insurance Services</span>
                <h2>Choose the coverage path that fits your risk.</h2>
                <p>
                  Every service includes guidance on policy structure, insurer coordination, documentation,
                  and claim-readiness from the BimaHeadquarter team.
                </p>
              </div>

              <div className="services-directory-grid">
                {SERVICES_LIST.map((service, index) => (
                  <Link
                    key={service.slug}
                    href={`/services/${service.slug}`}
                    className="service-directory-card reveal"
                    style={{ transitionDelay: `${index * 0.05}s` }}
                  >
                    <div
                      className="service-directory-media"
                      style={{ backgroundImage: `url(${service.image})` }}
                      aria-hidden="true"
                    />
                    <div className="service-directory-copy">
                      <div className="service-directory-topline">
                        <span className="service-directory-index">{String(index + 1).padStart(2, "0")}</span>
                        <span className="service-directory-icon material-symbols-outlined">
                          {service.icon}
                        </span>
                      </div>
                      <h3>{service.title}</h3>
                      <p>{service.desc}</p>
                      <span className="service-directory-link">
                        View service
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Why Choose Section */}
          <section className="py-20 bg-surface-container-low border-t border-b border-outline-variant/20">
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
              <div className="max-w-3xl mx-auto reveal">
                <h2 className="font-headline-lg text-[32px] text-primary mb-4 font-bold">
                  Professional Insurance Support
                </h2>
                <p className="text-on-surface-variant text-[16px] leading-relaxed mb-8">
                  As a licensed Insurance Marketing Firm under the IRDAI, {BUSINESS_DETAILS.legalName} offers
                  structured compliance and risk expertise. We help individuals secure coverage gaps and
                  support commercial structures across India with complete auditing and claim representation.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex px-8 py-4 bg-primary text-white rounded-xl font-bold hover:shadow-lg transition-all text-[14px]"
                >
                  Get a Free Audit Consultation
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
