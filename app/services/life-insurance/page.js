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
      "@id": `${SITE_URL}/services/life-insurance#webpage`,
      "url": `${SITE_URL}/services/life-insurance`,
      "name": "Life Insurance Consulting in Bhopal | BimaHeadquarter",
      "isPartOf": {
        "@id": `${SITE_URL}/#website`
      }
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services/life-insurance#service`,
      "name": "Life Insurance Consulting",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "legalName": BUSINESS_DETAILS.legalName,
        "url": SITE_URL
      },
      "description": "Plan for your family's financial security. Expert life insurance consulting in Bhopal by BimaHeadquarter (Insuredesk IMF Private Ltd).",
      "areaServed": {
        "@type": "State",
        "name": BUSINESS_DETAILS.address.addressRegion
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/services/life-insurance#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Term Life Insurance and how does it differ from Endowment plans?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Term Life Insurance is a pure protection policy that provides a high sum assured to your beneficiaries in the event of your death during the policy term, with no survival benefit. Endowment or traditional plans combine life cover with savings/investment features, paying a maturity benefit if you survive, but offering lower cover amounts for the same premium."
          }
        },
        {
          "@type": "Question",
          "name": "How much life insurance cover (Sum Assured) do I need?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A general rule of thumb is to have a sum assured that is at least 10 to 15 times your annual income. However, a more accurate calculation considers your current liabilities (debts, home loans), future expenses (child's education, marriage), and existing assets. We help calculate this using the Human Life Value (HLV) method."
          }
        },
        {
          "@type": "Question",
          "name": "Does a term policy return premiums if I survive the policy term?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Standard term policies do not return premiums. However, there are Term Return of Premium (TROP) plans that refund all paid premiums (excluding taxes and rider costs) if you survive the policy term. TROP plans typically carry higher premiums."
          }
        },
        {
          "@type": "Question",
          "name": "What are insurance riders and which ones should I consider?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Riders are optional add-ons that enhance your base policy coverage for an additional premium. Important riders to consider include Critical Illness cover, Accidental Death benefit, Waiver of Premium (in case of disability), and Permanent Disability benefit."
          }
        },
        {
          "@type": "Question",
          "name": "What is Keyman Insurance and is it tax-deductible?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Keyman Insurance is a policy purchased by a business on the life of an employee key to the organization's success (e.g., founders, directors). In the event of their demise, the claim payout compensates the company for loss of profits. The premiums paid by the business are generally deductible as business expenses under section 37(1)."
          }
        }
      ]
    }
  ]
};

export default function LifeInsurancePage() {
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
      <Script id="life-insurance-schema" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
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
                <span className="material-symbols-outlined text-[32px]">family_restroom</span>
              </span>
              <h1 className="font-display-lg text-[40px] text-primary font-bold leading-tight">
                Life Insurance Consulting
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-3xl text-[18px]">
                Securing your family's future and corporate continuity in Bhopal with custom Human Life Value (HLV) audits and pure protection planning.
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
                  Overview of Life Insurance Consulting
                </h2>
                <div className="space-y-4 text-on-surface-variant text-[16px] leading-relaxed">
                  <p>
                    Life insurance forms the bedrock of personal financial security. Its core goal is to replace income and settle outstanding liabilities (like home loans or personal debts) in the unfortunate event of the policyholder's demise, ensuring dependents do not suffer financial hardship.
                  </p>
                  <p>
                    At BimaHeadquarter, we steer clients away from low-cover traditional savings policies that yield sub-par returns. We focus on pure term protection plans that offer maximum coverage for highly affordable premiums. By reviewing your assets, debts, and future milestones, we ensure your family remains secure.
                  </p>
                </div>
              </section>

              {/* Who Needs This */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Who Needs Life Insurance Consulting?
                </h2>
                <p className="text-on-surface-variant text-[16px]">
                  Professional life insurance planning is essential for:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Primary Breadwinners:</strong> Guaranteeing income replacement for family dependents.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Home &amp; Business Loan Borrowers:</strong> Ensuring debts are not passed to survivors.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Company Founders &amp; Partners:</strong> Setting up tax-friendly Keyman protection.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Parents Planning Milestones:</strong> Guaranteeing funds for education and weddings.</span>
                  </li>
                </ul>
              </section>

              {/* Key Benefits */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Key Benefits of Life Consulting
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Human Life Value Audit</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We audit your details to calculate the exact sum assured required to protect your dependents.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Term Cover Integration</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We compare premiums across leading carriers, obtaining highly competitive rates.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Corporate Keyman Cover</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We structure business-owned policies under compliant guidelines with tax write-offs.</p>
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
                    <Link href="/services/health-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">medical_services</span> Health Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/commercial-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">apartment</span> Commercial Insurance
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
                  Confused between term plans and ULIPs? Request a calculation breakdown from our Bhopal desk.
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
              Secure Your Dependents' Financial Security
            </h2>
            <p className="text-[16px] text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Don't purchase expensive plans with minimal covers. Get a complimentary Human Life Value evaluation from BimaHeadquarter.
            </p>
            <Link href="/contact" className="px-8 py-4 bg-secondary text-white rounded-xl font-bold hover:shadow-lg transition-all text-[14px]">
              Request Complimentry HLV Audit
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
