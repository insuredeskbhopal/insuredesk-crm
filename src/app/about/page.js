import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import LandingEffects from "@/app/components/LandingEffects";
import PublicFooter from "@/app/components/public/PublicFooter";
import { BUSINESS_DETAILS, LEADERSHIP, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { HOMEPAGE_CONTENT } from "@/content/homepage";

export const metadata = {
  title: "About Us | Bima Headquarter by InsureDesk IMF Pvt. Ltd.",
  description:
    "Learn about Bima Headquarter, an institutional insurance consulting and policyholder claims advocacy brand by InsureDesk IMF Pvt. Ltd. based in Bhopal, serving clients across India.",
  openGraph: {
    title: "About Us | Bima Headquarter by InsureDesk IMF Pvt. Ltd.",
    description:
      "Institutional insurance advisory, policy fine-print audits, and claims settlement advocacy backed by InsureDesk IMF Pvt. Ltd.",
    url: `${SITE_URL}/about`,
    images: [{ url: "/brand/office.png", width: 1200, height: 675, alt: "Bima Headquarter Corporate Headquarters" }],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/about#webpage`,
      url: `${SITE_URL}/about`,
      name: `About Us | ${SITE_NAME}`,
      headline: `About Bima Headquarter by InsureDesk IMF Pvt. Ltd.`,
      description: `Learn about Bima Headquarter, an institutional insurance consulting and claim advocacy brand by InsureDesk IMF Pvt. Ltd. serving individuals and enterprises across India.`,
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
      alternateName: ["BimaHeadquarter", "bimaheadquarter.com"],
      legalName: BUSINESS_DETAILS.legalName,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/main-logo-wide.webp`,
      email: BUSINESS_DETAILS.email,
      telephone: BUSINESS_DETAILS.phoneHref,
      description: SITE_DESCRIPTION,
      foundingDate: BUSINESS_DETAILS.foundingDate,
      areaServed: { "@type": "Country", name: BUSINESS_DETAILS.serviceArea },
      founder: { "@id": `${SITE_URL}/about#anand-soni` },
      parentOrganization: { "@id": `${SITE_URL}/#company` },
      address: {
        "@type": "PostalAddress",
        streetAddress: BUSINESS_DETAILS.address.streetAddress,
        addressLocality: BUSINESS_DETAILS.address.addressLocality,
        addressRegion: BUSINESS_DETAILS.address.addressRegion,
        postalCode: BUSINESS_DETAILS.address.postalCode,
        addressCountry: BUSINESS_DETAILS.address.addressCountry,
      },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/about#anand-soni`,
      name: LEADERSHIP[0].name,
      jobTitle: LEADERSHIP[0].role,
      worksFor: { "@id": `${SITE_URL}/#company` },
      sameAs: [LEADERSHIP[0].linkedin],
    },
  ],
};

const TIMELINE_MILESTONES = [
  {
    year: "2015",
    title: "Foundation of InsureDesk IMF in Bhopal",
    desc: "Established by Founder Director Anand Soni as an independent corporate insurance advisory to protect individuals and businesses from one-sided policy clauses and fine-print traps.",
  },
  {
    year: "2018",
    title: "Corporate Fleet & Commercial Underwriting",
    desc: "Expanded institutional advisory capabilities into commercial vehicles, transport logistics, heavy industrial fire policies, and warehouse stock coverage across Central India.",
  },
  {
    year: "2021",
    title: "Dedicated Claims Advocacy Division",
    desc: "Launched a specialized technical representation unit to assist policyholders in pre-audit claim documentation, surveyor negotiations, and Ombudsman escalations, surpassing ₹25Cr+ settled.",
  },
  {
    year: "2024",
    title: "Proprietary CRM & Multi-Carrier Intranet",
    desc: "Deployed the Bima Headquarter digital policy management infrastructure, providing real-time policy extraction, automated renewal safeguards, and client portfolio transparency.",
  },
  {
    year: "Present",
    title: "National Fiduciary Leadership",
    desc: "Managing 10,000+ active policies and ₹50Cr+ in total settlements, partnering with 25+ leading public and private insurers under strict IRDAI compliance.",
  },
];

