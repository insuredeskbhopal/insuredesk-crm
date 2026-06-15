"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import BrandLogo from "@/app/components/brand/BrandLogo";
import {
  BUSINESS_DETAILS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL
} from "@/lib/seo/site";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/about#webpage`,
      url: `${SITE_URL}/about`,
      name: `About Us | ${SITE_NAME}`,
      headline: `About BIMAHEADQUARTER`,
      description: `Learn about BIMAHEADQUARTER, an insurance and claim consulting brand by InsureDesk IMF Pvt Ltd serving individuals and businesses in India.`,
      isPartOf: {
        "@id": `${SITE_URL}/#website`
      },
      about: {
        "@id": `${SITE_URL}/#organization`
      },
      inLanguage: "en-IN"
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: "Bima Headquarter",
      legalName: BUSINESS_DETAILS.legalName,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/main-logo-wide.png`,
      email: BUSINESS_DETAILS.email,
      telephone: BUSINESS_DETAILS.phone,
      description: SITE_DESCRIPTION,
      areaServed: BUSINESS_DETAILS.serviceArea
    }
  ]
};

export default function AboutPage() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Add page-specific body class to scope styles and prevent overrides from globals.css
    document.body.classList.add("landing-page");

    // Check if user is logged in
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not logged in");
      })
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // No-op (remain as guest)
      });

    // Handle scroll events for navbar state
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);

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
      window.removeEventListener("scroll", handleScroll);
      revealObserver.disconnect();
      glassCards.forEach((card) => {
        card.removeEventListener("mousemove", handleMouseMove);
      });
    };
  }, []);

  return (
    <>
      {/* Load Tailwind CSS via CDN since it is not set up locally */}
      <Script
        src="https://cdn.tailwindcss.com?plugins=forms,container-queries"
        strategy="beforeInteractive"
      />
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
        id="about-structured-data"
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

        nav.scrolled {
            height: 64px !important;
            background-color: rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
            border-color: rgba(197, 198, 207, 0.3) !important;
        }

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

        .landing-page button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            transition: all 0.2s !important;
            box-shadow: none !important;
            animation: none !important;
            transform: none !important;
            border-radius: 0.75rem !important;
            font-weight: 600 !important;
        }

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

        .landing-page button.bg-secondary {
            background-color: #1c6c39 !important;
            color: #ffffff !important;
        }
        .landing-page button.bg-secondary:hover {
            background-color: #16552d !important;
            color: #ffffff !important;
        }

        .landing-page button.bg-white {
            background-color: #ffffff !important;
            color: #031638 !important;
        }
        .landing-page button.bg-white:hover {
            background-color: #f1f5f9 !important;
            color: #031638 !important;
            transform: scale(1.05) !important;
        }

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
      ` }} />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        {/* TopNavBar */}
        <nav
          className={`bg-surface-container-lowest/0 backdrop-blur-0 sticky top-0 z-50 border-b border-transparent transition-all duration-300 h-20 flex items-center ${
            scrolled ? "scrolled" : ""
          }`}
          id="mainNav"
        >
          <div className="landing-nav-inner max-w-container-max w-full mx-auto px-margin-mobile md:px-margin-desktop flex justify-between items-center h-full">
            <div className="landing-brand entry-anim" style={{ animationDelay: "0.1s" }}>
              <BrandLogo href="/" />
            </div>
            
            {/* Desktop Navigation Links */}
            <div className="landing-nav-links hidden md:flex gap-6">
              <Link
                href="/#solutions"
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors entry-anim p-0 text-[16px] font-medium"
                style={{ animationDelay: "0.2s" }}
              >
                Services
              </Link>
              <Link
                href="/#process"
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors entry-anim p-0 text-[16px] font-medium"
                style={{ animationDelay: "0.3s" }}
              >
                Claims
              </Link>
              <Link
                href="/#solutions"
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors entry-anim p-0 text-[16px] font-medium"
                style={{ animationDelay: "0.4s" }}
              >
                Plans
              </Link>
              <Link
                href="/#partners"
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors entry-anim p-0 text-[16px] font-medium"
                style={{ animationDelay: "0.5s" }}
              >
                Partners
              </Link>
              <Link
                href="/about"
                className="font-body-md text-body-md text-secondary border-b-2 border-secondary pb-1 entry-anim p-0 text-[16px] font-semibold"
                style={{ animationDelay: "0.6s" }}
              >
                About
              </Link>
            </div>

            <div className="landing-nav-actions flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-4 mr-4">
                <Link
                  href="/#cta-banner"
                  className="p-2 rounded-full hover:bg-surface-container-low transition-all entry-anim text-primary flex items-center justify-center"
                  style={{ animationDelay: "0.7s" }}
                >
                  <span className="material-symbols-outlined text-primary">call</span>
                </Link>
                <Link
                  href="/#cta-banner"
                  className="p-2 rounded-full hover:bg-surface-container-low transition-all entry-anim text-primary flex items-center justify-center"
                  style={{ animationDelay: "0.8s" }}
                >
                  <span className="material-symbols-outlined text-primary">chat</span>
                </Link>
              </div>

              {user ? (
                <Link
                  className="hidden md:block font-label-md text-label-md px-6 py-3 rounded-lg border border-secondary text-secondary hover:bg-secondary/5 transition-all entry-anim flex items-center justify-center text-[14px]"
                  style={{ animationDelay: "0.9s" }}
                  href="/dashboard"
                >
                  Go to CRM Dashboard
                </Link>
              ) : (
                <Link
                  className="hidden md:block font-label-md text-label-md px-6 py-3 rounded-lg border border-secondary text-secondary hover:bg-secondary/5 transition-all entry-anim flex items-center justify-center text-[14px]"
                  style={{ animationDelay: "0.9s" }}
                  href="/crm/admin/login"
                >
                  Client Login
                </Link>
              )}

              <Link
                href="/#cta-banner"
                className="font-label-md text-label-md px-6 py-3 rounded-lg bg-primary text-on-primary hover:shadow-lg active:scale-95 transition-all entry-anim flex items-center justify-center text-[14px] font-bold"
                style={{ animationDelay: "1s" }}
              >
                Free Consultation
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="relative pt-24 pb-32 overflow-hidden flex items-center justify-center min-h-[500px] bg-gradient-to-b from-surface-container/30 to-background">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center flex flex-col items-center justify-center relative z-10">
            <div className="entry-anim flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[12px] mb-6">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
                BY INSUREDESK IMF PVT LTD
              </div>
              <h1 className="font-display-lg text-display-lg text-primary mb-6 leading-tight text-[48px] font-bold max-w-4xl">
                About <span className="text-secondary">BIMAHEADQUARTER</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-3xl mx-auto text-[18px] leading-relaxed">
                An institutional consulting and claim assistance brand by{" "}
                <strong className="text-primary font-semibold">InsureDesk IMF Pvt Ltd</strong>.
                We bridge the gap between policyholders and insurance providers across India with absolute integrity, regulatory precision, and claim settlement advocacy.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/#cta-banner"
                  className="px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center text-[14px] font-bold"
                >
                  Schedule Consultation
                </Link>
                <Link
                  href="/#solutions"
                  className="px-8 py-4 border-2 border-secondary text-secondary rounded-xl font-label-md text-label-md hover:bg-secondary/5 transition-all flex items-center justify-center bg-transparent text-[14px] font-semibold"
                >
                  Explore Consulting Solutions
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Brand Pillars / Mission Vision Values */}
        <section className="py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop bg-background">
          <div className="text-center mb-16 reveal">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-4 text-[32px] font-bold">
              Our Core Principles
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto text-[18px]">
              Every client interaction is driven by our commitment to simplify the insurance lifecycle and deliver positive outcomes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-10 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20">
              <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-[32px]">explore</span>
              </div>
              <h3 className="font-headline-md text-[22px] text-primary mb-4 font-bold">
                Our Mission
              </h3>
              <p className="text-body-md text-on-surface-variant text-[16px] leading-relaxed">
                To simplify corporate and individual insurance through transparent assessment, identifying coverage gaps, and championing policyholder rights in complex claim situations.
              </p>
            </div>

            <div className="glass-card p-10 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20" style={{ transitionDelay: "0.15s" }}>
              <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-[32px]">visibility</span>
              </div>
              <h3 className="font-headline-md text-[22px] text-primary mb-4 font-bold">
                Our Vision
              </h3>
              <p className="text-body-md text-on-surface-variant text-[16px] leading-relaxed">
                To be India's premier consulting brand for institutional risk advisory and professional claims advocacy, delivering unbiased advice and prompt settlements.
              </p>
            </div>

            <div className="glass-card p-10 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20" style={{ transitionDelay: "0.3s" }}>
              <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-[32px]">gavel</span>
              </div>
              <h3 className="font-headline-md text-[22px] text-primary mb-4 font-bold">
                Core Values
              </h3>
              <p className="text-body-md text-on-surface-variant text-[16px] leading-relaxed">
                Integrity, client advocacy, and complete regulatory alignment. We stand firmly with policyholders to verify that legitimate claims are settled fairly and transparently.
              </p>
            </div>
          </div>
        </section>

        {/* Corporate Background Section */}
        <section className="py-24 bg-surface-container-low border-t border-b border-outline-variant/20">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="reveal">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[11px] mb-4">
                  COMPLIANCE & AUTHORITY
                </div>
                <h2 className="font-headline-lg text-headline-lg text-primary mb-6 text-[32px] font-bold leading-tight">
                  Licensed Expertise by InsureDesk IMF Pvt Ltd
                </h2>
                <div className="space-y-6 text-on-surface-variant text-[16px] leading-relaxed">
                  <p>
                    BIMAHEADQUARTER operates as an exclusive consulting and services brand under the corporate umbrella of <strong>InsureDesk IMF Pvt Ltd</strong>. As a licensed Insurance Marketing Firm registered under the regulations of the Insurance Regulatory and Development Authority of India (IRDAI), we carry out professional activities with robust compliance.
                  </p>
                  <p>
                    Unlike traditional agents who solely focus on selling policy packages, we offer comprehensive risk management consulting, policy review to detect exclusions, and expert assistance in filing or representing claims after losses occur.
                  </p>
                  <p>
                    Whether protecting industrial assets, warehouse inventory, employee corporate health, or commercial transits, BIMAHEADQUARTER combines local presence with corporate standards to safeguard your business.
                  </p>
                </div>
                <div className="mt-8 flex gap-8">
                  <div className="flex flex-col">
                    <span className="font-headline-md text-primary font-bold text-[24px]">10+</span>
                    <span className="text-sm font-medium uppercase tracking-wider text-on-surface-variant/70 text-[11px]">National Partners</span>
                  </div>
                  <div className="w-px h-10 bg-outline-variant"></div>
                  <div className="flex flex-col">
                    <span className="font-headline-md text-primary font-bold text-[24px]">100%</span>
                    <span className="text-sm font-medium uppercase tracking-wider text-on-surface-variant/70 text-[11px]">Unbiased Consulting</span>
                  </div>
                </div>
              </div>

              {/* Graphic Card */}
              <div className="relative rounded-3xl p-12 overflow-hidden bg-primary text-white shadow-2xl border border-primary/20 reveal">
                <div className="absolute inset-0 -z-10 opacity-10">
                  <div className="absolute top-0 left-0 w-48 h-48 bg-secondary rounded-full blur-[80px]"></div>
                  <div className="absolute bottom-0 right-0 w-48 h-48 bg-secondary rounded-full blur-[80px]"></div>
                </div>
                <h3 className="font-headline-md text-[24px] mb-6 font-bold text-white">
                  Our Consulting Philosophy
                </h3>
                <ul className="space-y-6">
                  <li className="flex gap-4 items-start">
                    <span className="material-symbols-outlined text-secondary text-[24px] mt-1">check_circle</span>
                    <div>
                      <h4 className="font-semibold text-[16px] text-white">Detailed Gap Analysis</h4>
                      <p className="text-white/70 text-sm mt-1">We inspect existing policies for loopholes, hidden deductibles, and under-insurance risks.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="material-symbols-outlined text-secondary text-[24px] mt-1">check_circle</span>
                    <div>
                      <h4 className="font-semibold text-[16px] text-white">Independent Claim Advocacy</h4>
                      <p className="text-white/70 text-sm mt-1">We assist in coordinating loss documentation, surveyor meetings, and legal representation if required.</p>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="material-symbols-outlined text-secondary text-[24px] mt-1">check_circle</span>
                    <div>
                      <h4 className="font-semibold text-[16px] text-white">Carrier Agnostic Reviews</h4>
                      <p className="text-white/70 text-sm mt-1">We work with multiple top-rated insurers, helping you compare based on premium and claim settlement speed.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section
          className="py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-margin-desktop mt-12"
          id="cta-banner"
        >
          <div className="relative bg-primary rounded-3xl p-12 lg:p-20 overflow-hidden text-center text-on-primary shadow-2xl reveal border border-primary/20">
            <div className="absolute inset-0 -z-10 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
            </div>
            <h2 className="font-display-lg text-display-lg mb-6 entry-anim text-white text-[48px] font-bold">
              Discuss Your Policy with Certified Advisors
            </h2>
            <p
              className="font-body-lg text-body-lg mb-10 opacity-80 max-w-2xl mx-auto entry-anim text-white/80 text-[18px]"
              style={{ animationDelay: "0.2s" }}
            >
              Get a thorough check on your commercial policies or health coverage gaps. Connect with BIMAHEADQUARTER today.
            </p>
            <div
              className="flex flex-wrap justify-center gap-6 entry-anim"
              style={{ animationDelay: "0.4s" }}
            >
              <a
                href={`tel:${BUSINESS_DETAILS.phone.replace(/\s+/g, "")}`}
                className="px-10 py-5 bg-secondary text-white rounded-xl font-label-md text-label-md flex items-center gap-3 hover:scale-105 transition-all text-[14px]"
              >
                <span className="material-symbols-outlined">call</span> Call Now: {BUSINESS_DETAILS.phone}
              </a>
              <a
                href={`mailto:${BUSINESS_DETAILS.email}`}
                className="px-10 py-5 bg-white text-primary rounded-xl font-label-md text-label-md flex items-center gap-3 hover:scale-105 transition-all border-0 min-h-0 text-[14px] font-bold"
              >
                <span className="material-symbols-outlined">mail</span> Email Us
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-primary text-on-primary pt-16 pb-12 border-t border-white/10">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-16">
              <div className="col-span-1 md:col-span-1">
                <div className="footer-brand mb-6">
                  <BrandLogo href="/" />
                </div>
                <p className="font-body-md text-on-primary/70 mb-8 text-[16px] text-white/70">
                  Institutional insurance consultancy by InsureDesk IMF Pvt Ltd.
                  Expert advocacy for your protection.
                </p>
                <div className="flex gap-4">
                  <a
                    className="w-10 h-10 rounded-full border border-on-primary/20 flex items-center justify-center hover:bg-secondary transition-all"
                    href="#"
                  >
                    <span className="material-symbols-outlined text-[20px] text-white/60 hover:text-white">
                      public
                    </span>
                  </a>
                  <a
                    className="w-10 h-10 rounded-full border border-on-primary/20 flex items-center justify-center hover:bg-secondary transition-all"
                    href="#"
                  >
                    <span className="material-symbols-outlined text-[20px] text-white/60 hover:text-white">
                      share
                    </span>
                  </a>
                </div>
              </div>
              <div>
                <h5 className="font-headline-md text-[18px] text-white mb-6 font-semibold">
                  Explore
                </h5>
                <ul className="space-y-4 font-body-md text-on-primary/60 text-white/60">
                  <li>
                    <Link href="/#solutions" className="hover:text-white transition-colors block text-left">
                      Insurance Solutions
                    </Link>
                  </li>
                  <li>
                    <Link href="/#process" className="hover:text-white transition-colors block text-left">
                      Claim Assistance
                    </Link>
                  </li>
                  <li>
                    <Link href="/#partners" className="hover:text-white transition-colors block text-left">
                      Partner Network
                    </Link>
                  </li>
                  <li>
                    <Link href="/#faq" className="hover:text-white transition-colors block text-left">
                      Client Testimonials
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-headline-md text-[18px] text-white mb-6 font-semibold">
                  Company
                </h5>
                <ul className="space-y-4 font-body-md text-on-primary/60 text-white/60">
                  <li>
                    <Link href="/about" className="hover:text-white transition-colors block text-left">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <a className="hover:text-white transition-colors block" href="#">
                      Careers
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-white transition-colors block" href="#">
                      Press &amp; Media
                    </a>
                  </li>
                  <li>
                    <Link href="/#cta-banner" className="hover:text-white transition-colors block text-left">
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-headline-md text-[18px] text-white mb-6 font-semibold">
                  Legal &amp; Support
                </h5>
                <ul className="space-y-4 font-body-md text-on-primary/60 text-white/60 font-medium">
                  <li>
                    <Link href="/privacy-policy" className="hover:text-white transition-colors block">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms-and-conditions" className="hover:text-white transition-colors block">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <a className="hover:text-white transition-colors block" href="#">
                      Disclaimer
                    </a>
                  </li>
                  <li>
                    <Link href="/#faq" className="hover:text-white transition-colors block text-left">
                      Support Center
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t border-on-primary/10 flex flex-col md:flex-row justify-between gap-6">
              <p className="font-body-md text-sm text-on-primary/60 text-white/50 text-[14px]">
                © {new Date().getFullYear()} BIMAHEADQUARTER. All rights reserved. Bhopal Office: {BUSINESS_DETAILS.address.streetAddress}, {BUSINESS_DETAILS.address.addressLocality}.
              </p>
              <div className="flex gap-8 text-sm text-on-primary/60 text-white/50 text-[14px]">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">mail</span>{" "}
                  {BUSINESS_DETAILS.email}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">call</span>{" "}
                  {BUSINESS_DETAILS.phone}
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
