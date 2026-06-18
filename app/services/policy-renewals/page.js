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
      "@id": `${SITE_URL}/services/policy-renewals#webpage`,
      "url": `${SITE_URL}/services/policy-renewals`,
      "name": "Easy Policy Renewals in Bhopal | BimaHeadquarter",
      "isPartOf": {
        "@id": `${SITE_URL}/#website`
      }
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services/policy-renewals#service`,
      "name": "Policy Renewals Support",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "legalName": BUSINESS_DETAILS.legalName,
        "url": SITE_URL
      },
      "description": "Never let your coverage lapse. Professional assistance for timely policy renewals across all insurance categories in Bhopal.",
      "areaServed": {
        "@type": "State",
        "name": BUSINESS_DETAILS.address.addressRegion
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/services/policy-renewals#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What happens if my insurance policy lapses?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A lapsed policy results in an immediate loss of insurance coverage, exposing you to significant financial risks. In motor insurance, driving with a lapsed policy is illegal and carries fines. In health insurance, a lapse will break your continuity benefits, meaning you will lose accumulated No Claim Bonuses and have to serve waiting periods for pre-existing diseases all over again."
          }
        },
        {
          "@type": "Question",
          "name": "How early can I renew my insurance policy?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For most motor and health insurance policies, you can initiate the renewal process up to 30 to 45 days before the expiry date. Renewing early prevents last-minute stress, ensures continuous coverage, and allows ample time to review and update policy benefits."
          }
        },
        {
          "@type": "Question",
          "name": "Can I change my coverage options or add-ons during renewal?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, policy renewal is the best window to review and modify your coverage. You can increase your sum insured, add or remove riders (such as critical illness or zero-depreciation), or update your personal/corporate details with the insurer."
          }
        },
        {
          "@type": "Question",
          "name": "Is a vehicle inspection required to renew a lapsed motor policy?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If a comprehensive motor policy has lapsed for more than 90 days, or sometimes even immediately after expiry (depending on the insurer), a physical or digital self-inspection of the vehicle is mandatory before coverage can be issued. Third-party policies typically do not require an inspection."
          }
        },
        {
          "@type": "Question",
          "name": "What documents do I need to renew my health or motor policy?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "To renew, you typically only need your previous year's policy copy, vehicle registration certificate (RC) for motor insurance, and the basic KYC documents (PAN card, Aadhaar card). We handle the coordination, so you don't have to fill out extensive forms."
          }
        }
      ]
    }
  ]
};

export default function PolicyRenewalsPage() {
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
      <Script id="policy-renewals-schema" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
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
                <span className="material-symbols-outlined text-[32px]">sync</span>
              </span>
              <h1 className="font-display-lg text-[40px] text-primary font-bold leading-tight">
                Policy Renewals Support
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-3xl text-[18px]">
                Ensuring continuous coverage and zero gaps in protection for your business, vehicle, or family health insurance in Bhopal.
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
                  Overview of Policy Renewals Support
                </h2>
                <div className="space-y-4 text-on-surface-variant text-[16px] leading-relaxed">
                  <p>
                    An insurance policy is a contract with a defined duration, usually one year. If a policy is allowed to lapse, even for a single day, you lose all financial protections. In health policies, this means losing continuity benefits for pre-existing conditions and reset waiting times. In motor insurance, it exposes you to statutory penalties and zero claim support after mishaps.
                  </p>
                  <p>
                    At BimaHeadquarter, we proactively track renewals for our clients. Our dedicated support team in Bhopal alerts you well in advance, reviews changes in your risk exposures over the past year, structures appropriate sums insured, and facilitates immediate, hassle-free renewal processing.
                  </p>
                </div>
              </section>

              {/* Who Needs This */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Who Needs Renewal Assistance?
                </h2>
                <p className="text-on-surface-variant text-[16px]">
                  Timely renewal checks are vital for:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Busy Professionals:</strong> Keeping track of family health and car insurance expiry.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Commercial Fleet Operators:</strong> Aligning multi-vehicle renewal cycles.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Corporate Facility Managers:</strong> Renewing office building, machinery, and fire covers.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Lapsed Policyholders:</strong> Restructuring protection and carrying out inspection surveys.</span>
                  </li>
                </ul>
              </section>

              {/* Key Benefits */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Key Benefits of Timely Renewals
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Continuity Benefits</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">Ensure pre-existing health waiting periods and accrued No Claim Bonuses are preserved.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Proactive Expiry Tracking</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">Our automated CRM database alerts you via WhatsApp and call before your policies expire.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Seamless Portability</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We assist you in porting your active policy to a superior insurer during the renewal window.</p>
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
                    <Link href="/services/claims-assistance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">gavel</span> Claims Assistance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/risk-advisory" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">analytics</span> Risk Advisory
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Sidebar Contact Card */}
              <div className="glass-card p-6 rounded-2xl border border-outline-variant/20 bg-primary/5">
                <h3 className="font-bold text-[18px] text-primary mb-3">Speak to an Advisor</h3>
                <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                  Has your policy already expired? Let us help you carry out inspections and restore coverage quickly in Bhopal.
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
              Don't Wait Until Your Policy Expires
            </h2>
            <p className="text-[16px] text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Renewing your policies on time guarantees that you retain all tax deductions, No Claim Bonuses, and continuity protections. Reach out today.
            </p>
            <Link href="/contact" className="px-8 py-4 bg-secondary text-white rounded-xl font-bold hover:shadow-lg transition-all text-[14px]">
              Initiate Renewal Request
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
