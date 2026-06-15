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
      "@id": `${SITE_URL}/services/motor-insurance#webpage`,
      "url": `${SITE_URL}/services/motor-insurance`,
      "name": "Motor Insurance Consulting in Bhopal | BimaHeadquarter",
      "isPartOf": {
        "@id": `${SITE_URL}/#website`
      }
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/services/motor-insurance#service`,
      "name": "Motor Insurance Consulting",
      "provider": {
        "@type": "Organization",
        "name": SITE_NAME,
        "legalName": BUSINESS_DETAILS.legalName,
        "url": SITE_URL
      },
      "description": "Compare and renew car, bike, and commercial vehicle insurance in Bhopal. Get expert claim support at BimaHeadquarter.",
      "areaServed": {
        "@type": "State",
        "name": BUSINESS_DETAILS.address.addressRegion
      }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/services/motor-insurance#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Third-Party vs. Comprehensive motor insurance?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Third-party motor insurance is a statutory requirement covering legal liability for third-party injury, death, and property damage. Comprehensive motor insurance covers third-party liabilities plus 'Own Damage' (damage to your own vehicle due to accidents, fire, theft, or natural disasters)."
          }
        },
        {
          "@type": "Question",
          "name": "What is Zero Depreciation (Zero-Dep) cover and should I get it?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Zero Depreciation is an add-on cover where the insurer does not deduct depreciation on replaced parts (plastic, rubber, metal) during an accident claim. It ensures maximum claim payouts. It is highly recommended for cars and bikes under 5 years old."
          }
        },
        {
          "@type": "Question",
          "name": "How is the Insured Declared Value (IDV) calculated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "IDV is the maximum sum insured for your vehicle, representing its current market value. It is calculated by taking the manufacturer's listed selling price and applying a standard depreciation rate based on the vehicle's age."
          }
        },
        {
          "@type": "Question",
          "name": "What is a No Claim Bonus (NCB) and how do I transfer it?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "NCB is a discount on the Own Damage premium awarded for claim-free years. It ranges from 20% to 50%. NCB belongs to the vehicle owner, not the vehicle. When selling a vehicle or switching insurers, you can obtain an NCB certificate to transfer the discount to a new vehicle."
          }
        },
        {
          "@type": "Question",
          "name": "What is the process to claim motor insurance after an accident?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "First, take photos of the damage and notify the insurer immediately. Drive or tow the vehicle to a network garage. Fill out the claim form and submit documents (RC, driving license, policy copy). An insurer-appointed surveyor will inspect the vehicle, and the garage will complete cashless repairs once approved."
          }
        }
      ]
    }
  ]
};

export default function MotorInsurancePage() {
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
      <Script id="motor-insurance-schema" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
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
                <span className="material-symbols-outlined text-[32px]">directions_car</span>
              </span>
              <h1 className="font-display-lg text-[40px] text-primary font-bold leading-tight">
                Motor &amp; Fleet Insurance Consulting
              </h1>
              <p className="font-body-lg text-on-surface-variant max-w-3xl text-[18px]">
                Compare own damage premiums, optimize zero-depreciation structures, and resolve vehicular claims efficiently across Bhopal.
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
                  Overview of Motor Insurance Consulting
                </h2>
                <div className="space-y-4 text-on-surface-variant text-[16px] leading-relaxed">
                  <p>
                    Motor insurance is legally mandatory in India for all vehicles operating in public spaces. Beyond simple third-party compliance, a structured comprehensive policy is essential to protect your asset from heavy repair costs following accidents, road crashes, vandalism, or monsoon flood damages.
                  </p>
                  <p>
                    At BimaHeadquarter, we evaluate premiums across a network of over 10 leading insurers. We review IDV declarations to ensure your vehicle is not under-valued, check add-on extensions like Engine Protection, Return to Invoice, and Consumables, and guide you through cashless claims when accidents occur.
                  </p>
                </div>
              </section>

              {/* Who Needs This */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Who Needs Motor Insurance Consulting?
                </h2>
                <p className="text-on-surface-variant text-[16px]">
                  Our motor advisory covers:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Individual Car &amp; Bike Owners:</strong> Maximizing NCB discounts and zero-dep covers.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Commercial Vehicle Owners:</strong> Securing trucks, tippers, and loading logistics.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Corporate Fleet Managers:</strong> Consolidating multiple vehicle coverages under single dates.</span>
                  </li>
                  <li className="flex gap-2 items-start text-[15px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-1">check_circle</span>
                    <span><strong>Taxi &amp; Cab Aggregators:</strong> Passenger liability reviews and commercial add-ons.</span>
                  </li>
                </ul>
              </section>

              {/* Key Benefits */}
              <section className="space-y-4">
                <h2 className="font-display-lg text-[26px] text-primary font-bold">
                  Key Benefits of Vehicular Consulting
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Premium Optimization</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We audit quotes to ensure you get correct discounts on Own Damage and appropriate NCB carry-forwards.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Surveyor Coordination</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We assist during claims, coordinating surveyor visits and resolving paperwork bottlenecks.</p>
                  </div>
                  <div className="glass-card p-6 rounded-xl border border-outline-variant/10">
                    <h3 className="font-bold text-[16px] text-primary mb-2">Cashless Garage Network</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">We help locate network garages in Bhopal to ensure cashless repair services without delays.</p>
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
                    <Link href="/services/policy-renewals" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">sync</span> Policy Renewals
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Sidebar Contact Card */}
              <div className="glass-card p-6 rounded-2xl border border-outline-variant/20 bg-primary/5">
                <h3 className="font-bold text-[18px] text-primary mb-3">Speak to an Advisor</h3>
                <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                  Need to compare quotes or facing claim settlement disputes? Talk to our Bhopal motor vehicle desk today.
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
              Never Drive Without Valid Coverage
            </h2>
            <p className="text-[16px] text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Renew your motor policy in minutes or structure zero-depreciation add-ons for complete road peace of mind. Consult with our advisors.
            </p>
            <Link href="/contact" className="px-8 py-4 bg-secondary text-white rounded-xl font-bold hover:shadow-lg transition-all text-[14px]">
              Compare Motor Quotes Now
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
