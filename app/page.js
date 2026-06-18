"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import { INSURER_LOGOS } from "@/app/components/brand/logoAssets";
import {
  BUSINESS_DETAILS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL
} from "@/lib/seo/site";

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
      logo: `${SITE_URL}/brand/main-logo-wide.png`,
      email: BUSINESS_DETAILS.email,
      telephone: BUSINESS_DETAILS.phoneHref,
      description: SITE_DESCRIPTION,
      areaServed: BUSINESS_DETAILS.serviceArea,
      knowsAbout: [
        "Insurance consulting",
        "Claim assistance",
        "Motor insurance",
        "Health insurance",
        "Life insurance",
        "Business insurance",
        "Warehouse insurance",
        "Fire insurance",
        "Marine insurance",
        "Cyber insurance"
      ]
    },
    {
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#local-business`,
      name: SITE_NAME,
      url: SITE_URL,
      image: `${SITE_URL}/brand/main-logo-wide.png`,
      telephone: BUSINESS_DETAILS.phoneHref,
      email: BUSINESS_DETAILS.email,
      address: {
        "@type": "PostalAddress",
        ...BUSINESS_DETAILS.address
      },
      areaServed: {
        "@type": "Country",
        name: BUSINESS_DETAILS.serviceArea
      },
      parentOrganization: {
        "@id": `${SITE_URL}/#organization`
      },
      priceRange: "$$"
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      headline: SITE_TITLE,
      description: SITE_DESCRIPTION,
      publisher: {
        "@id": `${SITE_URL}/#organization`
      },
      inLanguage: "en-IN"
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#insurance-consulting-service`,
      name: "Insurance and Claim Consulting",
      serviceType: "Insurance consulting and claim assistance",
      provider: {
        "@id": `${SITE_URL}/#organization`
      },
      areaServed: {
        "@type": "Country",
        name: BUSINESS_DETAILS.serviceArea
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Insurance Consulting Services",
        itemListElement: [
          "Motor insurance consulting",
          "Health insurance consulting",
          "Life insurance consulting",
          "Business insurance consulting",
          "Warehouse insurance consulting",
          "Claim documentation support",
          "Claim settlement assistance"
        ].map((name) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name
          }
        }))
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Is the first consultation really free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. BIMAHEADQUARTER provides an initial policy review and consultation at no cost to help clients understand coverage gaps and potential savings."
          }
        },
        {
          "@type": "Question",
          name: "How many insurance partners does BIMAHEADQUARTER work with?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "BIMAHEADQUARTER works with over 10 leading national insurance companies to help clients compare policy options and features."
          }
        },
        {
          "@type": "Question",
          name: "Can BIMAHEADQUARTER help with a claim for a policy bought elsewhere?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Claim Assistance is available for policyholders even when the policy was not originally purchased through BIMAHEADQUARTER. Fees may apply for third-party advocacy."
          }
        }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL
        }
      ]
    }
  ]
};

