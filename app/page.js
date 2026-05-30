"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { INSURER_LOGOS } from "@/app/components/brand/logoAssets";

export default function RootPage() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
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

    // Handle scroll events for navbar state and parallax positioning
    const handleScroll = () => {
      setScrollY(window.scrollY);
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

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };
  const partnerLogos = [...INSURER_LOGOS, ...INSURER_LOGOS];

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

      {/* Inject external fonts & CSS references */}
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <style dangerouslySetInnerHTML={{ __html: `
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

        nav.scrolled {
            height: 64px !important;
            background-color: rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
            border-color: rgba(197, 198, 207, 0.3) !important;
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
            <div className="landing-nav-links hidden md:flex gap-6">
              <button
                className="font-body-md text-body-md text-secondary border-b-2 border-secondary pb-1 entry-anim bg-transparent p-0 min-h-0 text-[16px] shadow-none hover:translate-y-0 rounded-none"
                onClick={() => scrollToSection("solutions")}
                style={{ animationDelay: "0.2s" }}
              >
                Services
              </button>
              <button
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors entry-anim bg-transparent p-0 min-h-0 text-[16px] shadow-none hover:translate-y-0 rounded-none"
                onClick={() => scrollToSection("process")}
                style={{ animationDelay: "0.3s" }}
              >
                Claims
              </button>
              <button
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors entry-anim bg-transparent p-0 min-h-0 text-[16px] shadow-none hover:translate-y-0 rounded-none"
                onClick={() => scrollToSection("solutions")}
                style={{ animationDelay: "0.4s" }}
              >
                Plans
              </button>
              <button
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors entry-anim bg-transparent p-0 min-h-0 text-[16px] shadow-none hover:translate-y-0 rounded-none"
                onClick={() => scrollToSection("partners")}
                style={{ animationDelay: "0.5s" }}
              >
                Partners
              </button>
              <button
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors entry-anim bg-transparent p-0 min-h-0 text-[16px] shadow-none hover:translate-y-0 rounded-none"
                onClick={() => scrollToSection("faq")}
                style={{ animationDelay: "0.6s" }}
              >
                About
              </button>
            </div>
            <div className="landing-nav-actions flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-4 mr-4">
                <button
                  className="p-2 rounded-full hover:bg-surface-container-low transition-all entry-anim bg-transparent border-0 min-h-0 text-primary"
                  style={{ animationDelay: "0.7s" }}
                  onClick={() => scrollToSection("cta-banner")}
                >
                  <span className="material-symbols-outlined text-primary">call</span>
                </button>
                <button
                  className="p-2 rounded-full hover:bg-surface-container-low transition-all entry-anim bg-transparent border-0 min-h-0 text-primary"
                  style={{ animationDelay: "0.8s" }}
                  onClick={() => scrollToSection("cta-banner")}
                >
                  <span className="material-symbols-outlined text-primary">chat</span>
                </button>
              </div>
              
              {user ? (
                <a
                  className="hidden md:block font-label-md text-label-md px-6 py-3 rounded-lg border border-secondary text-secondary hover:bg-secondary/5 transition-all entry-anim flex items-center justify-center text-[14px]"
                  style={{ animationDelay: "0.9s" }}
                  href="/dashboard"
                >
                  Go to CRM Dashboard
                </a>
              ) : (
                <a
                  className="hidden md:block font-label-md text-label-md px-6 py-3 rounded-lg border border-secondary text-secondary hover:bg-secondary/5 transition-all entry-anim flex items-center justify-center text-[14px]"
                  style={{ animationDelay: "0.9s" }}
                  href="/crm/admin/login"
                >
                  Client Login
                </a>
              )}

              <button
                className="font-label-md text-label-md px-6 py-3 rounded-lg bg-primary text-on-primary hover:shadow-lg active:scale-95 transition-all entry-anim border-0 min-h-0 text-[14px]"
                style={{ animationDelay: "1s" }}
                onClick={() => scrollToSection("cta-banner")}
              >
                Free Consultation
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="relative pt-20 pb-32 overflow-hidden" id="hero">
          <div
            className="parallax-bg absolute inset-0 -z-10 bg-gradient-to-b from-surface-container/30 to-background"
            style={{ transform: `translateY(${scrollY * 0.4}px)` }}
          ></div>
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="entry-anim">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[12px] mb-6">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                BY INSUREDESK IMF PVT LTD
              </div>
              <h1 className="font-display-lg text-display-lg text-primary mb-6 leading-tight text-[48px] font-bold">
                Your Trusted Insurance &amp;{" "}
                <span className="text-secondary">Claim Consulting</span> Partner
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-xl text-[18px]">
                Helping Individuals &amp; Businesses Choose the Right Insurance
                with Expert Claim Assistance. We navigate the complexity so you
                don't have to.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  className="px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-xl hover:translate-y-[-2px] transition-all entry-anim border-0 min-h-0 text-[14px]"
                  style={{ animationDelay: "0.2s" }}
                  onClick={() => scrollToSection("solutions")}
                >
                  Get Insurance Consultation
                </button>
                <button
                  className="px-8 py-4 border-2 border-secondary text-secondary rounded-xl font-label-md text-label-md hover:bg-secondary/5 transition-all entry-anim bg-transparent min-h-0 text-[14px]"
                  style={{ animationDelay: "0.3s" }}
                  onClick={() => scrollToSection("process")}
                >
                  Claim Assistance
                </button>
              </div>
              <div className="mt-12 flex items-center gap-8 grayscale opacity-70">
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
            <div className="relative entry-anim" style={{ animationDelay: "0.1s" }}>
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img
                  alt="Modern insurance office environment"
                  className="w-full h-full object-cover aspect-[4/3]"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMBVNmgNzHJiQpWghzz0ODWXDQxYzlDUtB-Vv3SSzmsof6hICAnbf71wxKb8ScKhzoLoLfk9UtOhzz5sGj_w0mLE-M2lE5dH3pjxyCWYxXvmTgu24XaHxZt2yTeAc6B4LL4A2hv0uXC597tjZwC0_okDid6ZjZzpR6QqJSlrQUg4ceoGlrLKLC-h1T3xbAV04MN6ltK80pKly7y0S56tU50INm1HO1zJ-W0qw5Owa3yV8L5eim1NqmNwYTxbB8LK91VhF8Y07d1X0"
                />
              </div>
              {/* Floating Elements with Parallax */}
              <div
                className="parallax-item absolute -top-6 -right-6 glass-card p-6 rounded-2xl z-20 flex items-center gap-4"
                style={{ transform: `translateY(${scrollY * 0.05}px)` }}
              >
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-secondary-container text-secondary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    shield_with_heart
                  </span>
                </div>
                <div>
                  <p className="font-label-md text-primary font-bold text-[14px]">
                    99% Claims
                  </p>
                  <p className="text-[12px] text-on-surface-variant">
                    Settlement Success
                  </p>
                </div>
              </div>
              <div
                className="parallax-item absolute -bottom-8 -left-8 glass-card p-6 rounded-2xl z-20 flex items-center gap-4"
                style={{ transform: `translateY(${scrollY * -0.03}px)` }}
              >
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-secondary/20 flex items-center justify-center text-[10px] text-secondary font-bold">BH</div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold">ID</div>
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-secondary-container flex items-center justify-center text-[10px] text-on-secondary-container font-bold">+5k</div>
                </div>
                <p className="font-label-md text-primary font-bold text-[14px]">
                  5k+ Trusted Clients
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Partner Slider */}
        <section className="py-12 bg-surface-container-lowest overflow-hidden border-t border-b border-outline-variant/30" id="partners">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-8 text-center reveal">
            <p className="font-label-md text-on-surface-variant uppercase tracking-widest text-[12px] font-semibold">
              Authorized Partners with Leading Insurers
            </p>
          </div>
          <div className="flex partner-slider whitespace-nowrap gap-10 items-center">
            {partnerLogos.map((logo, index) => (
              <span className={`partner-logo-card ${logo.className || ""}`.trim()} key={`${logo.src}-${index}`}>
                <Image src={logo.src} alt={`${logo.name} logo`} width={136} height={44} />
              </span>
            ))}
          </div>
        </section>

        {/* Insurance Categories Grid */}
        <section className="py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop" id="solutions">
          <div className="text-center mb-16 reveal">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-4 text-[32px] font-bold">
              Comprehensive Insurance Solutions
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto text-[18px]">
              From personal protection to large-scale industrial risks, we
              provide tailored consultancy for every need.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Card Components */}
            <div
              className="glass-card p-8 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20"
              style={{ transitionDelay: "0.1s" }}
            >
              <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-[32px]">
                  directions_car
                </span>
              </div>
              <h3 className="font-headline-md text-[20px] text-primary mb-3 font-semibold">
                Car
              </h3>
              <p className="text-body-md text-on-surface-variant mb-6 text-sm">
                Full protection for your vehicle &amp; passengers.
              </p>
              <button
                onClick={() => scrollToSection("cta-banner")}
                className="mt-auto font-label-md text-secondary hover:underline flex items-center gap-1 bg-transparent p-0 min-h-0 shadow-none hover:translate-y-0 text-[14px]"
              >
                Learn More{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </button>
            </div>
            <div
              className="glass-card p-8 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20"
              style={{ transitionDelay: "0.2s" }}
            >
              <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-[32px]">
                  two_wheeler
                </span>
              </div>
              <h3 className="font-headline-md text-[20px] text-primary mb-3 font-semibold">
                Bike
              </h3>
              <p className="text-body-md text-on-surface-variant mb-6 text-sm">
                Swift coverage for two-wheeler safety.
              </p>
              <button
                onClick={() => scrollToSection("cta-banner")}
                className="mt-auto font-label-md text-secondary hover:underline flex items-center gap-1 bg-transparent p-0 min-h-0 shadow-none hover:translate-y-0 text-[14px]"
              >
                Learn More{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </button>
            </div>
            <div
              className="glass-card p-8 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20"
              style={{ transitionDelay: "0.3s" }}
            >
              <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-[32px]">
                  medical_services
                </span>
              </div>
              <h3 className="font-headline-md text-[20px] text-primary mb-3 font-semibold">
                Health
              </h3>
              <p className="text-body-md text-on-surface-variant mb-6 text-sm">
                Cashless treatments and wellness support.
              </p>
              <button
                onClick={() => scrollToSection("cta-banner")}
                className="mt-auto font-label-md text-secondary hover:underline flex items-center gap-1 bg-transparent p-0 min-h-0 shadow-none hover:translate-y-0 text-[14px]"
              >
                Learn More{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </button>
            </div>
            <div
              className="glass-card p-8 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20"
              style={{ transitionDelay: "0.4s" }}
            >
              <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-[32px]">
                  family_restroom
                </span>
              </div>
              <h3 className="font-headline-md text-[20px] text-primary mb-3 font-semibold">
                Life
              </h3>
              <p className="text-body-md text-on-surface-variant mb-6 text-sm">
                Secure your family's financial future.
              </p>
              <button
                onClick={() => scrollToSection("cta-banner")}
                className="mt-auto font-label-md text-secondary hover:underline flex items-center gap-1 bg-transparent p-0 min-h-0 shadow-none hover:translate-y-0 text-[14px]"
              >
                Learn More{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </button>
            </div>
            <div
              className="glass-card p-8 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20"
              style={{ transitionDelay: "0.5s" }}
            >
              <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-[32px]">
                  apartment
                </span>
              </div>
              <h3 className="font-headline-md text-[20px] text-primary mb-3 font-semibold">
                Commercial
              </h3>
              <p className="text-body-md text-on-surface-variant mb-6 text-sm">
                Robust risk management for businesses.
              </p>
              <button
                onClick={() => scrollToSection("cta-banner")}
                className="mt-auto font-label-md text-secondary hover:underline flex items-center gap-1 bg-transparent p-0 min-h-0 shadow-none hover:translate-y-0 text-[14px]"
              >
                Learn More{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </button>
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
                alt="Close up of legal documentation and pen"
                className="rounded-3xl shadow-2xl w-full aspect-video object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAKSTv4L68JEEu6b-BJ5RlpdK73HNSKLCBdZXj0vPW4yCgCuSwZC5c3cAqtdB7a3_fCsdqVn2pRNnc4uUkn2ihOapYDwjkACISDA1JaXf4x1PpY_ZlMGZh_Hz72yDoap7T7TfardOVZ1BqUlILw-UEhqF7sph8VsLEuTDVx8aIJbO73C-OqKXZ4Q8Ife_Ysi0iFinP-yH8CbjHb1iBDppr-PHldYKcWFAyecCGXESzFU6FSfh6bjweZI8eFj7Vv94exYwpvlZ_es8"
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
                href="tel:+911234567890"
                className="px-10 py-5 bg-secondary text-white rounded-xl font-label-md text-label-md flex items-center gap-3 hover:scale-105 transition-all text-[14px]"
              >
                <span className="material-symbols-outlined">call</span> Call Now:
                +91 123 456 7890
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
                    <button
                      onClick={() => scrollToSection("solutions")}
                      className="hover:text-white transition-colors bg-transparent border-0 p-0 min-h-0 text-left"
                    >
                      Insurance Solutions
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("process")}
                      className="hover:text-white transition-colors bg-transparent border-0 p-0 min-h-0 text-left"
                    >
                      Claim Assistance
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("partners")}
                      className="hover:text-white transition-colors bg-transparent border-0 p-0 min-h-0 text-left"
                    >
                      Partner Network
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("faq")}
                      className="hover:text-white transition-colors bg-transparent border-0 p-0 min-h-0 text-left"
                    >
                      Client Testimonials
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-headline-md text-[18px] text-white mb-6 font-semibold">
                  Company
                </h5>
                <ul className="space-y-4 font-body-md text-on-primary/60 text-white/60">
                  <li>
                    <button
                      onClick={() => scrollToSection("faq")}
                      className="hover:text-white transition-colors bg-transparent border-0 p-0 min-h-0 text-left"
                    >
                      About Us
                    </button>
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
                    <button
                      onClick={() => scrollToSection("cta-banner")}
                      className="hover:text-white transition-colors bg-transparent border-0 p-0 min-h-0 text-left"
                    >
                      Contact Us
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-headline-md text-[18px] text-white mb-6 font-semibold">
                  Legal &amp; Support
                </h5>
                <ul className="space-y-4 font-body-md text-on-primary/60 text-white/60 font-medium">
                  <li>
                    <a className="hover:text-white transition-colors block" href="#">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-white transition-colors block" href="#">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a className="hover:text-white transition-colors block" href="#">
                      Disclaimer
                    </a>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection("faq")}
                      className="hover:text-white transition-colors bg-transparent border-0 p-0 min-h-0 text-left"
                    >
                      Support Center
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t border-on-primary/10 flex flex-col md:flex-row justify-between gap-6">
              <p className="font-body-md text-sm text-on-primary/60 text-white/50 text-[14px]">
                © 2024 BIMAHEADQUARTER. All rights reserved. Bhopal Office: 123
                Corporate Plaza, M.P. Nagar.
              </p>
              <div className="flex gap-8 text-sm text-on-primary/60 text-white/50 text-[14px]">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">mail</span>{" "}
                  info@bimaheadquarter.com
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">call</span>{" "}
                  +91 755 000 0000
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
