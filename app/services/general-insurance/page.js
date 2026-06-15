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
      "@id": `${SITE_URL}/services/general-insurance#webpage`,
      "url": `${SITE_URL}/services/general-insurance`,
      "name": "General Insurance Consulting in Bhopal | BimaHeadquarter",
      "isPartOf": {
        "@id": `${SITE_URL}/#website`
      }
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services/general-insurance#service`,
      "name": "General Insurance Consulting",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "legalName": BUSINESS_DETAILS.legalName,
        "url": SITE_URL
      },
      "description": "Secure your personal and business assets in Bhopal with General Insurance consulting by BimaHeadquarter (Insuredesk IMF Private Ltd).",
      "areaServed": {
        "@type": "State",
        "name": BUSINESS_DETAILS.address.addressRegion
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/services/general-insurance#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is covered under General Insurance?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "General insurance covers non-life assets including your home, personal belongings, vehicles, commercial property, factory equipment, marine cargo, and professional liabilities against accidental losses, fires, thefts, and natural calamities."
          }
        },
        {
          "@type": "Question",
          "name": "How does BimaHeadquarter help in choosing general insurance?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "As licensed advisors under Insuredesk IMF Private Ltd, we conduct complete risk assessments, audit policy terms, identify exclusions, and match your requirements with the most suitable policy packages from over 10 insurer partners."
          }
        },
        {
          "@type": "Question",
          "name": "What are the common exclusions in a general policy?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Common exclusions include losses due to wear and tear, war risk, nuclear hazards, intentional damage, and losses incurred during periods where the policy has lapsed. Exclusions vary, which is why we inspect policy documentation for transparency."
          }
        },
        {
          "@type": "Question",
          "name": "How is the sum insured determined for property or stock?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The sum insured is typically determined using either the Reinstatement Value (cost of replacing the asset with a new one of same specification) or Market Value (which accounts for depreciation). We help calculate this accurately to avoid under-insurance."
          }
        },
        {
          "@type": "Question",
          "name": "Can I transfer my general insurance from one insurer to another?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, general insurance policies can be transferred to a different insurer at the time of renewal. We coordinate the transition, ensure continuous coverage, and carry forward any eligible discounts or ratings."
          }
        }
      ]
    }
  ]
};

export default function GeneralInsurancePage() {
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
      <Script id="general-insurance-schema" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
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
                <span className="material-symbols-outlined text-[32px]">shield</span>
              </span>
              <h1 className="font-display-lg text-[40px] text-primary font-bold leading-tight">
                General Insurance Consulting
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-3xl text-[18px]">
                Protecting your valuable physical assets and business operations in Bhopal with expert, unbiased risk advisory and coverage alignment.
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
                  Overview of General Insurance
                </h2>
                <div className="space-y-4 text-on-surface-variant text-[16px] leading-relaxed">
                  <p>
                    General insurance covers all policies protecting assets other than human life. It forms the foundation of modern risk management, guarding houses, corporate establishments, storage facilities, and personal items against loss from fires, earthquakes, floods, vandalism, and theft.
                  </p>
                  <p>
                    At BimaHeadquarter, we believe that purchasing a policy is only half the battle. Our consulting approach ensures that you avoid common pitfalls like under-insurance, hidden deductibles, and complex policy terms. By auditing your assets and comparing options, we ensure complete protection.
                  </p>
                </div>
              </section>

              {/* Who Needs This */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Who Needs General Insurance?
                </h2>
                <p className="text-on-surface-variant text-[16px]">
                  General insurance consulting is essential for:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Homeowners & Tenants:</strong> Guarding structure and household content value.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Business & Factory Owners:</strong> Protecting equipment, buildings, and inventories.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Retailers & Shopkeepers:</strong> Covering stock-in-trade against fire and burglary.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Logistics Operators:</strong> Securing transit goods against travel risks.</span>
                  </li>
                </ul>
              </section>

              {/* Key Benefits */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Key Benefits of Consulting With Us
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Unbiased Reviews</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We evaluate options across leading insurers to find policies aligned with your risk needs.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Coverage Engineering</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We optimize policy wordings, eliminating loopholes and ensuring exclusions are clear.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Advocacy in Claims</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We stand with you, assisting in paperwork and surveyor coordination to speed settlements.</p>
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
                    <Link href="/services/health-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">medical_services</span> Health Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/motor-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">directions_car</span> Motor Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/commercial-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">apartment</span> Commercial Insurance
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
                  Have an asset review requirement in Bhopal? Schedule a free initial consultation with our licensed representatives.
                </p>
                <div className="space-y-4">
                  <a href={`tel:${BUSINESS_DETAILS.phone.replace(/\s+/g, "")}`} className="w-full py-3 bg-secondary text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2 hover:bg-secondary/90 transition-colors">
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
              Need Unbiased Asset Valuation Advisory?
            </h2>
            <p className="text-[16px] text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Excluding a critical risk component can cost you heavy. Get a complimentary policy gap assessment check by our Bhopal desk today.
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
