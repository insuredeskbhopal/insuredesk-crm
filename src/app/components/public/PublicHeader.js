"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/app/components/brand/BrandLogo";
import Breadcrumbs from "@/app/components/public/Breadcrumbs";
import { BUSINESS_DETAILS } from "@/lib/seo/site";

const navItems = [
  { label: "Home", href: "/", priority: "core" },
  { label: "Services", href: "/services", priority: "core" },
  { label: "Claims", href: "/services/claims-assistance", priority: "core" },
  { label: "Renewals", href: "/services/policy-renewals", priority: "core" },
  { label: "About", href: "/about", priority: "support" },
  { label: "Blog", href: "/blog", priority: "support" },
  { label: "Contact", href: "/contact", priority: "support" },
];

export default function PublicHeader() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuTitleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const isActive = (href) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    if (pathname === href) return true;
    if (href === "/services") {
      return (
        pathname.startsWith("/services") &&
        !pathname.startsWith("/services/claims-assistance") &&
        !pathname.startsWith("/services/policy-renewals")
      );
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media (min-width: 1181px) {
            .landing-shell .landing-premium-nav .landing-nav-links {
                margin-left: -90px !important;
            }
        }
        @media (min-width: 901px) and (max-width: 1180px) {
            .landing-shell .landing-premium-nav .landing-nav-links {
                margin-left: -50px !important;
            }
        }
        @keyframes floatingPulse {
            0%, 100% {
                box-shadow: 0 12px 28px rgba(3, 22, 56, 0.28), 0 0 0 0 rgba(28, 108, 57, 0.4);
            }
            50% {
                box-shadow: 0 16px 36px rgba(3, 22, 56, 0.35), 0 0 0 10px rgba(28, 108, 57, 0);
            }
        }
        @keyframes floatShimmer {
            0% { transform: translateX(-150%) skewX(-20deg); }
            100% { transform: translateX(250%) skewX(-20deg); }
        }
        .landing-floating-consultation {
            position: fixed !important;
            bottom: 24px !important;
            right: 24px !important;
            left: auto !important;
            z-index: 90 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 12px 24px !important;
            border-radius: 999px !important;
            background: linear-gradient(135deg, #031638 0%, #102b5f 55%, #1c6c39 100%) !important;
            color: #ffffff !important;
            font-size: 14px !important;
            font-weight: 900 !important;
            text-decoration: none !important;
            border: 1px solid rgba(255, 255, 255, 0.18) !important;
            overflow: hidden !important;
            animation: floatingPulse 3.5s ease-in-out infinite !important;
            transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 260ms ease !important;
        }
        .landing-floating-consultation::before {
            content: "" !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 50% !important;
            height: 100% !important;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent) !important;
            transform: translateX(-150%) skewX(-20deg) !important;
            pointer-events: none !important;
            animation: floatShimmer 4s ease-in-out infinite !important;
        }
        .landing-floating-consultation:hover {
            transform: translateY(-4px) scale(1.04) !important;
            box-shadow: 0 20px 42px rgba(3, 22, 56, 0.42), 0 0 20px rgba(28, 108, 57, 0.3) !important;
        }
        .landing-floating-consultation .material-symbols-outlined {
            font-size: 20px !important;
            transition: transform 260ms ease !important;
        }
        .landing-floating-consultation:hover .material-symbols-outlined {
            transform: rotate(-12deg) scale(1.15) !important;
        }
        @media (max-width: 640px) {
            .landing-floating-consultation {
                bottom: 16px !important;
                right: 16px !important;
                left: auto !important;
                padding: 10px 18px !important;
                font-size: 13px !important;
            }
        }
        @media (max-width: 360px) {
            .landing-floating-consultation {
                bottom: 12px !important;
                right: 12px !important;
                padding: 8px 14px !important;
                font-size: 12px !important;
            }
        }
      `,
        }}
      />
      <nav
        className="landing-premium-nav"
        id="mainNav"
        aria-label="Primary navigation"
      >
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <BrandLogo href="/" />
          </div>

          <div className="landing-nav-links" aria-label="Main menu">
            {navItems.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                className={`landing-nav-link landing-nav-priority-${item.priority} ${
                  isActive(item.href) ? "active" : ""
                }`}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="landing-nav-actions" aria-label="Primary actions">
            <a className="landing-nav-phone" href={`tel:${BUSINESS_DETAILS.phoneHref}`} aria-label={`Call ${BUSINESS_DETAILS.phone}`}>
              <span className="material-symbols-outlined" aria-hidden="true">
                call
              </span>
              <span className="landing-nav-phone-label">{BUSINESS_DETAILS.phone}</span>
            </a>

            <Link href="/login" className="landing-nav-cta">
              Login
            </Link>

            <button
              type="button"
              className="landing-mobile-menu-toggle"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      <div className="landing-nav-spacer" aria-hidden="true" />

      <Breadcrumbs />

      <button
        type="button"
        className={`landing-mobile-menu-backdrop ${mobileMenuOpen ? "open" : ""}`}
        aria-label="Close navigation menu"
        tabIndex={mobileMenuOpen ? 0 : -1}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mount after hydration so browser extensions cannot alter the SSR drawer. */}
      {mounted && <aside
        id="landing-mobile-menu"
        className={`landing-mobile-menu ${mobileMenuOpen ? "open" : ""}`}
        aria-hidden={!mobileMenuOpen}
        aria-labelledby={menuTitleId}
        role="dialog"
        aria-modal="true"
        inert={!mobileMenuOpen ? true : undefined}
      >
        <div className="landing-mobile-menu-head">
          <div>
            <span id={menuTitleId}>Navigation</span>
            <p>Insurance guidance, claims support, and policy renewals.</p>
          </div>
          <button type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)}>
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="landing-mobile-menu-links">
          {navItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={isActive(item.href) ? "active" : ""}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <span>{item.label}</span>
              <span className="material-symbols-outlined" aria-hidden="true">
                chevron_right
              </span>
            </Link>
          ))}
        </div>

        <div className="landing-mobile-menu-actions">
          <a href={`tel:${BUSINESS_DETAILS.phoneHref}`} className="landing-mobile-menu-call">
            <span className="material-symbols-outlined" aria-hidden="true">
              call
            </span>
            Call {BUSINESS_DETAILS.phone}
          </a>
          <Link href="/login" className="landing-mobile-menu-cta">
            Login
          </Link>
        </div>
      </aside>}

      <Link
        href="/contact"
        className={`landing-floating-consultation ${mobileMenuOpen ? "drawer-open" : ""}`}
        aria-label="Get Consultation"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          support_agent
        </span>
        <span>Get Consultation</span>
      </Link>
    </>
  );
}
