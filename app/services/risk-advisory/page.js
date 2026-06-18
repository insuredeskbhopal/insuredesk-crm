"use client";

import { useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import Breadcrumbs from "@/app/components/public/Breadcrumbs";
import { BUSINESS_DETAILS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const pageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/services/risk-advisory#webpage`,
      "url": `${SITE_URL}/services/risk-advisory`,
      "name": "Corporate Risk Advisory Services Bhopal | BimaHeadquarter",
      "isPartOf": {
        "@id": `${SITE_URL}/#website`
      }
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services/risk-advisory#service`,
      "name": "Risk Advisory Services",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "legalName": BUSINESS_DETAILS.legalName,
        "url": SITE_URL
      },
      "description": "Identify, assess, and mitigate business risks. Corporate risk advisory services in Bhopal by Insuredesk IMF Private Ltd.",
      "areaServed": {
        "@type": "State",
        "name": BUSINESS_DETAILS.address.addressRegion
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/services/risk-advisory#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Corporate Risk Advisory?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Corporate Risk Advisory is a strategic service that identifies, analyzes, and quantifies potential risks (property damage, business interruption, liability exposure, supply chain failures, and regulatory compliance) to which a business is exposed, and designs mitigation and insurance hedging strategies."
          }
        },
        {
          "@type": "Question",
          "name": "How does risk management benefit a company?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Risk management helps a business avoid catastrophic losses, reduces capital volatility, secures loan covenants, protects employees and directors, and ensures regulatory compliance. It also optimizes insurance budgets by ensuring you only pay for risks you cannot absorb."
          }
        },
        {
          "@type": "Question",
          "name": "What is a coverage gap analysis?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Coverage gap analysis involves auditing your existing insurance policies against actual operational exposures. We identify hidden exclusions, policy loopholes, under-insurance risks, and areas where your assets are unprotected, suggesting immediate corrections."
          }
        },
        {
          "@type": "Question",
          "name": "What are the key stages in risk assessment?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The key stages include: 1) Risk Identification (discovering potential hazards), 2) Risk Assessment & Analysis (evaluating probability and impact), 3) Risk Mitigation (implementing physical safety controls), 4) Risk Transfer (designing suitable insurance policies), and 5) Continuous Monitoring."
          }
        },
        {
          "@type": "Question",
          "name": "How does risk engineering affect my insurance premiums?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "By implementing physical risk controls (such as certified fire sprinkler systems, fire doors, storage safety protocols, and CCTV surveillance), you lower the likelihood of claims. Underwriters recognize this lower risk profile and award substantial premium discounts on property and fire policies."
          }
        }
      ]
    }
  ]
};

