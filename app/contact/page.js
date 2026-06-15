"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import Breadcrumbs from "@/app/components/public/Breadcrumbs";
import { BUSINESS_DETAILS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const contactSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      "name": SITE_NAME,
      "legalName": BUSINESS_DETAILS.legalName,
      "url": SITE_URL,
      "logo": `${SITE_URL}/brand/main-logo-wide.png`,
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": BUSINESS_DETAILS.phone,
        "contactType": "customer service",
        "areaServed": "IN",
        "availableLanguage": ["English", "Hindi"]
      }
    },
    {
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/contact#local-business`,
      "name": SITE_NAME,
      "image": `${SITE_URL}/brand/main-logo-wide.png`,
      "telephone": BUSINESS_DETAILS.phone,
      "email": BUSINESS_DETAILS.email,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": BUSINESS_DETAILS.address.streetAddress,
        "addressLocality": BUSINESS_DETAILS.address.addressLocality,
        "addressRegion": BUSINESS_DETAILS.address.addressRegion,
        "postalCode": BUSINESS_DETAILS.address.postalCode,
        "addressCountry": "IN"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "23.1950",
        "longitude": "77.4520"
      },
      "url": `${SITE_URL}/contact`,
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "09:00",
        "closes": "18:00"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "180"
      }
    },
    {
      "@type": "InsuranceAgency",
      "@id": `${SITE_URL}/contact#insurance-agency`,
      "name": SITE_NAME,
      "parentOrganization": {
        "@id": `${SITE_URL}/#organization`
      },
      "telephone": BUSINESS_DETAILS.phone,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": BUSINESS_DETAILS.address.streetAddress,
        "addressLocality": BUSINESS_DETAILS.address.addressLocality,
        "addressRegion": BUSINESS_DETAILS.address.addressRegion,
        "postalCode": BUSINESS_DETAILS.address.postalCode,
        "addressCountry": "IN"
      }
    }
  ]
};

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Add landing-page class for scoped styles
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

  const handleChange = (e) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formState.name || !formState.phone || !formState.message) {
      window.alert("Please fill in all required fields (Name, Phone, and Message).");
      return;
    }
    setIsSubmitted(true);
    setFormState({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: ""
    });
  };

  return (
    <>
      {/* Script for Tailwind and Schemas */}
      <Script
        src="https://cdn.tailwindcss.com?plugins=forms,container-queries"
        strategy="beforeInteractive"
      />
      <Script id="contact-structured-data" type="application/ld+json" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }} />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Be+Vietnam+Pro:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{
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
        .landing-page, .landing-page * {
            color: inherit !important;
        }
        .landing-page body, .landing-page .bg-background {
            background-color: #f8f9ff !important;
            color: #0b1c30 !important;
        }
        .landing-page h1, .landing-page h2, .landing-page h3, .landing-page h4 {
            color: #031638 !important;
        }
      `}} />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />
        <Breadcrumbs />

        {/* Hero Section */}
        <header className="relative pt-16 pb-20 bg-gradient-to-b from-surface-container/30 to-background text-center">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col items-center">
            <div className="entry-anim flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[12px] mb-6">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  support_agent
                </span>
                WE'RE HERE TO HELP
              </div>
              <h1 className="font-display-lg text-display-lg text-primary mb-6 leading-tight text-[48px] font-bold max-w-3xl">
                Contact <span className="text-secondary">BimaHeadquarter</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto text-[18px]">
                Have questions about a claim, need a policy review, or want to explore customized plans? Get in touch with our certified insurance consulting team.
              </p>
            </div>
          </div>
        </header>

        {/* Contact Info & Inquiry Form Grid */}
        <section className="py-16 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop bg-background" id="inquiry">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            
            {/* Information Cards (Left - Col 5) */}
            <div className="lg:col-span-5 space-y-6 reveal">
              <div className="glass-card p-8 rounded-2xl border border-outline-variant/20">
                <h2 className="font-headline-md text-primary text-[24px] font-bold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[28px]">domain</span>
                  Office Headquarters
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant/70 text-[11px] mb-2">
                      PARENT COMPANY
                    </h3>
                    <p className="text-[16px] font-semibold text-primary">{BUSINESS_DETAILS.legalName}</p>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Licensed Insurance Marketing Firm in Bhopal, Madhya Pradesh.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant/70 text-[11px] mb-2">
                      OFFICE ADDRESS
                    </h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {BUSINESS_DETAILS.address.streetAddress}, {BUSINESS_DETAILS.address.addressLocality}, {BUSINESS_DETAILS.address.addressRegion} - {BUSINESS_DETAILS.address.postalCode}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant/70 text-[11px] mb-2">
                        PHONE
                      </h3>
                      <a href={`tel:${BUSINESS_DETAILS.phone.replace(/\s+/g, "")}`} className="text-[16px] font-bold text-secondary hover:underline">
                        {BUSINESS_DETAILS.phone}
                      </a>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant/70 text-[11px] mb-2">
                        EMAIL
                      </h3>
                      <a href={`mailto:${BUSINESS_DETAILS.email}`} className="text-[14px] font-semibold text-secondary hover:underline break-all">
                        {BUSINESS_DETAILS.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours & Rating */}
              <div className="glass-card p-8 rounded-2xl border border-outline-variant/20">
                <h3 className="font-headline-md text-primary text-[20px] font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[24px]">schedule</span>
                  Hours &amp; Reviews
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-on-surface-variant font-medium">Monday – Saturday</span>
                    <span className="text-primary font-semibold">9:00 AM – 6:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-outline-variant/10 pt-4">
                    <span className="text-on-surface-variant font-medium">Sunday</span>
                    <span className="text-red-500 font-semibold">Closed</span>
                  </div>
                  <div className="border-t border-outline-variant/10 pt-4 flex items-center gap-3">
                    <div className="flex text-yellow-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {BUSINESS_DETAILS.rating}
                    </span>
                  </div>
                </div>
              </div>

              {/* Services Overview Sidebar links */}
              <div className="glass-card p-8 rounded-2xl border border-outline-variant/20">
                <h3 className="font-headline-md text-primary text-[20px] font-bold mb-4">
                  Core Consultations
                </h3>
                <ul className="space-y-3 text-sm text-on-surface-variant font-medium">
                  <li>
                    <Link href="/services/health-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">medical_services</span> Health Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/motor-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">directions_car</span> Motor Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/life-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">family_restroom</span> Life Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/commercial-insurance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">apartment</span> Commercial Insurance
                    </Link>
                  </li>
                  <li>
                    <Link href="/services/claims-assistance" className="hover:text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">gavel</span> Claim Settling Support
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Inquiry Form (Right - Col 7) */}
            <div className="lg:col-span-7 reveal">
              <div className="bg-white p-10 rounded-3xl border border-outline-variant/20 shadow-xl">
                <h2 className="font-headline-md text-primary text-[24px] font-bold mb-2">
                  Get Insurance Assistance
                </h2>
                <p className="text-sm text-on-surface-variant mb-8">
                  Submit this inquiry form to receive a call back from our certified corporate and retail risk advisors in Bhopal.
                </p>

                {isSubmitted ? (
                  <div className="p-8 rounded-2xl bg-secondary/10 text-center border border-secondary/20">
                    <span className="material-symbols-outlined text-secondary text-[64px] mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    <h3 className="font-headline-md text-[20px] text-secondary font-bold mb-2">
                      Inquiry Received Successfully!
                    </h3>
                    <p className="text-sm text-on-surface-variant">
                      Thank you for contacting BimaHeadquarter. An Insuredesk IMF certified advisor will call you at your preferred number within 24 business hours.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="mt-6 px-6 py-3 bg-secondary text-white rounded-xl text-sm font-bold border-0"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={formState.name}
                          onChange={handleChange}
                          required
                          placeholder="Your full name"
                          className="w-full px-4 py-3 rounded-xl border border-outline-variant/50 focus:border-secondary focus:ring-0 text-sm text-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Phone Number *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formState.phone}
                          onChange={handleChange}
                          required
                          placeholder="10-digit mobile number"
                          className="w-full px-4 py-3 rounded-xl border border-outline-variant/50 focus:border-secondary focus:ring-0 text-sm text-primary"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formState.email}
                          onChange={handleChange}
                          placeholder="name@company.com"
                          className="w-full px-4 py-3 rounded-xl border border-outline-variant/50 focus:border-secondary focus:ring-0 text-sm text-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Select Service</label>
                        <select
                          name="subject"
                          value={formState.subject}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-outline-variant/50 focus:border-secondary focus:ring-0 text-sm text-primary"
                        >
                          <option value="">Choose insurance category...</option>
                          <option value="General Insurance">General Insurance</option>
                          <option value="Health Insurance">Health Insurance</option>
                          <option value="Motor Insurance">Motor Insurance</option>
                          <option value="Life Insurance">Life Insurance</option>
                          <option value="Commercial Insurance">Commercial Insurance</option>
                          <option value="Policy Renewals">Policy Renewals</option>
                          <option value="Claims Assistance">Claims Assistance</option>
                          <option value="Risk Advisory">Risk Advisory</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">Detailed Message *</label>
                      <textarea
                        name="message"
                        value={formState.message}
                        onChange={handleChange}
                        required
                        rows="4"
                        placeholder="Please detail your insurance or claim settlement issues..."
                        className="w-full px-4 py-3 rounded-xl border border-outline-variant/50 focus:border-secondary focus:ring-0 text-sm text-primary"
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:shadow-lg transition-all border-0 text-[14px]"
                    >
                      Submit Consultation Request
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* Location Section - Map Embed */}
        <section className="py-16 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop bg-background">
          <div className="reveal mb-8">
            <h2 className="font-headline-lg text-primary text-[28px] font-bold mb-2">
              Visit Our Bhopal Office
            </h2>
            <p className="text-sm text-on-surface-variant">
              Located conveniently at Danish Nagar Square, Narmadapuram Road. Free client parking is available directly in front of Nikhil Homes.
            </p>
          </div>
          <div className="w-full h-[450px] rounded-3xl overflow-hidden shadow-lg border border-outline-variant/20 reveal">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3667.6622417743934!2d77.4568863!3d23.1950478!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397c43c19e5d263b%3A0xe2bc1d8a4f48ff0!2sNikhil%20Homes!5e0!3m2!1sen!2sin!4v1718456000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </section>

        {/* Quick CTA Actions */}
        <section className="py-12 bg-surface-container-low border-t border-b border-outline-variant/20 text-center">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-wrap justify-center gap-8 reveal">
            <a
              href={`tel:${BUSINESS_DETAILS.phone.replace(/\s+/g, "")}`}
              className="px-8 py-4 bg-secondary text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all text-[14px]"
            >
              <span className="material-symbols-outlined">call</span>
              Call Now: {BUSINESS_DETAILS.phone}
            </a>
            <a
              href="#inquiry"
              className="px-8 py-4 bg-primary text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all text-[14px]"
            >
              <span className="material-symbols-outlined">description</span>
              Get Insurance Assistance
            </a>
            <a
              href="https://maps.google.com/?q=Nikhil+Homes+Danish+Nagar+Bhopal"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white text-primary rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all border border-outline-variant/30 text-[14px]"
            >
              <span className="material-symbols-outlined">directions</span>
              Get Directions
            </a>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
