import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import LandingEffects from "@/app/components/LandingEffects";
import PublicFooter from "@/app/components/public/PublicFooter";
import { BUSINESS_DETAILS, LEADERSHIP, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/about#webpage`,
      url: `${SITE_URL}/about`,
      name: `About Us | ${SITE_NAME}`,
      headline: `About BIMAHEADQUARTER`,
      description: `Learn about BIMAHEADQUARTER, an insurance and claim consulting brand by InsureDesk IMF Pvt Ltd serving individuals and businesses in India.`,
      isPartOf: {
        "@id": `${SITE_URL}/#website`,
      },
      about: {
        "@id": `${SITE_URL}/#organization`,
      },
      inLanguage: "en-IN",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: "Bima Headquarter",
      legalName: BUSINESS_DETAILS.legalName,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/main-logo-wide.webp`,
      email: BUSINESS_DETAILS.email,
      telephone: BUSINESS_DETAILS.phoneHref,
      description: SITE_DESCRIPTION,
      areaServed: BUSINESS_DETAILS.serviceArea,
    },
  ],
};

export default function AboutPage() {
  return (
    <>
      <LandingEffects />
      <Script
        id="about-structured-data"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0px 10px 30px rgba(26, 43, 78, 0.05);
            position: relative;
            overflow: hidden;
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .glass-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.4) 0%, transparent 50%);
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }

        .glass-card:hover::before {
            opacity: 1;
        }

        .glass-card:hover {
            transform: translateY(-4px);
            box-shadow: 0px 20px 40px rgba(26, 43, 78, 0.1);
        }

        .reveal {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .reveal.active {
            opacity: 1;
            transform: translateY(0);
        }

        .entry-anim {
            opacity: 0;
            transform: translateY(20px);
            animation: entry 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes entry {
            to { opacity: 1; transform: translateY(0); }
        }

        nav#mainNav.scrolled {
            height: 72px !important;
            background: linear-gradient(90deg, #F8FAFC 0%, #EEF4FF 50%, #F8FAFC 100%) !important;
            box-shadow: none !important;
            border: none !important;
        }

        .landing-page,
        .landing-page * {
            color: inherit !important;
        }

        .landing-page svg,
        .landing-page [class*="icon"],
        .landing-page [class^="icon"],
        .landing-page .icon {
            color: inherit !important;
        }

        .landing-page button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            transition: all 0.2s !important;
            box-shadow: none !important;
            animation: none !important;
            transform: none !important;
            border-radius: 0.75rem !important;
            font-weight: 600 !important;
        }

        .landing-page button.bg-primary {
            background-color: #031638 !important;
            color: #ffffff !important;
        }
        .landing-page button.bg-primary:hover {
            background-color: #0d2554 !important;
            color: #ffffff !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 10px 15px -3px rgba(3, 22, 56, 0.3) !important;
        }

        .landing-page button.bg-secondary {
            background-color: #1c6c39 !important;
            color: #ffffff !important;
        }
        .landing-page button.bg-secondary:hover {
            background-color: #16552d !important;
            color: #ffffff !important;
        }

        .landing-page button.bg-white {
            background-color: #ffffff !important;
            color: #031638 !important;
        }
        .landing-page button.bg-white:hover {
            background-color: #f1f5f9 !important;
            color: #031638 !important;
            transform: scale(1.05) !important;
        }

        .landing-page button.bg-transparent,
        .landing-page button.p-2 {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: inherit !important;
        }
        .landing-page button.p-2:hover {
            background-color: rgba(229, 238, 255, 0.5) !important;
        }

        .landing-page body,
        .landing-page .bg-background {
            background-color: #f8f9ff !important;
            color: #0b1c30 !important;
        }

        .landing-page h1,
        .landing-page h2,
        .landing-page h3,
        .landing-page h4,
        .landing-page h5 {
            color: #031638 !important;
        }

        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(1deg); }
        }

        .leadership-section {
            padding-top: 88px;
            padding-bottom: 88px;
            background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
        }

        .leadership-card {
            display: grid !important;
            grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
            align-items: center;
            gap: 48px;
            padding: 38px;
            border-radius: 22px;
            background: #ffffff;
            border: 0;
            box-shadow: 0 22px 56px rgba(3, 22, 56, 0.07);
        }

        .leadership-photo-wrap {
            width: 100%;
            max-width: 360px;
            justify-self: center;
        }

        .leadership-photo {
            position: relative;
            overflow: hidden;
            width: 100%;
            aspect-ratio: 1;
            border-radius: 999px;
            padding: 4px;
            background: linear-gradient(145deg, #ffffff 0%, #f2f6fc 48%, #dfe7f2 100%);
            border: 1px solid rgba(3, 22, 56, 0.08);
            box-shadow:
                0 18px 38px rgba(3, 22, 56, 0.1),
                inset 0 2px 3px rgba(255, 255, 255, 0.95),
                inset 0 -2px 4px rgba(3, 22, 56, 0.1);
        }

        .leadership-photo img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center top;
            border-radius: inherit;
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.92);
        }

        .leadership-photo::after {
            content: "";
            position: absolute;
            inset: 4px;
            pointer-events: none;
            border-radius: inherit;
            box-shadow:
                inset 0 0 0 1px rgba(255, 255, 255, 0.86),
                inset 0 -10px 22px rgba(3, 22, 56, 0.08);
        }

        .leadership-copy {
            max-width: 760px;
        }

        .leadership-copy p {
            max-width: 70ch;
        }

        .leadership-badge {
            margin-bottom: 14px;
        }

        @media (max-width: 900px) {
            .leadership-section {
                padding-top: 64px;
                padding-bottom: 64px;
            }

            .leadership-card {
                grid-template-columns: 1fr;
                gap: 28px;
                padding: 24px;
            }

            .leadership-photo-wrap {
                max-width: 320px;
            }

            .leadership-copy {
                text-align: center;
                align-items: center !important;
            }

            .leadership-copy p {
                max-width: none;
            }
        }

        @media (max-width: 520px) {
            .leadership-card {
                padding: 18px;
                border-radius: 18px;
            }

            .leadership-photo-wrap {
                max-width: 260px;
            }
        }
      `,
        }}
      />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />
        <main>
          {/* Hero Section */}
          <header className="relative pt-24 pb-32 overflow-hidden flex items-center justify-center min-h-[500px] bg-gradient-to-b from-surface-container/30 to-background">
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center flex flex-col items-center justify-center relative z-10">
              <div className="entry-anim flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[12px] mb-6">
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  BY INSUREDESK IMF PVT LTD
                </div>
                <h1 className="font-display-lg text-display-lg text-primary mb-6 leading-tight text-[48px] font-bold max-w-4xl">
                  About <span className="text-secondary">BIMAHEADQUARTER</span>
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-3xl mx-auto text-[18px] leading-relaxed">
                  An institutional consulting and claim assistance brand by{" "}
                  <strong className="text-primary font-semibold">InsureDesk IMF Pvt Ltd</strong>. We bridge
                  the gap between policyholders and insurance providers across India with absolute integrity,
                  regulatory precision, and claim settlement advocacy.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link
                    href="/#cta-banner"
                    className="px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center text-[14px] font-bold"
                  >
                    Schedule Consultation
                  </Link>
                  <Link
                    href="/#solutions"
                    className="px-8 py-4 border-2 border-secondary text-secondary rounded-xl font-label-md text-label-md hover:bg-secondary/5 transition-all flex items-center justify-center bg-transparent text-[14px] font-semibold"
                  >
                    Explore Consulting Solutions
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {/* Brand Pillars / Mission Vision Values */}
          <section className="py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop bg-background">
            <div className="text-center mb-16 reveal">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-4 text-[32px] font-bold">
                Our Core Principles
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto text-[18px]">
                Every client interaction is driven by our commitment to simplify the insurance lifecycle and
                deliver positive outcomes.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-card p-10 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20">
                <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[32px]">explore</span>
                </div>
                <h3 className="font-headline-md text-[22px] text-primary mb-4 font-bold">Our Mission</h3>
                <p className="text-body-md text-on-surface-variant text-[16px] leading-relaxed">
                  To simplify corporate and individual insurance through transparent assessment, identifying
                  coverage gaps, and championing policyholder rights in complex claim situations.
                </p>
              </div>

              <div
                className="glass-card p-10 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20"
                style={{ transitionDelay: "0.15s" }}
              >
                <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[32px]">visibility</span>
                </div>
                <h3 className="font-headline-md text-[22px] text-primary mb-4 font-bold">Our Vision</h3>
                <p className="text-body-md text-on-surface-variant text-[16px] leading-relaxed">
                  To be India's premier consulting brand for institutional risk advisory and professional
                  claims advocacy, delivering unbiased advice and prompt settlements.
                </p>
              </div>

              <div
                className="glass-card p-10 rounded-2xl flex flex-col items-center text-center transition-all group reveal border border-outline-variant/20"
                style={{ transitionDelay: "0.3s" }}
              >
                <div className="w-16 h-16 rounded-xl bg-surface-container mb-6 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[32px]">gavel</span>
                </div>
                <h3 className="font-headline-md text-[22px] text-primary mb-4 font-bold">Core Values</h3>
                <p className="text-body-md text-on-surface-variant text-[16px] leading-relaxed">
                  Integrity, client advocacy, and complete regulatory alignment. We stand firmly with
                  policyholders to verify that legitimate claims are settled fairly and transparently.
                </p>
              </div>
            </div>
          </section>

          {/* Corporate Background Section */}
          <section className="py-24 bg-surface-container-low border-t border-b border-outline-variant/20">
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="reveal">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[11px] mb-4">
                    COMPLIANCE & AUTHORITY
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-primary mb-6 text-[32px] font-bold leading-tight">
                    Licensed Expertise by InsureDesk IMF Pvt Ltd
                  </h2>
                  <div className="space-y-6 text-on-surface-variant text-[16px] leading-relaxed">
                    <p>
                      BIMAHEADQUARTER operates as an exclusive consulting and services brand under the
                      corporate umbrella of <strong>InsureDesk IMF Pvt Ltd</strong>. As a licensed Insurance
                      Marketing Firm registered under the regulations of the Insurance Regulatory and
                      Development Authority of India (IRDAI), we carry out professional activities with robust
                      compliance.
                    </p>
                    <p>
                      Unlike traditional agents who solely focus on selling policy packages, we offer
                      comprehensive risk management consulting, policy review to detect exclusions, and expert
                      assistance in filing or representing claims after losses occur.
                    </p>
                    <p>
                      Whether protecting industrial assets, warehouse inventory, employee corporate health, or
                      commercial transits, BIMAHEADQUARTER combines local presence with corporate standards to
                      safeguard your business.
                    </p>
                  </div>
                  <div className="mt-8 flex gap-8">
                    <div className="flex flex-col">
                      <span className="font-headline-md text-primary font-bold text-[24px]">10+</span>
                      <span className="text-sm font-medium uppercase tracking-wider text-on-surface-variant/70 text-[11px]">
                        National Partners
                      </span>
                    </div>
                    <div className="w-px h-10 bg-outline-variant"></div>
                    <div className="flex flex-col">
                      <span className="font-headline-md text-primary font-bold text-[24px]">100%</span>
                      <span className="text-sm font-medium uppercase tracking-wider text-on-surface-variant/70 text-[11px]">
                        Unbiased Consulting
                      </span>
                    </div>
                  </div>
                </div>

                {/* Graphic Card */}
                <div className="relative rounded-3xl p-12 overflow-hidden bg-primary text-white shadow-2xl border border-primary/20 reveal">
                  <div className="absolute inset-0 -z-10 opacity-10">
                    <div className="absolute top-0 left-0 w-48 h-48 bg-secondary rounded-full blur-[80px]"></div>
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-secondary rounded-full blur-[80px]"></div>
                  </div>
                  <h3 className="font-headline-md text-[24px] mb-6 font-bold text-white">
                    Our Consulting Philosophy
                  </h3>
                  <ul className="space-y-6">
                    <li className="flex gap-4 items-start">
                      <span className="material-symbols-outlined text-secondary text-[24px] mt-1">
                        check_circle
                      </span>
                      <div>
                        <h4 className="font-semibold text-[16px] text-white">Detailed Gap Analysis</h4>
                        <p className="text-white/70 text-sm mt-1">
                          We inspect existing policies for loopholes, hidden deductibles, and under-insurance
                          risks.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-4 items-start">
                      <span className="material-symbols-outlined text-secondary text-[24px] mt-1">
                        check_circle
                      </span>
                      <div>
                        <h4 className="font-semibold text-[16px] text-white">Independent Claim Advocacy</h4>
                        <p className="text-white/70 text-sm mt-1">
                          We assist in coordinating loss documentation, surveyor meetings, and legal
                          representation if required.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-4 items-start">
                      <span className="material-symbols-outlined text-secondary text-[24px] mt-1">
                        check_circle
                      </span>
                      <div>
                        <h4 className="font-semibold text-[16px] text-white">Carrier Agnostic Reviews</h4>
                        <p className="text-white/70 text-sm mt-1">
                          We work with multiple top-rated insurers, helping you compare based on premium and
                          claim settlement speed.
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Our Leadership Section */}
          <section className="leadership-section bg-background">
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="text-center mb-16 reveal">
                <h2 className="font-headline-lg text-headline-lg text-primary mb-4 text-[32px] font-bold">
                  Our Leadership
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto text-[18px]">
                  Guided by industry veterans committed to transforming the insurance consulting landscape in India.
                </p>
              </div>

              <div className="flex flex-col gap-12">
                {LEADERSHIP.map((leader) => (
                  <div
                    key={leader.name}
                    className="leadership-card reveal"
                  >
                    {/* Leader Image */}
                    <div className="leadership-photo-wrap">
                      <div className="leadership-photo group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={leader.image}
                          alt={leader.name}
                          className="transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    </div>

                    {/* Leader Copy */}
                    <div className="leadership-copy w-full flex flex-col justify-center text-left items-start">
                      <div className="leadership-badge inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[11px] w-fit">
                        {leader.education}
                      </div>
                      <h3 className="font-headline-lg text-primary text-[28px] font-bold mb-1">
                        {leader.name}
                      </h3>
                      <p className="text-secondary font-semibold text-[16px] mb-6">
                        {leader.role}, {leader.company}
                      </p>
                      <p className="text-on-surface-variant text-[16px] leading-relaxed mb-8">
                        {leader.bio}
                      </p>
                      
                      {leader.linkedin && (
                        <a
                          href={leader.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white hover:bg-primary/90 transition-all rounded-xl w-fit text-[14px] font-bold shadow-md hover:translate-y-[-2px]"
                        >
                          <svg
                            className="w-5 h-5 fill-current"
                            style={{ width: "20px", height: "20px", minWidth: "20px", flexShrink: 0 }}
                            viewBox="0 0 24 24"
                          >
                            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .58 1 1.42v4.7zM6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M8 18.5V10.13H5V18.5z"/>
                          </svg>
                          Connect on LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Banner */}
          <section
            className="py-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-margin-desktop mt-12"
            id="cta-banner"
          >
            <div className="relative bg-primary rounded-3xl p-12 lg:p-20 overflow-hidden text-center text-on-primary shadow-2xl reveal border border-primary/20">
              <div className="absolute inset-0 -z-10 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
              </div>
              <h2 className="font-display-lg text-display-lg mb-6 entry-anim text-white text-[48px] font-bold">
                Discuss Your Policy with Certified Advisors
              </h2>
              <p
                className="font-body-lg text-body-lg mb-10 opacity-80 max-w-2xl mx-auto entry-anim text-white/80 text-[18px]"
                style={{ animationDelay: "0.2s" }}
              >
                Get a thorough check on your commercial policies or health coverage gaps. Connect with
                BIMAHEADQUARTER today.
              </p>
              <div
                className="flex flex-wrap justify-center gap-6 entry-anim"
                style={{ animationDelay: "0.4s" }}
              >
                <a
                  href={`tel:${BUSINESS_DETAILS.phoneHref}`}
                  className="px-10 py-5 bg-secondary text-white rounded-xl font-label-md text-label-md flex items-center gap-3 hover:scale-105 transition-all text-[14px]"
                >
                  <span className="material-symbols-outlined">call</span> Call Now: {BUSINESS_DETAILS.phone}
                </a>
                <a
                  href={`mailto:${BUSINESS_DETAILS.email}`}
                  className="px-10 py-5 bg-white text-primary rounded-xl font-label-md text-label-md flex items-center gap-3 hover:scale-105 transition-all border-0 min-h-0 text-[14px] font-bold"
                >
                  <span className="material-symbols-outlined">mail</span> Email Us
                </a>
              </div>
            </div>
          </section>
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
