"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/app/components/brand/BrandLogo";
import Breadcrumbs from "@/app/components/public/Breadcrumbs";
import AppDownloadModal from "@/app/components/public/AppDownloadModal";
import { BUSINESS_DETAILS } from "@/lib/seo/site";
import { Smartphone } from "lucide-react";

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
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
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
        @keyframes navEntrance {
            0% {
                opacity: 0;
                transform: translateY(-12px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .landing-shell .landing-premium-nav {
            animation: navEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .landing-nav-link {
            transition: color 180ms ease, transform 180ms cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .landing-nav-link:hover {
            transform: translateY(-1.5px) !important;
        }
        .landing-nav-link.active {
            transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .landing-nav-phone,
        .landing-nav-cta {
            transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease !important;
        }
        .landing-nav-phone:hover,
        .landing-nav-cta:hover {
            transform: scale(1.025) !important;
        }
        .landing-nav-phone:active,
        .landing-nav-cta:active {
            transform: scale(0.98) !important;
        }
        @keyframes floatEntrance {
            0% {
                opacity: 0;
                transform: translateY(16px) scale(0.92);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
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
            box-shadow: 0 12px 28px rgba(3, 22, 56, 0.28) !important;
            animation: floatEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both !important;
            transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 260ms ease !important;
        }
        .landing-floating-consultation:hover {
            transform: translateY(-3px) scale(1.03) !important;
            box-shadow: 0 18px 36px rgba(3, 22, 56, 0.35) !important;
        }
        .landing-floating-consultation .material-symbols-outlined {
            font-size: 20px !important;
            transition: transform 260ms ease !important;
        }
        .landing-floating-consultation:hover .material-symbols-outlined {
            transform: scale(1.1) !important;
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
            <button
              type="button"
              onClick={() => setDownloadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#031638] bg-blue-50/90 border border-blue-200/90 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-2xs"
              aria-label="Download BimaHeadquarter Mobile App"
            >
              <Smartphone className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Download App</span>
              <span className="sm:hidden">App</span>
            </button>

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
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setDownloadModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-50 border border-blue-200 text-[#031638] font-bold text-sm"
          >
            <Smartphone className="h-4 w-4 text-blue-600" />
            Download App &amp; Share
          </button>

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

      <AppDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />
    </>
  );
}
