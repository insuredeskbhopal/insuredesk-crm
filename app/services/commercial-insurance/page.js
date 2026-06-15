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
      "@id": `${SITE_URL}/services/commercial-insurance#webpage`,
      "url": `${SITE_URL}/services/commercial-insurance`,
      "name": "Commercial & Business Insurance Bhopal | BimaHeadquarter",
      "isPartOf": {
        "@id": `${SITE_URL}/#website`
      }
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services/commercial-insurance#service`,
      "name": "Commercial Insurance Consulting",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "legalName": BUSINESS_DETAILS.legalName,
        "url": SITE_URL
      },
      "description": "Protect your corporate assets, stocks, and liabilities in Bhopal. Professional commercial insurance advisory by BimaHeadquarter.",
      "areaServed": {
        "@type": "State",
        "name": BUSINESS_DETAILS.address.addressRegion
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/services/commercial-insurance#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Commercial Insurance and why does my business need it?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Commercial insurance protects corporate entities from financial losses arising from property damage, machinery breakdowns, employee injuries, legal liabilities, cyber threats, and cargo transits. It shields the company's capital and ensures long-term operational continuity."
          }
        },
        {
          "@type": "Question",
          "name": "What is Fire & Allied Perils insurance?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Fire & Allied Perils insurance covers damage to structures, plant, machinery, and stock-in-trade caused by fire, lightning, explosions, implosions, riots, strikes, storms, floods, landslides, and impact damage from vehicles or aircraft."
          }
        },
        {
          "@type": "Question",
          "name": "Does commercial insurance cover business interruption?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, Business Interruption (or Loss of Profit) insurance covers the loss of net profit and standing charges (salaries, rents) when business operations are suspended following property damage caused by an insured peril (like fire or flood)."
          }
        },
        {
          "@type": "Question",
          "name": "What is Directors & Officers (D&O) Liability insurance?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "D&O liability insurance covers legal defense costs and indemnity payouts if directors or officers are sued by shareholders, regulatory bodies, or competitors for alleged 'wrongful acts' (decisions leading to financial losses, breach of trust, or mismanagement)."
          }
        },
        {
          "@type": "Question",
          "name": "How does Marine Cargo insurance protect goods?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Marine cargo insurance covers losses or physical damage to goods during transit via road, rail, air, or sea, both domestically and internationally. It can be structured as an Open Policy (annual coverage for all transits) or a Specific Voyage policy."
          }
        }
      ]
    }
  ]
};

export default function CommercialInsurancePage() {
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
      <Script id="commercial-insurance-schema" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
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
                <span className="material-symbols-outlined text-[32px]">apartment</span>
              </span>
              <h1 className="font-display-lg text-[40px] text-primary font-bold leading-tight">
                Commercial &amp; Business Insurance Consulting
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-3xl text-[18px]">
                Protecting business infrastructure, inventories, liabilities, and logistics in Bhopal with institutional risk engineering and tailored coverages.
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
                  Overview of Commercial Insurance
                </h2>
                <div className="space-y-4 text-on-surface-variant text-[16px] leading-relaxed">
                  <p>
                    Commercial insurance is designed to protect companies from the financial consequences of operational disruptions and external hazards. It spans multiple disciplines, including property fire insurance, marine cargo transit covers, machinery breakdown, employee workers' compensation, and professional liability.
                  </p>
                  <p>
                    BimaHeadquarter assists companies in Madhya Pradesh by conducting thorough audits of business premises, stock values, and operational processes. We structure multi-risk policies that ensure you are fully protected in the event of industrial fire damage, liability suits, or supply-chain interruptions.
                  </p>
                </div>
              </section>

              {/* Who Needs This */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Who Needs Commercial Insurance Consulting?
                </h2>
                <p className="text-on-surface-variant text-[16px]">
                  Our business consulting is tailored for:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Manufacturing Plants &amp; Factories:</strong> Covering machinery breakdown and structures.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Warehouse &amp; Cold Storage Operators:</strong> Safeguarding stocked goods and transit cargo.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Corporate Enterprises:</strong> Managing liability, cyber risks, and employee GMC policies.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>SMEs &amp; Showrooms:</strong> Covering properties against burglary, fire, and public liability.</span>
                  </li>
                </ul>
              </section>

              {/* Key Benefits */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Key Benefits of Commercial Advisory
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Liability Structure</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We optimize coverages like D&amp;O and Public Liability, guarding key executives and corporate liquidity.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Asset Value Audits</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We review sum insured values on stock and structures, preventing under-insurance penalty claims.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Operational Continuity</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We integrate Loss of Profits coverages to keep salaries and overheads paid during repair closures.</p>
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
                    <Link href="/services/motor-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">directions_car</span> Motor Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/risk-advisory" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">analytics</span> Risk Advisory
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
                  Need a full risk profiling or asset audit for your Bhopal firm? Reach out to our business desk.
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
              Shield Your Commercial Interests Effectively
            </h2>
            <p className="text-[16px] text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Inadequate business insurance can break an organization overnight. Secure a comprehensive coverage check by our expert risk engineers today.
            </p>
            <Link href="/contact" className="px-8 py-4 bg-secondary text-white rounded-xl font-bold hover:shadow-lg transition-all text-[14px]">
              Request Corporate Risk Audit
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