export default function RiskAdvisoryPage() {
  useEffect(() => {
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
    return () => {
      document.body.classList.remove("landing-page");
      revealObserver.disconnect();
    };
  }, []);

  return (
    <>
      <Script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" strategy="beforeInteractive" />
      <Script id="risk-advisory-schema" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{
        __html: `
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0px 10px 30px rgba(26, 43, 78, 0.05); }
        .reveal { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
        .reveal.active { opacity: 1; transform: translateY(0); }
        .landing-page, .landing-page * { color: inherit !important; }
        .landing-page body, .landing-page .bg-background { background-color: #f8f9ff !important; color: #0b1c30 !important; }
      `}} />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />
        <Breadcrumbs />

        {/* Hero Section */}
        <header className="relative pt-12 pb-16 bg-gradient-to-b from-surface-container/30 to-background">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="flex flex-col items-start gap-4">
              <span className="w-14 h-14 rounded-xl bg-secondary-container text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px]">analytics</span>
              </span>
              <h1 className="font-display-lg text-[40px] text-primary font-bold leading-tight">
                Corporate Risk Advisory Services
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-3xl text-[18px]">
                Providing businesses in Bhopal and Madhya Pradesh with coverage gap auditing, asset evaluation assessments, and structured risk mitigation plans.
              </p>
            </div>
          </div>
        </header>

        {/* Main Grid Content */}
        <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            
            {/* Left Column - Details */}
            <div className="lg:col-span-8 space-y-12 reveal">
              
              {/* Overview */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Overview of Corporate Risk Advisory
                </h2>
                <div className="space-y-4 text-on-surface-variant text-[16px] leading-relaxed">
                  <p>
                    Corporate risk advisory is the practice of systematically identifying, quantifying, and mitigating operational and physical hazards within a business. Modern commercial environments face multifaceted risks, including fire perils on warehouse stock, cyber liabilities on client data, machinery breakdown on production lines, and complex employee claims.
                  </p>
                  <p>
                    At BimaHeadquarter, our risk advisory desk (licensed under {BUSINESS_DETAILS.legalName}) does not start with an insurance quote. We start by auditing your actual exposures. By analyzing your physical safety layouts, checking contract clauses, and engineering policy structures, we help you contain exposures and optimize premiums.
                  </p>
                </div>
              </section>

              {/* Who Needs This */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Who Needs Risk Advisory?
                </h2>
                <p className="text-on-surface-variant text-[16px]">
                  Structured risk advisory is highly beneficial for:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Industrial Units &amp; Factories:</strong> Fire load calculations and safety audits.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Warehouse Developers:</strong> Asset valuations and logistics transit risk profiling.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Technology Firms:</strong> Auditing cyber data liabilities and business continuity.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Large Retail Chains:</strong> Public liability reviews and asset stock assessments.</span>
                  </li>
                </ul>
              </section>

              {/* Key Benefits */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Key Benefits of Risk Advisory
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Coverage Auditing</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We audit existing policies, identifying hidden exclusions and ensuring no overlaps or gaps remain.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Risk Control Integration</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We suggest physical safety upgrades, which helps secure high premium discounts from insurers.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Tailored Asset Valuation</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We calculate correct asset reinstatement costs, ensuring clean claim payouts during losses.</p>
                  </div>
                </div>
              </section>

              {/* FAQs */}
              <section className="space-y-6">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {pageSchema["@graph"][2].mainEntity.map((faq, idx) => (
                    <details key={idx} className="group border border-outline-variant/20 rounded-xl p-4 bg-white/50 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex justify-between items-center font-bold text-primary text-[15px] cursor-pointer focus:outline-none">
                        <span>{faq.name}</span>
                        <span className="material-symbols-outlined group-open:rotate-180 transition-transform text-secondary">expand_more</span>
                      </summary>
                      <p className="mt-3 text-sm text-on-surface-variant leading-relaxed border-t border-outline-variant/10 pt-3">
                        {faq.acceptedAnswer.text}
                      </p>
                    </details>
                  ))}
                </div>
              </section>

            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-4 space-y-6 reveal">
              
              {/* Related Services */}
              <div className="glass-card p-6 rounded-2xl border border-outline-variant/20">
                <h3 className="font-bold text-[18px] text-primary mb-4">Related Services</h3>
                <ul className="space-y-3 text-sm text-on-surface-variant font-medium">
                  <li>
                    <Link href="/services/general-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">shield</span> General Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/commercial-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">apartment</span> Commercial Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/policy-renewals" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">sync</span> Policy Renewals
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/claims-assistance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">gavel</span> Claims Assistance
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Sidebar Contact Card */}
              <div className="glass-card p-6 rounded-2xl border border-outline-variant/20 bg-primary/5">
                <h3 className="font-bold text-[18px] text-primary mb-3">Speak to an Advisor</h3>
                <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                  Ready to audit your commercial exposures? Schedule a detailed consultation session with our Bhopal risk engineering team.
                </p>
                <div className="space-y-4">
                  <a href={`tel:${BUSINESS_DETAILS.phoneHref}`} className="w-full py-3 bg-secondary text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2 hover:bg-secondary/90 transition-colors">
                    <span className="material-symbols-outlined">call</span> Call: {BUSINESS_DETAILS.phone}
                  </a>
                  <Link href="/contact" className="w-full py-3 bg-primary text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2 hover:bg-primary/95 transition-colors">
                    <span className="material-symbols-outlined">description</span> Get Consultation
                  </Link>
                </div>
              </div>

              {/* Trust Badge Widget */}
              <div className="glass-card p-6 rounded-2xl border border-outline-variant/20 text-center">
                <p className="text-xs text-on-surface-variant font-medium">BIMAHEADQUARTER is a brand of</p>
                <p className="font-bold text-sm text-primary mt-1">{BUSINESS_DETAILS.legalName}</p>
                <p className="text-[11px] text-on-surface-variant/70 mt-1">
                  IRDAI Registered Insurance Marketing Firm. Serving Bhopal &amp; Madhya Pradesh.
                </p>
              </div>

            </div>

          </div>
        </main>

        {/* Bottom CTA Block */}
        <section className="py-16 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-12">
          <div className="bg-primary rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 -z-10 opacity-10">
              <div className="absolute top-0 left-0 w-48 h-48 bg-secondary rounded-full blur-[80px]"></div>
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-secondary rounded-full blur-[80px]"></div>
            </div>
            <h2 className="font-display-lg text-[32px] font-bold text-white mb-4">
              Audit and Control Your Business Risks Today
            </h2>
            <p className="text-[16px] text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Don't leave your operations exposed to unpredictable events. Partner with BimaHeadquarter for professional risk mapping and alignment.
            </p>
            <Link href="/contact" className="px-8 py-4 bg-secondary text-white rounded-xl font-bold hover:shadow-lg transition-all text-[14px]">
              Request Complimentry Audit
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