export default function RootPage() {
  useEffect(() => {
    // Add page-specific body class to scope styles and prevent overrides from globals.css
    document.body.classList.add("landing-page");

    // Scroll Reveal animations using IntersectionObserver
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

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };
  const partnerLogos = [...INSURER_LOGOS, ...INSURER_LOGOS];

  return (
    <>
      <Script id="tailwind-config" strategy="afterInteractive">
        {`
          tailwind.config = {
            darkMode: "class",
            theme: {
              extend: {
                "colors": {
                  "on-tertiary-container": "#8c94a1",
                  "surface-bright": "#f8f9ff",
                  "outline-variant": "#c5c6cf",
                  "on-primary-fixed-variant": "#36466b",
                  "on-secondary": "#ffffff",
                  "on-secondary-fixed-variant": "#005225",
                  "inverse-on-surface": "#eaf1ff",
                  "tertiary-fixed": "#dbe3f1",
                  "background": "#f8f9ff",
                  "secondary": "#1c6c39",
                  "surface": "#f8f9ff",
                  "primary-fixed": "#d9e2ff",
                  "surface-tint": "#4e5e84",
                  "primary-fixed-dim": "#b6c6f2",
                  "outline": "#75777f",
                  "on-primary-container": "#8393bc",
                  "tertiary-fixed-dim": "#bfc7d4",
                  "surface-container-low": "#eff4ff",
                  "surface-container-lowest": "#ffffff",
                  "primary-container": "#1a2b4e",
                  "on-tertiary-fixed-variant": "#3f4752",
                  "on-surface": "#0b1c30",
                  "inverse-surface": "#213145",
                  "on-error": "#ffffff",
                  "on-tertiary-fixed": "#141c26",
                  "surface-variant": "#d3e4fe",
                  "surface-container": "#e5eeff",
                  "surface-container-highest": "#d3e4fe",
                  "tertiary": "#101822",
                  "error": "#ba1a1a",
                  "on-secondary-container": "#24723e",
                  "surface-dim": "#cbdbf5",
                  "secondary-fixed-dim": "#8ad899",
                  "on-primary-fixed": "#071a3d",
                  "inverse-primary": "#b6c6f2",
                  "error-container": "#ffdad6",
                  "on-error-container": "#93000a",
                  "on-secondary-fixed": "#00210b",
                  "secondary-fixed": "#a5f5b3",
                  "surface-container-high": "#dce9ff",
                  "primary": "#031638",
                  "on-tertiary": "#ffffff",
                  "on-background": "#0b1c30",
                  "secondary-container": "#a5f5b3",
                  "on-primary": "#ffffff",
                  "on-surface-variant": "#44464e",
                  "tertiary-container": "#252d37"
                },
                "borderRadius": {
                  "DEFAULT": "0.25rem",
                  "lg": "0.5rem",
                  "xl": "0.75rem",
                  "full": "9999px"
                },
                "spacing": {
                  "margin-desktop": "64px",
                  "unit": "8px",
                  "margin-mobile": "16px",
                  "gutter": "24px",
                  "container-max": "1280px"
                },
                "fontFamily": {
                  "body-lg": ["Be Vietnam Pro"],
                  "label-md": ["Manrope"],
                  "headline-md": ["Manrope"],
                  "display-lg": ["Manrope"],
                  "headline-lg-mobile": ["Manrope"],
                  "headline-lg": ["Manrope"],
                  "body-md": ["Be Vietnam Pro"]
                },
                "fontSize": {
                  "body-lg": ["18px", {"lineHeight": "1.6", "fontWeight": "400"}],
                  "label-md": ["14px", {"lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "600"}],
                  "headline-md": ["24px", {"lineHeight": "1.3", "fontWeight": "600"}],
                  "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                  "headline-lg-mobile": ["24px", {"lineHeight": "1.2", "fontWeight": "700"}],
                  "headline-lg": ["32px", {"lineHeight": "1.2", "fontWeight": "700"}],
                  "body-md": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
                }
              },
            },
          }
        `}
      </Script>
      <Script
        id="bimaheadquarter-structured-data"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Inject external fonts & CSS references */}
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

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

        .parallax-bg {
            will-change: transform;
        }

        .parallax-item {
            will-change: transform;
        }

        nav#mainNav.scrolled {
            height: 72px !important;
            background: linear-gradient(90deg, #F8FAFC 0%, #EEF4FF 50%, #F8FAFC 100%) !important;
            box-shadow: none !important;
            border: none !important;
        }

        /* Specificity bypass to override body * color: #000000 !important from globals.css */
        .landing-page,
        .landing-page * {
            color: inherit !important;
        }

        .landing-page svg,
        .landing-page [class*="icon"],
        .landing-page [class^="icon"],
        .landing-page .icon {
            color: inherit !important;
        }

        /* Reset and override globals.css button styles on the landing page */
        .landing-page button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            transition: all 0.2s !important;
            box-shadow: none !important;
            animation: none !important;
            transform: none !important;
            border-radius: 0.75rem !important; /* xl */
            font-weight: 600 !important;
        }

        /* Hero / Header Primary Buttons */
        .landing-page button.bg-primary {
            background-color: #031638 !important;
            color: #ffffff !important;
        }
        .landing-page button.bg-primary:hover {
            background-color: #0d2554 !important;
            color: #ffffff !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 10px 15px -3px rgba(3, 22, 56, 0.3) !important;
        }

        /* Hero Secondary Button */
        .landing-page button.border-secondary {
            border: 2px solid #1c6c39 !important;
            color: #1c6c39 !important;
            background-color: transparent !important;
        }
        .landing-page button.border-secondary:hover {
            background-color: rgba(28, 108, 57, 0.05) !important;
            color: #1c6c39 !important;
        }

        /* CTA/Secondary Support Buttons */
        .landing-page button.bg-secondary {
            background-color: #1c6c39 !important;
            color: #ffffff !important;
        }
        .landing-page button.bg-secondary:hover {
            background-color: #16552d !important;
            color: #ffffff !important;
        }

        /* White Buttons */
        .landing-page button.bg-white {
            background-color: #ffffff !important;
            color: #031638 !important;
        }
        .landing-page button.bg-white:hover {
            background-color: #f1f5f9 !important;
            color: #031638 !important;
            transform: scale(1.05) !important;
        }

        /* Nav links and layout buttons as transparent */
        .landing-page button.bg-transparent,
        .landing-page button.p-2 {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: inherit !important;
        }
        .landing-page button.p-2:hover {
            background-color: rgba(229, 238, 255, 0.5) !important;
        }

        /* Clean CSS Resets specific to the landing page */
        .landing-page body,
        .landing-page .bg-background {
            background-color: #f8f9ff !important;
            color: #0b1c30 !important;
        }

        .landing-page h1,
        .landing-page h2,
        .landing-page h3,
        .landing-page h4,
        .landing-page h5 {
            color: #031638 !important;
        }

        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(1deg); }
        }
        .preserve-3d {
            transform-style: preserve-3d;
        }
        @keyframes slow-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-slow-spin {
            animation: slow-spin 180s linear infinite;
        }
      ` }} />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />

        <header className="relative pt-24 pb-32 flex items-center justify-start min-h-[640px] lg:min-h-[680px] isolate" id="hero">
          <div className="max-w-container-max w-full mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
            <div className="hero-content flex flex-col items-center lg:items-start text-center lg:text-left justify-center max-w-[680px]">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[12px] mb-6">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                BY INSUREDESK IMF PVT LTD
              </div>
              <h1 className="font-display-lg text-display-lg text-primary mb-6 leading-tight text-[48px] font-bold text-center lg:text-left">
                Your Trusted Insurance &amp;
                <br />
                <span className="text-secondary">Claim Consulting</span> Partner
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-2xl text-[18px] text-center lg:text-left">
                Helping Individuals &amp; Businesses Choose the Right Insurance
                <br className="hidden lg:inline" />
                with Expert Claim Assistance. We navigate the complexity
                <br className="hidden lg:inline" />
                so you don't have to.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <button
                  className="px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-xl hover:translate-y-[-2px] transition-all border-0 min-h-0 text-[14px]"
                  onClick={() => scrollToSection("solutions")}
                >
                  Get Insurance Consultation
                </button>
                <button
                  className="px-8 py-4 border-2 border-secondary text-secondary rounded-xl font-label-md text-label-md hover:bg-secondary/5 transition-all bg-transparent min-h-0 text-[14px]"
                  onClick={() => scrollToSection("process")}
                >
                  Claim Assistance
                </button>
              </div>
              <div className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-8 grayscale opacity-70">
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-primary text-[24px] font-bold">
                    10+
                  </span>
                  <span className="font-label-md text-[12px] uppercase tracking-wider">
                    Partners
                  </span>
                </div>
                <div className="w-px h-10 bg-outline-variant"></div>
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-primary text-[24px] font-bold">
                    24/7
                  </span>
                  <span className="font-label-md text-[12px] uppercase tracking-wider">
                    Support
                  </span>
                </div>
                <div className="w-px h-10 bg-outline-variant"></div>
                <div className="flex flex-col">
                  <span className="font-headline-md text-headline-md text-primary text-[24px] font-bold">
                    100%
                  </span>
                  <span className="font-label-md text-[12px] uppercase tracking-wider">
                    Trusted
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Partner Slider */}
        <section className="pt-4 pb-8 bg-surface-container-lowest overflow-hidden border-t border-b border-outline-variant/30" id="partners">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-2 text-center reveal">
            <p className="font-label-md text-on-surface-variant uppercase tracking-widest text-[12px] font-semibold">
              Authorized Partners with Leading Insurers
            </p>
          </div>
          <div className="flex partner-slider whitespace-nowrap gap-10 items-center">
            {partnerLogos.map((logo, index) => (
              <span className={`partner-logo-card ${logo.className || ""}`.trim()} key={`${logo.src}-${index}`}>
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
                <span>OUR SERVICES</span>
                <div></div>
              </div>
              <h2 className="font-headline-lg font-extrabold tracking-tight">
                Comprehensive Insurance Solutions
              </h2>
              <p className="font-body-lg">
                From personal protection to large-scale industrial risks,
                <br />
                we provide tailored consultancy for every need.
              </p>
            </div>
            
            <div className="services-grid">
              {[
                {
                  title: "Motor Insurance",
                  icon: "directions_car",
                  desc: "Comprehensive coverage and claims support for personal cars, two-wheelers, and commercial logistics fleets.",
                  image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80",
                  route: "/services/motor-insurance",
                  delay: "0.1s"
                },
                {
                  title: "Life Insurance",
                  icon: "family_restroom",
                  desc: "Ensure your family's financial security with term life plans, savings strategies, and Keyman business protection.",
                  image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=80",
                  route: "/services/life-insurance",
                  delay: "0.2s"
                },
                {
                  title: "Warehouse Insurance",
                  icon: "inventory_2",
                  desc: "Protect warehouse stock, inventory, burglary risks, and storage liabilities from fire and hazards.",
                  image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
                  route: "/services/warehouse-insurance",
                  delay: "0.3s"
                },
                {
                  title: "Marine Insurance",
                  icon: "directions_boat",
                  desc: "Insure goods in transit via road, rail, air, or sea cargo policies and annual movement exposure.",
                  image: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=600&q=80",
                  route: "/services/marine-insurance",
                  delay: "0.4s"
                },
                {
                  title: "Commercial Insurance",
                  icon: "apartment",
                  desc: "Robust risk management, corporate asset protection, and liability covers for business establishments.",
                  image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
                  route: "/services/commercial-insurance",
                  delay: "0.5s"
                },
                {
                  title: "General Insurance",
                  icon: "shield",
                  desc: "Protect your personal assets, property, households, and miscellaneous exposures with curated insurance consulting.",
                  image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80",
                  route: "/services/general-insurance",
                  delay: "0.6s"
                },
                {
                  title: "Health Insurance",
                  icon: "medical_services",
                  desc: "Secure cashless hospitalization, critical illness support, and family health protection plans with expert guidance.",
                  image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80",
                  route: "/services/health-insurance",
                  delay: "0.7s"
                },
                {
                  title: "Policy Renewals",
                  icon: "sync",
                  desc: "Track and renew active policies across leading insurers without missing renewal dates or coverage continuity.",
                  image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=600&q=80",
                  route: "/services/policy-renewals",
                  delay: "0.8s"
                },
                {
                  title: "Claims Assistance",
                  icon: "gavel",
                  desc: "Get independent claim documentation reviews, insurer coordination, and settlement follow-up support.",
                  image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
                  route: "/services/claims-assistance",
                  delay: "0.9s"
                }
              ].map((service, index) => (
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
                        <span className="material-symbols-outlined text-[24px]">
                          {service.icon}
                        </span>
                      </div>
                      <h3 className="font-headline-md font-bold">
                        {service.title}
                      </h3>
                      <p className="text-body-md">
                        {service.desc}
                      </p>
                    </div>
                    
                    <span
                      className="service-card-link font-label-md group/btn"
                    >
                      Learn More{" "}
                      <span className="material-symbols-outlined text-[16px]">
                        arrow_forward
                      </span>
                    </span>
                  </div>
                  
                  <div className="service-card-media">
                    <div className="service-image-clip">
                      <img
                        src={service.image}
                        alt={service.title}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Trust Indicator Bar */}
            <div className="services-trust-bar reveal">
              <div className="services-trust-item">
                <span className="material-symbols-outlined">shield</span>
                <div>
                  <h4>Trusted Expertise</h4>
                  <p>Years of experience you can rely on.</p>
                </div>
              </div>
              <div className="services-trust-divider"></div>
              <div className="services-trust-item">
                <span className="material-symbols-outlined">person_add</span>
                <div>
                  <h4>Client First Approach</h4>
                  <p>Solutions tailored to your needs.</p>
                </div>
              </div>
              <div className="services-trust-divider"></div>
              <div className="services-trust-item">
                <span className="material-symbols-outlined">verified</span>
                <div>
                  <h4>Reliable Support</h4>
                  <p>We're here when you need us most.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us: Bento Grid Layout */}
        <section className="py-24 bg-surface-container-low">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 reveal">
              <div className="max-w-xl">
                <h2 className="font-headline-lg text-headline-lg text-primary mb-4 text-[32px] font-bold">
                  Why BIMAHEADQUARTER is Your Best Bet
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant text-[18px]">
                  We don't just sell policies; we build long-term relationships
                  through advocacy and expertise.
                </p>
              </div>
              <button
                onClick={() => scrollToSection("process")}
                className="font-label-md text-label-md text-primary flex items-center gap-2 px-6 py-3 border border-outline rounded-xl hover:bg-white transition-all bg-transparent min-h-0 text-[14px]"
              >
                View Our Process
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              <div className="md:col-span-2 glass-card p-10 rounded-3xl flex flex-col justify-between reveal border border-outline-variant/20">
                <div>
                  <span className="material-symbols-outlined text-secondary text-[48px] mb-6">
                    compare_arrows
                  </span>
                  <h3 className="font-headline-lg text-headline-lg text-primary mb-4 text-[32px] font-bold">
                    Unbiased Comparison
                  </h3>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md text-[18px]">
                    Access 10+ premium insurance partners on a single platform.
                    We help you compare premiums, features, and claim
                    settlement ratios fairly.
                  </p>
                </div>
                <div className="mt-12 flex flex-wrap gap-4">
                  <div className="bg-white/50 px-4 py-2 rounded-lg text-sm font-label-md border border-white">
                    Zero Hidden Costs
                  </div>
                  <div className="bg-white/50 px-4 py-2 rounded-lg text-sm font-label-md border border-white">
                    Transparent Advice
                  </div>
                  <div className="bg-white/50 px-4 py-2 rounded-lg text-sm font-label-md border border-white">
                    Real-time Quotes
                  </div>
                </div>
              </div>
              <div className="bg-primary p-10 rounded-3xl text-on-primary flex flex-col justify-between shadow-2xl reveal border border-primary/20">
                <span className="material-symbols-outlined text-secondary-fixed text-secondary text-[48px] mb-6">
                  support_agent
                </span>
                <div>
                  <h3 className="font-headline-lg text-headline-lg mb-4 text-[32px] font-bold text-white">
                    24/7 Expert Claim Support
                  </h3>
                  <p className="font-body-md text-body-md opacity-80 mb-8 text-[16px] text-white/80">
                    From documentation to settlement, our experts are by your
                    side at your time of need.
                  </p>
                  <button
                    onClick={() => scrollToSection("cta-banner")}
                    className="w-full py-4 bg-secondary text-white rounded-xl font-label-md hover:bg-secondary/90 transition-all border-0 min-h-0 text-[14px]"
                  >
                    Get Support Now
                  </button>
                </div>
              </div>
              <div
                className="glass-card p-10 rounded-3xl reveal border border-outline-variant/20"
                style={{ transitionDelay: "0.1s" }}
              >
                <span className="material-symbols-outlined text-secondary text-[40px] mb-6">
                  assignment_turned_in
                </span>
                <h3 className="font-headline-md text-headline-md text-primary mb-3 font-semibold text-[24px]">
                  Customized Plans
                </h3>
                <p className="text-body-md text-on-surface-variant text-[16px]">
                  Every business and individual is unique. We tailor policies to
                  fit your specific risk profile.
                </p>
              </div>
              <div
                className="glass-card p-10 rounded-3xl reveal border border-outline-variant/20"
                style={{ transitionDelay: "0.2s" }}
              >
                <span className="material-symbols-outlined text-secondary text-[40px] mb-6">
                  psychology
                </span>
                <h3 className="font-headline-md text-headline-md text-primary mb-3 font-semibold text-[24px]">
                  Expert Consultation
                </h3>
                <p className="text-body-md text-on-surface-variant text-[16px]">
                  Deep industry insights to help you understand the fine print
                  and avoid policy traps.
                </p>
              </div>
              <div
                className="glass-card p-10 rounded-3xl reveal border border-outline-variant/20"
                style={{ transitionDelay: "0.3s" }}
              >
                <span className="material-symbols-outlined text-secondary text-[40px] mb-6">
                  groups
                </span>
                <h3 className="font-headline-md text-headline-md text-primary mb-3 font-semibold text-[24px]">
                  Institutional Trust
                </h3>
                <p className="text-body-md text-on-surface-variant text-[16px]">
                  Backed by InsureDesk IMF Pvt Ltd, ensuring corporate-grade
                  compliance and reliability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Claim Assistance Process */}
        <section className="py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop" id="process">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 reveal">
              <img
                alt="Insurance claim assistance meeting with documents"
                className="rounded-3xl shadow-2xl w-full aspect-video object-cover"
                src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80"
              />
            </div>
            <div
              className="order-1 lg:order-2 reveal"
              style={{ transitionDelay: "0.2s" }}
            >
              <span className="font-label-md text-secondary uppercase tracking-widest text-[12px] mb-4 block font-semibold">
                Stress-Free Settlements
              </span>
              <h2 className="font-headline-lg text-headline-lg text-primary mb-8 text-[32px] font-bold">
                Claim Assistance Excellence
              </h2>
              <div className="space-y-8">
                <div className="flex gap-6 group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold transition-transform group-hover:scale-110">
                    1
                  </div>
                  <div>
                    <h4 className="font-headline-md text-[18px] text-primary mb-1 font-semibold">
                      Incident Reporting
                    </h4>
                    <p className="text-body-md text-on-surface-variant">
                      Notify us immediately after an incident. Our response team
                      is available 24/7 to guide you.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold transition-transform group-hover:scale-110">
                    2
                  </div>
                  <div>
                    <h4 className="font-headline-md text-[18px] text-primary mb-1 font-semibold">
                      Documentation Support
                    </h4>
                    <p className="text-body-md text-on-surface-variant">
                      Our experts help you gather and verify all required
                      documents to ensure no technical rejections.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 group">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold transition-transform group-hover:scale-110">
                    3
                  </div>
                  <div>
                    <h4 className="font-headline-md text-[18px] text-primary mb-1 font-semibold">
                      Advocacy &amp; Settlement
                    </h4>
                    <p className="text-body-md text-on-surface-variant">
                      We represent you to the insurer, handling all negotiations
                      until the claim is successfully settled.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => scrollToSection("cta-banner")}
                className="mt-12 px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md hover:shadow-lg transition-all reveal border-0 min-h-0 text-[14px]"
                style={{ transitionDelay: "0.4s" }}
              >
                Start a Claim Request
              </button>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-surface-container-highest/20 overflow-hidden border-t border-b border-outline-variant/10">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="text-center mb-16 reveal">
              <h2 className="font-headline-lg text-headline-lg text-primary text-[32px] font-bold">
                Voices of Satisfaction
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              <div
                className="glass-card p-10 rounded-3xl italic reveal border border-outline-variant/20"
                style={{ transitionDelay: "0.1s" }}
              >
                <div className="flex text-secondary mb-6">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface mb-8 text-[18px]">
                  "BIMAHEADQUARTER helped our manufacturing firm save 25% on
                  our commercial insurance premiums while actually increasing
                  our coverage scope. Their claim assistance is unparalleled."
                </p>
                <div className="flex items-center gap-4 not-italic">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center font-bold text-secondary text-sm">RK</div>
                  <div>
                    <p className="font-label-md text-primary font-bold text-[14px]">
                      Rajesh Kumar
                    </p>
                    <p className="text-[12px] text-on-surface-variant">
                      Director, RK Industries
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="glass-card p-10 rounded-3xl italic reveal border border-outline-variant/20"
                style={{ transitionDelay: "0.2s" }}
              >
                <div className="flex text-secondary mb-6">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface mb-8 text-[18px]">
                  "When my health claim was rejected initially, BIMAHEADQUARTER
                  stepped in. They reviewed the docs, found the error, and got
                  it approved in 48 hours. Lifesavers!"
                </p>
                <div className="flex items-center gap-4 not-italic">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center font-bold text-secondary text-sm">SS</div>
                  <div>
                    <p className="font-label-md text-primary font-bold text-[14px]">
                      Sneha Sharma
                    </p>
                    <p className="text-[12px] text-on-surface-variant">
                      Individual Policyholder
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="glass-card p-10 rounded-3xl italic reveal border border-outline-variant/20"
                style={{ transitionDelay: "0.3s" }}
              >
                <div className="flex text-secondary mb-6">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface mb-8 text-[18px]">
                  "Managing fleet insurance was a headache until we partnered
                  with them. Their portal and consultants make everything
                  seamless. Highly professional team."
                </p>
                <div className="flex items-center gap-4 not-italic">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center font-bold text-secondary text-sm">VS</div>
                  <div>
                    <p className="font-label-md text-primary font-bold text-[14px]">
                      Vikram Singh
                    </p>
                    <p className="text-[12px] text-on-surface-variant">
                      Logistics Manager
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop" id="faq">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="reveal">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-6 text-[32px] font-bold">
                Common Inquiries
              </h2>
              <p className="text-body-lg text-on-surface-variant mb-8 text-[18px]">
                Can't find what you're looking for? Reach out to our dedicated
                support team directly.
              </p>
              <button
                onClick={() => scrollToSection("cta-banner")}
                className="text-secondary font-label-md flex items-center gap-2 hover:underline group bg-transparent p-0 min-h-0 shadow-none hover:translate-y-0 text-[14px]"
              >
                Contact Support{" "}
                <span className="material-symbols-outlined group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                  arrow_outward
                </span>
              </button>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <details
                className="group bg-white rounded-2xl p-6 border border-outline-variant/30 open:shadow-md transition-all reveal"
                style={{ transitionDelay: "0.1s" }}
              >
                <summary className="list-none cursor-pointer flex justify-between items-center font-headline-md text-[18px] text-primary font-semibold">
                  Is the first consultation really free?
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <p className="mt-4 text-body-md text-on-surface-variant">
                  Yes, we provide initial policy review and consultation at no
                  cost to help you understand your current coverage gaps and
                  potential savings.
                </p>
              </details>
              <details
                className="group bg-white rounded-2xl p-6 border border-outline-variant/30 open:shadow-md transition-all reveal"
                style={{ transitionDelay: "0.2s" }}
              >
                <summary className="list-none cursor-pointer flex justify-between items-center font-headline-md text-[18px] text-primary font-semibold">
                  How many insurance partners do you work with?
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <p className="mt-4 text-body-md text-on-surface-variant">
                  We are authorized partners with over 10 leading national
                  insurance companies, ensuring you get a wide range of quotes
                  and feature sets.
                </p>
              </details>
              <details
                className="group bg-white rounded-2xl p-6 border border-outline-variant/30 open:shadow-md transition-all reveal"
                style={{ transitionDelay: "0.3s" }}
              >
                <summary className="list-none cursor-pointer flex justify-between items-center font-headline-md text-[18px] text-primary font-semibold">
                  Can you help with a claim for a policy I didn't buy through
                  you?
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <p className="mt-4 text-body-md text-on-surface-variant">
                  Absolutely. Our Claim Assistance service is available for all
                  policyholders, regardless of where the policy was originally
                  purchased. Fees may apply for third-party advocacy.
                </p>
              </details>
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
              Need Help Choosing Insurance?
            </h2>
            <p
              className="font-body-lg text-body-lg mb-10 opacity-80 max-w-2xl mx-auto entry-anim text-white/80 text-[18px]"
              style={{ animationDelay: "0.2s" }}
            >
              Get a personalized risk assessment and expert recommendations
              today from our certified advisors.
            </p>
            <div
              className="flex flex-wrap justify-center gap-6 entry-anim"
              style={{ animationDelay: "0.4s" }}
            >
              <a
                href={`tel:${BUSINESS_DETAILS.phoneHref}`}
                className="px-10 py-5 bg-secondary text-white rounded-xl font-label-md text-label-md flex items-center gap-3 hover:scale-105 transition-all text-[14px]"
              >
                <span className="material-symbols-outlined">call</span> Call Now:
                {BUSINESS_DETAILS.phone}
              </a>
              <button
                onClick={() => window.alert("Consultation scheduled! Our office staff will reach out to you shortly.")}
                className="px-10 py-5 bg-white text-primary rounded-xl font-label-md text-label-md flex items-center gap-3 hover:scale-105 transition-all border-0 min-h-0 text-[14px]"
              >
                Schedule Consultation
              </button>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
