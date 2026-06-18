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
      "@id": `${SITE_URL}/services/claims-assistance#webpage`,
      "url": `${SITE_URL}/services/claims-assistance`,
      "name": "Insurance Claims Assistance Bhopal | BimaHeadquarter",
      "isPartOf": {
        "@id": `${SITE_URL}/#website`
      }
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services/claims-assistance#service`,
      "name": "Claims Assistance Support",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "legalName": BUSINESS_DETAILS.legalName,
        "url": SITE_URL
      },
      "description": "Facing issues with claim settlements? Get expert representation, documentation support, and claims advocacy in Bhopal.",
      "areaServed": {
        "@type": "State",
        "name": BUSINESS_DETAILS.address.addressRegion
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/services/claims-assistance#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Can BimaHeadquarter help with a claim for a policy bought elsewhere?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, our Claim Assistance service is available for policyholders even when the policy was not originally purchased through BimaHeadquarter. We act as independent advocates, assisting with documentation, insurer correspondence, and representing your case. Professional consultation fees may apply for third-party advocacy."
          }
        },
        {
          "@type": "Question",
          "name": "What should I do immediately after a loss or accident to secure my claim?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "First, take safety precautions. Then, capture clear photographs and videos of the damage or scene. Avoid moving assets or repairing vehicle parts before the surveyor's inspection. Notify your insurer immediately and register the claim. Compile basic records like invoice copies, bills, or police FIRs if applicable."
          }
        },
        {
          "@type": "Question",
          "name": "Why do insurance companies reject claims?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Claims are commonly rejected due to non-disclosure of pre-existing conditions, policies being inactive or lapsed, misrepresentation of facts, delays in notifying the insurer, or if the loss falls under standard policy exclusions. We audit your rejection letter to find if there are valid grounds for representation."
          }
        },
        {
          "@type": "Question",
          "name": "What is the role of an insurance surveyor in commercial claims?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A surveyor is an independent licensed professional appointed by the insurance company to assess the cause and extent of the loss. Their report serves as the basis for the insurer's claim settlement decision. We help coordinate with surveyors, ensuring all facts and damages are accurately documented."
          }
        },
        {
          "@type": "Question",
          "name": "How long does it typically take to settle an insurance claim?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Retail claims like motor accidents or cashless health hospitalizations are typically resolved in 3 to 7 working days. Major commercial losses (fire, marine cargo, warehouse claims) require detailed surveys, and the settlement process can take anywhere from 30 days to a few months, depending on documentation complexity."
          }
        }
      ]
    }
  ]
};

export default function ClaimsAssistancePage() {
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
      <Script id="claims-assistance-schema" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
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
                <span className="material-symbols-outlined text-[32px]">gavel</span>
              </span>
              <h1 className="font-display-lg text-[40px] text-primary font-bold leading-tight">
                Insurance Claims Assistance &amp; Advocacy
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-3xl text-[18px]">
                Providing independent corporate representation, paperwork auditing, and dispute reviews in Bhopal to ensure fair claim payouts.
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
                  Overview of Claims Assistance
                </h2>
                <div className="space-y-4 text-on-surface-variant text-[16px] leading-relaxed">
                  <p>
                    The real test of an insurance policy occurs when you file a claim. However, navigating insurer frameworks, surveyor document requirements, and policy exclusions is highly complex. Many legitimate claims face long delays or outright rejections due to minor paperwork gaps or miscommunication.
                  </p>
                  <p>
                    BimaHeadquarter acts as your dedicated claim advocate. Backed by the licensed structure of {BUSINESS_DETAILS.legalName}, we assist you from day one of a loss event. We help draft surveyors' dossiers, collect appropriate proof of damage, audit claim rejection notices, and represent your case for a fair settlement.
                  </p>
                </div>
              </section>

              {/* Who Needs This */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Who Needs Claims Assistance?
                </h2>
                <p className="text-on-surface-variant text-[16px]">
                  Professional claim support is essential for:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Policyholders with Rejected Claims:</strong> Requesting official reviews of insurer decisions.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Business Proprietors:</strong> Coordinating large fire, machinery, or stock loss claims.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Families During Hospitalization:</strong> Navigating health insurance pre-auth paperwork.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Vehicular Accident Victims:</strong> Aligning surveyors and cashless garage approvals.</span>
                  </li>
                </ul>
              </section>

              {/* Key Benefits */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Key Benefits of Claim Advocacy
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Paperwork Verification</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We double-check your claims dossiers to ensure compliance before submission to the insurer.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Independent Advocacy</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We represent you, preventing insurers from applying unfair depreciation or deductions.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Rejection Appeals</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We analyze rejected claims, drafting formal appeals using regulatory precedents.</p>
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
                  Has your claim been delayed, short-settled, or rejected? Let our Bhopal experts audit your case papers today.
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
              Struggling with a Rejected or Delayed Claim?
            </h2>
            <p className="text-[16px] text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Don't accept unfair settlements. Let our certified claims advocacy team evaluate your policy documents and represent your interests.
            </p>
            <Link href="/contact" className="px-8 py-4 bg-secondary text-white rounded-xl font-bold hover:shadow-lg transition-all text-[14px]">
              Request Claim Paper Audit
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
