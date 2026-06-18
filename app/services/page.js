"use client";

import { useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import Breadcrumbs from "@/app/components/public/Breadcrumbs";
import { BUSINESS_DETAILS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const SERVICES_LIST = [
  {
    title: "General Insurance",
    slug: "general-insurance",
    icon: "shield",
    desc: "Protect your personal assets, property, households, and miscellaneous exposures with curated insurance consulting."
  },
  {
    title: "Health Insurance",
    slug: "health-insurance",
    icon: "medical_services",
    desc: "Secure cashless hospitalization, critical illness support, and family health protection plans with expert guidance."
  },
  {
    title: "Motor Insurance",
    slug: "motor-insurance",
    icon: "directions_car",
    desc: "Comprehensive coverage and claims support for personal cars, two-wheelers, and commercial logistics fleets."
  },
  {
    title: "Life Insurance",
    slug: "life-insurance",
    icon: "family_restroom",
    desc: "Ensure your family's financial security with term life plans, savings strategies, and Keyman business protection."
  },
  {
    title: "Commercial Insurance",
    slug: "commercial-insurance",
    icon: "apartment",
    desc: "Cover warehouses, factory assets, cyber liabilities, marine transits, and fire risks with compliant packages."
  },
  {
    title: "Policy Renewals",
    slug: "policy-renewals",
    icon: "sync",
    desc: "Track and renew your active policies across leading insurers in Bhopal seamlessly without any coverage lapses."
  },
  {
    title: "Claims Assistance",
    slug: "claims-assistance",
    icon: "gavel",
    desc: "Get independent, professional representation, documentation reviews, and coordination support for claim approvals."
  },
  {
    title: "Risk Advisory Services",
    slug: "risk-advisory",
    icon: "analytics",
    desc: "Identify coverage gaps, audit asset values, and implement risk control strategies to mitigate corporate exposures."
  }
];

const servicesSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/services#webpage`,
      "url": `${SITE_URL}/services`,
      "name": `Insurance Services in Bhopal | BimaHeadquarter`,
      "description": `Explore insurance services in Bhopal by BimaHeadquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory.`,
      "isPartOf": {
        "@id": `${SITE_URL}/#website`
      }
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services#main-service`,
      "name": "Insurance & Claim Consulting Services",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "legalName": BUSINESS_DETAILS.legalName,
        "url": SITE_URL
      },
      "areaServed": {
        "@type": "State",
        "name": BUSINESS_DETAILS.address.addressRegion
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "BimaHeadquarter Service Catalog",
        "itemListElement": SERVICES_LIST.map((service) => ({
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": service.title,
            "description": service.desc,
            "url": `${SITE_URL}/services/${service.slug}`
          }
        }))
      }
    }
  ]
};

export default function ServicesPage() {
  useEffect(() => {
    // Add landing-page class for scoped styles
    document.body.classList.add("landing-page");

    const revealElements = document.querySelectorAll(".reveal");
    const revealObserver = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1 }
    );
    revealElements.forEach((el) => revealObserver.observe(el));

    // Mouse Tracking for glassmorphism shimmer on hover
    const glassCards = document.querySelectorAll(".glass-card");
    const handleMouseMove = (e) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--x", `${x}px`);
      card.style.setProperty("--y", `${y}px`);
    };
    glassCards.forEach((card) => {
      card.addEventListener("mousemove", handleMouseMove);
    });

    return () => {
      document.body.classList.remove("landing-page");
      revealObserver.disconnect();
      glassCards.forEach((card) => {
        card.removeEventListener("mousemove", handleMouseMove);
      });
    };
  }, []);

  return (
    <>
      {/* Script for Tailwind and Schemas */}
      <Script
        src="https://cdn.tailwindcss.com?plugins=forms,container-queries"
        strategy="beforeInteractive"
      />
      <Script id="services-structured-data" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesSchema) }} />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{
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
      `}} />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />
        <Breadcrumbs />

        {/* Hero Section */}
        <header className="relative pt-16 pb-20 bg-gradient-to-b from-surface-container/30 to-background text-center">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col items-center">
            <div className="entry-anim flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[12px] mb-6">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
                CERTIFIED CONSULTING IN INDIA
              </div>
              <h1 className="font-display-lg text-display-lg text-primary mb-6 leading-tight text-[48px] font-bold max-w-3xl">
                BimaHeadquarter <span className="text-secondary">Services Hub</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto text-[18px]">
                Providing independent coverage engineering, claim settlement advocacy, and corporate risk engineering services backed by {BUSINESS_DETAILS.legalName} in Bhopal.
              </p>
            </div>
          </div>
        </header>

        {/* Services Directory Grid */}
        <section className="py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop bg-background">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {SERVICES_LIST.map((service, index) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="glass-card p-8 rounded-2xl flex flex-col items-start transition-all group reveal border border-outline-variant/20"
                style={{ transitionDelay: `${index * 0.05}s` }}
              >
                <div className="w-14 h-14 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[28px]">
                    {service.icon}
                  </span>
                </div>
                <h3 className="font-headline-md text-[20px] text-primary mb-3 font-bold">
                  {service.title}
                </h3>
                <p className="text-body-md text-on-surface-variant mb-6 text-sm leading-relaxed">
                  {service.desc}
                </p>
                <span
                  className="mt-auto font-label-md text-secondary hover:underline flex items-center gap-1 text-[14px] font-semibold"
                >
                  Learn More
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </span>
              </Link>
            ))}
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
                As a licensed Insurance Marketing Firm under the IRDAI, {BUSINESS_DETAILS.legalName} offers structured compliance and risk expertise. We help individuals secure coverage gaps and support commercial structures in Bhopal and throughout Madhya Pradesh with complete auditing and claim representation.
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

        <PublicFooter />
      </div>
    </>
  );
}
