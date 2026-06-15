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
      "@id": `${SITE_URL}/services/health-insurance#webpage`,
      "url": `${SITE_URL}/services/health-insurance`,
      "name": "Health Insurance Consulting in Bhopal | BimaHeadquarter",
      "isPartOf": {
        "@id": `${SITE_URL}/#website`
      }
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services/health-insurance#service`,
      "name": "Health Insurance Consulting",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "legalName": BUSINESS_DETAILS.legalName,
        "url": SITE_URL
      },
      "description": "Get the best health insurance plans for individuals, families, and corporates in Bhopal with BimaHeadquarter's expert consulting.",
      "areaServed": {
        "@type": "State",
        "name": BUSINESS_DETAILS.address.addressRegion
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/services/health-insurance#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is cashless health insurance, and how does it work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Cashless health insurance allows the policyholder to get medical treatment at network hospitals without paying the bills directly. The insurance company pays the hospital directly, subject to the policy limits. You only need to pay non-medical expenses and co-payments, if applicable."
          }
        },
        {
          "@type": "Question",
          "name": "What is a pre-existing disease (PED) and its waiting period?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A pre-existing disease is any health condition or ailment that the policyholder was diagnosed with before purchasing the policy. Most policies have a waiting period ranging from 1 to 4 years before PEDs are covered, depending on the insurer's terms."
          }
        },
        {
          "@type": "Question",
          "name": "Does health insurance cover maternity expenses?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, many health insurance policies offer maternity coverage as an add-on or built-in feature, though it typically carries a waiting period of 9 months to 4 years. It covers delivery costs, pre-and-post-natal expenses, and sometimes newborn cover."
          }
        },
        {
          "@type": "Question",
          "name": "What is the difference between individual and family floater policies?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "An individual policy covers a single person with an independent sum insured. A family floater policy covers multiple family members under a single sum insured pool, which can be utilized by any member of the family during the policy year, offering a higher pool value at a lower cost."
          }
        },
        {
          "@type": "Question",
          "name": "What is a co-payment clause in health policies?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A co-payment is a predefined percentage of the claim amount (e.g., 10% or 20%) that the policyholder agrees to pay out-of-pocket during hospitalization. The insurer covers the remaining balance. Co-payments are common in senior citizen plans to lower premiums."
          }
        }
      ]
    }
  ]
};

export default function HealthInsurancePage() {
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
      <Script id="health-insurance-schema" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
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
                <span className="material-symbols-outlined text-[32px]">medical_services</span>
              </span>
              <h1 className="font-display-lg text-[40px] text-primary font-bold leading-tight">
                Health Insurance Consulting
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-3xl text-[18px]">
                Providing families and businesses in Bhopal with tailored medical insurance evaluations, network coverage comparisons, and active cashless claim support.
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
                  Overview of Health Insurance Consulting
                </h2>
                <div className="space-y-4 text-on-surface-variant text-[16px] leading-relaxed">
                  <p>
                    Health insurance protects you and your loved ones from severe financial strain during medical emergencies. Medical expenses are rising rapidly, making a structured health policy with suitable network access and cashless treatment features vital.
                  </p>
                  <p>
                    BimaHeadquarter acts as your independent consultant. We evaluate policies across multiple top insurers, checking waiting periods for pre-existing diseases, sub-limits on room rents, and copayment terms. This helps you select a policy that guarantees coverage when you need hospitalization.
                  </p>
                </div>
              </section>

              {/* Who Needs This */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Who Needs Health Insurance Consulting?
                </h2>
                <p className="text-on-surface-variant text-[16px]">
                  Professional health advisory is highly beneficial for:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Growing Families:</strong> Floater policies covering parents and newborn children.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Senior Citizens:</strong> Focused consulting for chronic conditions and cashless networks.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Corporate Entities:</strong> Designing Group Medical Coverages (GMC) for employees.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Self-Employed Individuals:</strong> Custom coverages matching income and tax-saving goals.</span>
                  </li>
                </ul>
              </section>

              {/* Key Benefits */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Key Benefits of Health Consulting
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Hospital Network Audit</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We verify that your preferred local hospitals in Bhopal are in the insurer's active network.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Sub-limit Resolution</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We select policies with no room rent cap, avoiding unexpected out-of-pocket bills during discharge.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Cashless Claim Setup</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We guide you through pre-authorization paperwork, helping secure cashless approvals swiftly.</p>
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
                    <Link href="/services/life-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">family_restroom</span> Life Insurance
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
                  Confused by waiting periods or PED exclusions? Schedule a free analysis session with our Bhopal desk.
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
              Protect Your Family Against Rising Medical Inflation
            </h2>
            <p className="text-[16px] text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Ensure you have the right cashless hospitalization coverage. Talk to our Bhopal medical advisory desk for a comprehensive policy evaluation.
            </p>
            <Link href="/contact" className="px-8 py-4 bg-secondary text-white rounded-xl font-bold hover:shadow-lg transition-all text-[14px]">
              Request Free Health Plan Audit
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