const FIDUCIARY_PILLARS = [
  {
    icon: "policy",
    title: "Pre-Loss Technical Policy Auditing",
    desc: "We rigorously inspect existing policies for hidden deductibles, room-rent sub-limits, salvage deduction clauses, and under-insurance before an adverse event strikes.",
  },
  {
    icon: "balance",
    title: "Multi-Carrier Independence",
    desc: "Zero sales quotas or insurer bias. We benchmark terms, premiums, and Incurred Claim Ratios (ICR) across 25+ top-rated national carriers purely for our clients' security.",
  },
  {
    icon: "gavel",
    title: "Assertive Claims Advocacy",
    desc: "When a loss happens, we coordinate technical documentation, scrutinize surveyor loss assessments, and champion policyholders through legal dispute channels if required.",
  },
  {
    icon: "verified_user",
    title: "IRDAI Statutory Governance",
    desc: "Operating strictly under the regulatory compliance of an authorized Insurance Marketing Firm (IMF) with zero third-party data monetization and bank-grade privacy.",
  },
];

export default function AboutPage() {
  const founder = LEADERSHIP[0];

  return (
    <>
      <LandingEffects />
      <Script
        id="about-structured-data"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />
        <main>
          <header className="about-hero-section relative isolate overflow-hidden min-h-[640px] lg:min-h-[700px] flex items-center pt-28 lg:pt-32 pb-16 lg:pb-20" id="hero">
            {/* Background Artwork */}
            <div className="absolute inset-0 -z-10 w-full h-full overflow-hidden">
              <Image
                unoptimized
                src="/brand/about-hero.png"
                alt="Bima Headquarter Insurance Advisory"
                fill
                priority
                className="object-cover object-[78%_center] lg:object-right w-full h-full"
              />
              {/* Subtle Global Whitewash (15% tint for bright airy aesthetic without washing out faces) */}
              <div className="absolute inset-0 bg-white/15 pointer-events-none" />

              {/* Directional Whitewash: Pure white behind text transitioning smoothly across the middle */}
              <div
                className="absolute inset-0 pointer-events-none hidden md:block"
                style={{
                  background:
                    "linear-gradient(90deg, #ffffff 0%, #ffffff 36%, rgba(255, 255, 255, 0.92) 50%, rgba(255, 255, 255, 0.6) 65%, rgba(255, 255, 255, 0.2) 80%, transparent 95%)",
                }}
              />

              {/* Mobile Whitewash: Clean high-legibility wash */}
              <div
                className="absolute inset-0 pointer-events-none md:hidden"
                style={{
                  background: "rgba(255, 255, 255, 0.92)",
                }}
              />
            </div>

            <div className="about-container relative z-10 w-full">
              <div className="about-hero-content max-w-[680px] flex flex-col items-start text-left justify-center">
                {/* Live Status Pill Badge */}
                <div className="hero-badge-pill mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/15 bg-white/90 backdrop-blur-md shadow-xs">
                  <span className="hero-badge-dot" aria-hidden="true" />
                  <span className="text-[11px] md:text-[12px] font-bold tracking-wide uppercase text-primary">
                    IRDAI Licensed IMF Advisory • Bhopal
                  </span>
                </div>

                {/* Main Headline with Shimmering Gradient Accent */}
                <h1 className="hero-headline typing-headline font-display-lg text-display-lg text-primary mb-3 leading-tight text-[38px] md:text-[46px] lg:text-[48px] font-bold text-left">
                  Insurance Guidance for Your{" "}
                  <span className="hero-shimmer-text">Life &amp; Business</span>
                </h1>

                {/* Subheading in Green */}
                <p className="hero-subheading text-secondary text-[20px] md:text-[24px] font-bold mb-5 text-left">
                  {HOMEPAGE_CONTENT.hero.subheading}
                </p>

                {/* Description */}
                <p className="hero-description font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-2xl text-[16px] md:text-[18px] leading-relaxed text-left">
                  {HOMEPAGE_CONTENT.hero.description}
                </p>

                {/* Hero Actions */}
                <div className="hero-actions flex flex-wrap gap-4 justify-start">
                  <Link
                    href="/contact"
                    className="hero-btn-primary px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-xl hover:translate-y-[-2px] transition-all border-0 min-h-0 text-[14px] font-bold inline-flex items-center justify-center relative overflow-hidden"
                  >
                    <span className="relative z-10">{HOMEPAGE_CONTENT.hero.ctaConsultationText}</span>
                    <span className="hero-btn-sheen" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/claims"
                    className="hero-btn-secondary px-8 py-4 border-2 border-secondary text-secondary rounded-xl font-label-md text-label-md hover:bg-secondary/5 transition-all bg-white/90 backdrop-blur-sm min-h-0 text-[14px] font-bold inline-flex items-center justify-center group shadow-xs"
                  >
                    <span>{HOMEPAGE_CONTENT.hero.ctaClaimsText}</span>
                    <span
                      className="material-symbols-outlined ml-1.5 text-[18px] transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                </div>

                {/* Inline Divider Stats Row */}
                <div className="hero-stats-container">
                  {HOMEPAGE_CONTENT.hero.stats.map((stat, idx) => (
                    <div className="hero-stat-col" key={idx}>
                      <span className="hero-stat-value">{stat.value}</span>
                      <span className="hero-stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {/* =========================================================================
              2. CORPORATE HERITAGE & ORIGIN STORY
              ========================================================================= */}
          <section className="py-24 bg-white" id="story">
            <div className="about-container">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Story Narrative */}
                <div className="reveal">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[11px] font-bold uppercase mb-4">
                    Our Heritage &amp; Origin
                  </div>
                  <h2 className="font-headline-lg text-primary text-[32px] md:text-[38px] font-extrabold tracking-tight mb-6 leading-tight">
                    Forged to Balance the Scale Between Policyholders and Insurers
                  </h2>
                  <div className="space-y-5 text-on-surface-variant text-[16px] leading-relaxed">
                    <p>
                      In 2015, Founder Director <strong>Anand Soni</strong> established InsureDesk IMF in Bhopal
                      after recognizing a profound structural imbalance in India&apos;s insurance market. Traditional
                      agents were incentivized purely on product sales volume, while policyholders were left completely
                      unsupported when deciphering policy warranties, depreciation schedules, and dispute procedures.
                    </p>
                    <p>
                      Bima Headquarter was built to operate differently: as an independent, client-side fiduciary.
                      Under the regulatory governance of an <strong>Insurance Marketing Firm (IMF)</strong>, we do not
                      simply issue policies—we conduct rigorous pre-loss coverage audits, benchmark terms across 25+
                      leading insurers, and represent our clients aggressively during surveyor meetings and claim filings.
                    </p>
                    <p>
                      Over the past decade, that dedication has protected more than 10,000 families, logistics
                      fleets, warehouses, and industrial plants across India, resolving over ₹50 Crores in legitimate
                      claims.
                    </p>
                  </div>

                  {/* Highlights Checklist */}
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-[22px]" aria-hidden="true">
                        verified
                      </span>
                      <span className="text-[15px] font-semibold text-primary">
                        Licensed Insurance Marketing Firm under IRDAI Regulatory Standards
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-[22px]" aria-hidden="true">
                        verified
                      </span>
                      <span className="text-[15px] font-semibold text-primary">
                        100% Unbiased Multi-Carrier Analysis with Zero Carrier Sales Quotas
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-[22px]" aria-hidden="true">
                        verified
                      </span>
                      <span className="text-[15px] font-semibold text-primary">
                        Pre-Claim Documentation Scrubbing to Eliminate Arbitrary Rejections
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Media Showcase */}
                <div className="about-story-media reveal">
                  <div className="about-story-frame">
                    <Image
                      unoptimized
                      src="/brand/office.png"
                      alt="Bima Headquarter Corporate Headquarters"
                      width={1200}
                      height={675}
                      className="about-story-photo"
                      priority
                    />
                    <div className="about-story-badge" aria-hidden="true">
                      <span className="material-symbols-outlined badge-icon">corporate_fare</span>
                      <div>
                        <div className="badge-title">
                          InsureDesk IMF Corporate Headquarters
                        </div>
                        <div className="badge-sub">
                          Danish Nagar Square, Bhopal • Serving Clients Pan-India
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
              3. THE 4 FIDUCIARY ADVISORY PILLARS
              ========================================================================= */}
          <section className="py-24 bg-surface-container-lowest border-t border-b border-outline-variant/20">
            <div className="about-container">
              <div className="text-center mb-16 reveal">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[11px] font-bold uppercase mb-4">
                  Our Fiduciary Model
                </div>
                <h2 className="font-headline-lg text-primary text-[32px] md:text-[38px] font-extrabold tracking-tight mb-4">
                  The Four Pillars of Policyholder Advocacy
                </h2>
                <p className="font-body-lg text-on-surface-variant max-w-2xl mx-auto text-[17px]">
                  How our institutional advisory standards protect your enterprise and family at every stage of the
                  policy lifecycle.
                </p>
              </div>

              <div className="about-pillars-grid">
                {FIDUCIARY_PILLARS.map((pillar, idx) => (
                  <div className="about-pillar-card reveal" key={idx}>
                    <div className="about-pillar-icon" aria-hidden="true">
                      <span className="material-symbols-outlined text-[28px]">{pillar.icon}</span>
                    </div>
                    <h3 className="font-headline-md text-[20px] font-bold text-primary mb-3">{pillar.title}</h3>
                    <p className="text-on-surface-variant text-[15px] leading-relaxed">{pillar.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* =========================================================================
              4. MILESTONE JOURNEY TIMELINE (2015 - PRESENT)
              ========================================================================= */}
          <section className="py-24 bg-white">
            <div className="about-container">
              <div className="text-center mb-16 reveal">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[11px] font-bold uppercase mb-4">
                  Our Growth Roadmap
                </div>
                <h2 className="font-headline-lg text-primary text-[32px] md:text-[38px] font-extrabold tracking-tight mb-4">
                  A Decade of Proven Client Protection
                </h2>
                <p className="font-body-lg text-on-surface-variant max-w-2xl mx-auto text-[17px]">
                  Tracing our evolution from a regional advisory in Bhopal to a national claims advocacy institution.
                </p>
              </div>

              <div className="about-timeline">
                {TIMELINE_MILESTONES.map((milestone, idx) => (
                  <div className="about-timeline-item reveal" key={idx}>
                    <div className="about-timeline-dot">{milestone.year}</div>
                    <div className="about-timeline-content">
                      <h3 className="text-[18px] font-bold text-primary mb-2">{milestone.title}</h3>
                      <p className="text-on-surface-variant text-[15px] leading-relaxed">{milestone.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* =========================================================================
              5. EXECUTIVE LEADERSHIP (FOUNDER DIRECTOR ANAND SONI)
              ========================================================================= */}
          <section className="py-24 bg-surface-container-lowest border-t border-b border-outline-variant/20">
            <div className="about-container">
              <div className="leadership-card reveal">
                {/* Leader Photo */}
                <div className="leadership-photo-wrap">
                  <div className="leadership-photo">
                    <Image
                      unoptimized
                      src={founder.image}
                      alt="Anand Soni, Founder Director of InsureDesk IMF Pvt. Ltd."
                      width={420}
                      height={420}
                      className="transition-transform duration-500 hover:scale-105"
                      priority
                    />
                  </div>
                </div>

                  {/* Leader Details with Exact User Content */}
                  <div className="leadership-copy w-full flex flex-col justify-center text-left items-start">
                    <div className="leadership-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[12px] font-bold uppercase w-fit mb-3">
                      FOUNDER &amp; INSURANCE LEADERSHIP
                    </div>

                    <h2 className="font-display-lg text-primary text-[32px] md:text-[40px] font-extrabold tracking-tight mb-1">
                      Anand Soni
                    </h2>

                    <p className="text-secondary font-bold text-[17px] mb-6">
                      Founder Director, InsureDesk IMF Pvt. Ltd.
                    </p>

                    <div className="space-y-4 text-on-surface-variant text-[15px] md:text-[16px] leading-relaxed mb-6">
                      <p>
                        Anand Soni is the Founder Director of InsureDesk IMF Pvt. Ltd., leading the company with a strong
                        focus on insurance advisory, risk understanding, policy guidance and client-focused
                        consultancy.
                      </p>
                      <p>
                        With over 10 years of experience in the insurance industry, he has worked closely with
                        individuals and businesses to help them understand their coverage, identify protection gaps and
                        make informed insurance decisions.
                      </p>
                      <p>
                        His approach is built around clear consultation, practical guidance and long-term client
                        relationships — ensuring insurance is understood properly before it is ever needed.
                      </p>
                    </div>

                    {/* Expertise Highlight Pills */}
                    <div className="flex flex-wrap gap-2.5 mb-6">
                      <span className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-primary text-[13px] font-bold border border-blue-100/80">
                        10+ Years in Insurance Advisory
                      </span>
                      <span className="px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-[13px] font-bold border border-emerald-100/80">
                        Insurance &amp; Risk Consultancy
                      </span>
                      <span className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[13px] font-bold border border-slate-200">
                        Policy &amp; Claim Guidance
                      </span>
                    </div>

                    {/* Founder Quote */}
                    <blockquote className="border-l-4 border-secondary pl-5 py-2.5 mb-8 bg-secondary/5 rounded-r-xl w-full">
                      <p className="italic text-[15px] text-slate-800 leading-relaxed font-medium">
                        &ldquo;Insurance is not just about buying a policy. It is about understanding the risk,
                        choosing the right protection and having the right guidance when it matters most.&rdquo;
                      </p>
                      <div className="mt-2.5">
                        <strong className="block text-[14px] font-bold text-primary">Anand Soni</strong>
                        <span className="text-[12px] text-slate-500 italic">
                          Founder Director, InsureDesk IMF Pvt. Ltd.
                        </span>
                      </div>
                    </blockquote>

                    {founder.linkedin && (
                      <a
                        href={founder.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-white hover:bg-primary/90 transition-all rounded-xl text-[14px] font-bold shadow-md hover:translate-y-[-2px] group"
                      >
                        <svg
                          className="w-5 h-5 fill-current"
                          style={{ width: "20px", height: "20px", minWidth: "20px", flexShrink: 0 }}
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .58 1 1.42v4.7zM6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M8 18.5V10.13H5V18.5z" />
                        </svg>
                        <span>Connect with Anand Soni on LinkedIn</span>
                        <span
                          className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:translate-x-1"
                          aria-hidden="true"
                        >
                          arrow_forward
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
          </section>

          {/* =========================================================================
              6. STATUTORY GOVERNANCE & CORPORATE TRANSPARENCY
              ========================================================================= */}
          <section className="py-24 bg-white">
            <div className="about-container">
              <div className="text-center mb-16 reveal">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[11px] font-bold uppercase mb-4">
                  Corporate Governance
                </div>
                <h2 className="font-headline-lg text-primary text-[32px] md:text-[38px] font-extrabold tracking-tight mb-4">
                  Statutory Transparency &amp; Credentials
                </h2>
                <p className="font-body-lg text-on-surface-variant max-w-2xl mx-auto text-[17px]">
                  Operating with absolute compliance under the legal framework of the Insurance Regulatory and
                  Development Authority of India.
                </p>
              </div>

              <div className="about-statutory-grid">
                <div className="about-statutory-card reveal">
                  <span className="material-symbols-outlined text-secondary text-[28px] mb-3 block" aria-hidden="true">
                    domain
                  </span>
                  <div className="text-[12px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Corporate Legal Entity
                  </div>
                  <div className="text-[16px] font-bold text-primary mb-2">{BUSINESS_DETAILS.legalName}</div>
                  <p className="text-[13px] text-on-surface-variant leading-relaxed">
                    Brand: {BUSINESS_DETAILS.brandName}. Registered in India under corporate laws since{" "}
                    {BUSINESS_DETAILS.foundingDate}.
                  </p>
                </div>

                <div className="about-statutory-card reveal">
                  <span className="material-symbols-outlined text-secondary text-[28px] mb-3 block" aria-hidden="true">
                    shield
                  </span>
                  <div className="text-[12px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Regulatory Standing
                  </div>
                  <div className="text-[16px] font-bold text-primary mb-2">IRDAI Insurance Marketing Firm</div>
                  <p className="text-[13px] text-on-surface-variant leading-relaxed">
                    Licensed to solicit, compare, service, and assist insurance policies across India.
                  </p>
                </div>

                <div className="about-statutory-card reveal">
                  <span className="material-symbols-outlined text-secondary text-[28px] mb-3 block" aria-hidden="true">
                    location_on
                  </span>
                  <div className="text-[12px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Physical Headquarters
                  </div>
                  <div className="text-[16px] font-bold text-primary mb-2">{BUSINESS_DETAILS.address.addressLocality}, MP</div>
                  <p className="text-[13px] text-on-surface-variant leading-relaxed mb-2">
                    {BUSINESS_DETAILS.shortAddress}
                  </p>
                  <a
                    href={BUSINESS_DETAILS.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-bold text-secondary hover:underline inline-flex items-center gap-1"
                  >
                    View on Google Maps <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>

                <div className="about-statutory-card reveal">
                  <span className="material-symbols-outlined text-secondary text-[28px] mb-3 block" aria-hidden="true">
                    support_agent
                  </span>
                  <div className="text-[12px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Advisory Desk &amp; Hours
                  </div>
                  <div className="text-[16px] font-bold text-primary mb-2">{BUSINESS_DETAILS.hours}</div>
                  <p className="text-[13px] text-on-surface-variant leading-relaxed">
                    Direct:{" "}
                    <a href={`tel:${BUSINESS_DETAILS.phoneHref}`} className="font-bold text-primary hover:underline">
                      {BUSINESS_DETAILS.phone}
                    </a>
                    <br />
                    Email:{" "}
                    <a href={`mailto:${BUSINESS_DETAILS.email}`} className="font-bold text-primary hover:underline">
                      {BUSINESS_DETAILS.email}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
              7. INSTITUTIONAL CLOSING CTA BANNER
              ========================================================================= */}
          <section
            className="py-20 about-container mb-margin-desktop mt-4"
            id="cta-banner"
          >
            <div className="relative bg-primary rounded-3xl p-10 md:p-16 lg:p-20 overflow-hidden text-center text-on-primary shadow-2xl reveal border border-primary/20">
              <div className="absolute inset-0 -z-10 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-secondary rounded-full blur-[100px]" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary rounded-full blur-[100px]" />
              </div>
              <h2 className="font-display-lg text-display-lg mb-6 text-white text-[34px] md:text-[46px] font-extrabold tracking-tight">
                Experience Unbiased Insurance Advisory That Actually Protects You
              </h2>
              <p className="font-body-lg text-body-lg mb-10 opacity-80 max-w-2xl mx-auto text-white/85 text-[17px] md:text-[19px] leading-relaxed">
                Connect directly with certified insurance advisors in Bhopal for a free policy gap audit or immediate claim
                assistance.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href={`tel:${BUSINESS_DETAILS.phoneHref}`}
                  className="px-8 py-4 bg-secondary text-white rounded-xl font-label-md text-label-md flex items-center justify-center gap-3 hover:scale-105 transition-all text-[14px] font-bold shadow-lg"
                >
                  <span className="material-symbols-outlined text-[20px]">call</span> Call Advisor:{" "}
                  {BUSINESS_DETAILS.phone}
                </a>
                <Link
                  href="/contact"
                  className="px-8 py-4 bg-white text-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-3 hover:scale-105 transition-all text-[14px] font-bold shadow-lg"
                >
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span> Book Advisory Meeting
                </Link>
              </div>
            </div>
          </section>
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
