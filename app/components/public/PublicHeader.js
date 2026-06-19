"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/app/components/brand/BrandLogo";

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Handle scroll events for navbar shadow
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const getLinkClass = (path) => {
    const isActive = pathname === path || (path !== "/" && pathname.startsWith(path));
    const baseClass = "font-body-md text-body-md transition-colors entry-anim p-0 text-[16px] font-medium";
    return isActive
      ? `${baseClass} text-secondary border-b-2 border-secondary font-semibold pb-1`
      : `${baseClass} text-on-surface-variant hover:text-primary`;
  };

  return (
    <>
      <nav
        className={`bg-surface-container-lowest/0 backdrop-blur-0 sticky top-0 z-50 border-b border-transparent transition-all duration-300 h-20 flex items-center ${
          scrolled ? "scrolled" : ""
        }`}
        id="mainNav"
      >
        <div className="landing-nav-inner max-w-container-max w-full mx-auto px-margin-mobile md:px-margin-desktop flex justify-between items-center h-full">
          {/* Brand Logo */}
          <div className="landing-brand entry-anim" style={{ animationDelay: "0.1s" }}>
            <BrandLogo href="/" />
          </div>

          {/* Desktop Nav Links */}
          <div className="landing-nav-links hidden md:flex gap-6">
            <Link href="/" className={getLinkClass("/")} style={{ animationDelay: "0.2s" }}>
              Home
            </Link>
            <Link href="/services" className={getLinkClass("/services")} style={{ animationDelay: "0.3s" }}>
              Services
            </Link>
            <Link
              href="/services/claims-assistance"
              className={getLinkClass("/services/claims-assistance")}
              style={{ animationDelay: "0.4s" }}
            >
              Claims
            </Link>
            <Link
              href="/services/policy-renewals"
              className={getLinkClass("/services/policy-renewals")}
              style={{ animationDelay: "0.45s" }}
            >
              Renewals
            </Link>
            <Link href="/about" className={getLinkClass("/about")} style={{ animationDelay: "0.5s" }}>
              About
            </Link>
            <Link href="/blog" className={getLinkClass("/blog")} style={{ animationDelay: "0.52s" }}>
              Blog
            </Link>
            <Link href="/contact" className={getLinkClass("/contact")} style={{ animationDelay: "0.55s" }}>
              Contact
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="landing-nav-actions flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-4 mr-4">
              <Link
                href="/contact"
                className="p-2 rounded-full hover:bg-surface-container-low transition-all entry-anim text-primary flex items-center justify-center"
                style={{ animationDelay: "0.6s" }}
              >
                <span className="material-symbols-outlined text-primary">call</span>
              </Link>
            </div>

            <Link
              href="/services"
              className="font-label-md text-label-md px-6 py-3 rounded-lg bg-primary text-on-primary hover:shadow-lg active:scale-95 transition-all entry-anim flex items-center justify-center text-[14px] font-bold"
              style={{ animationDelay: "0.7s" }}
            >
              Explore Services
            </Link>
          </div>

          <button
            type="button"
            className="landing-mobile-menu-toggle md:hidden"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </nav>

      <div
        className={`landing-mobile-menu-backdrop md:hidden ${mobileMenuOpen ? "open" : ""}`}
        aria-hidden="true"
        onClick={() => setMobileMenuOpen(false)}
      />
      <div
        id="landing-mobile-menu"
        className={`landing-mobile-menu md:hidden ${mobileMenuOpen ? "open" : ""}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="landing-mobile-menu-head">
          <span>Menu</span>
          <button type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="landing-mobile-menu-links">
          <Link href="/">Home</Link>
          <Link href="/services">Services</Link>
          <Link href="/services/claims-assistance">Claims Assistance</Link>
          <Link href="/services/policy-renewals">Policy Renewals</Link>
          <Link href="/about">About Us</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact Us</Link>
        </div>
        <Link href="/services" className="landing-mobile-menu-cta">
          Explore Services
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </div>
    </>
  );
}
