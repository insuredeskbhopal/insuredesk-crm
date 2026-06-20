"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import LandingEffects from "@/app/components/LandingEffects";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import { BUSINESS_DETAILS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const contactSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ContactPage",
      "@id": `${SITE_URL}/contact#webpage`,
      url: `${SITE_URL}/contact`,
      name: "Contact BimaHeadquarter | Insurance Consulting Across India",
      description:
        "Contact BimaHeadquarter for Pan India insurance consulting, policy review, renewals, risk advisory, and claim assistance.",
      isPartOf: {
        "@id": `${SITE_URL}/#website`,
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: BUSINESS_DETAILS.legalName,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/main-logo-wide.webp`,
      email: BUSINESS_DETAILS.email,
      telephone: BUSINESS_DETAILS.phoneHref,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: BUSINESS_DETAILS.phoneHref,
        contactType: "customer support",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
    },
    {
      "@type": "InsuranceAgency",
      "@id": `${SITE_URL}/contact#corporate-office`,
      name: SITE_NAME,
      telephone: BUSINESS_DETAILS.phoneHref,
      email: BUSINESS_DETAILS.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: BUSINESS_DETAILS.address.streetAddress,
        addressLocality: BUSINESS_DETAILS.address.addressLocality,
        addressRegion: BUSINESS_DETAILS.address.addressRegion,
        postalCode: BUSINESS_DETAILS.address.postalCode,
        addressCountry: BUSINESS_DETAILS.address.addressCountry,
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 23.1956,
        longitude: 77.4608,
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "18:00",
      },
    },
  ],
};

const serviceOptions = [
  "General Insurance",
  "Health Insurance",
  "Motor Insurance",
  "Life Insurance",
  "Commercial Insurance",
  "Warehouse Insurance",
  "Marine Insurance",
  "Policy Renewals",
  "Claims Assistance",
  "Risk Advisory",
];

const contactRoutes = [
  {
    icon: "call",
    label: "Call",
    value: BUSINESS_DETAILS.phone,
    href: `tel:${BUSINESS_DETAILS.phoneHref}`,
  },
  {
    icon: "mail",
    label: "Email",
    value: BUSINESS_DETAILS.email,
    href: `mailto:${BUSINESS_DETAILS.email}`,
  },
  {
    icon: "directions",
    label: "Directions",
    value: "Corporate Office",
    href: BUSINESS_DETAILS.mapsUrl,
    external: true,
  },
];

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (event) => {
    setFormState((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.name || !formState.phone || !formState.message) {
      window.alert("Please fill name, phone number, and message.");
      return;
    }
    setIsSubmitted(true);
    setFormState({
      name: "",
      phone: "",
      email: "",
      service: "",
      message: "",
    });
  };

  return (
    <>
      <LandingEffects />
      <Script
        id="contact-structured-data"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />

      <div className="landing-shell contact-page bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />

        <main>
          <section className="contact-hero">
            <div className="contact-hero-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="contact-hero-copy reveal">
                <span className="contact-eyebrow">
                  <span className="material-symbols-outlined">support_agent</span>
                  Pan India Insurance Support
                </span>
                <h1>Talk to BimaHeadquarter for policy, renewal, and claim support.</h1>
                <p>
                  Share your requirement and our team will help you review coverage, compare options, or
                  understand the next step in a claim.
                </p>
              </div>

              <div className="contact-action-panel reveal">
                {contactRoutes.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.value}</small>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="contact-workspace">
            <div className="contact-workspace-inner max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <aside className="contact-info-stack reveal">
                <div className="contact-info-card">
                  <span className="material-symbols-outlined">domain</span>
                  <h2>Corporate Office</h2>
                  <p>{BUSINESS_DETAILS.shortAddress}</p>
                  <a href={BUSINESS_DETAILS.mapsUrl} target="_blank" rel="noopener noreferrer">
                    Get Directions
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </a>
                </div>

                <div className="contact-info-card">
                  <span className="material-symbols-outlined">schedule</span>
                  <h2>Working Hours</h2>
                  <p>{BUSINESS_DETAILS.hours}</p>
                  <small>Sunday closed. Emergency claim guidance is handled by callback priority.</small>
                </div>

                <div className="contact-info-card">
                  <span className="material-symbols-outlined">verified_user</span>
                  <h2>Licensed Support</h2>
                  <p>{BUSINESS_DETAILS.legalName}</p>
                  <small>Insurance Marketing Firm support for clients across India.</small>
                </div>
              </aside>

              <section className="contact-form-card reveal" id="inquiry">
                <div className="contact-form-heading">
                  <span>Request Callback</span>
                  <h2>Send your insurance query</h2>
                  <p>
                    Tell us what you need. A team member will use your details only to respond to this
                    inquiry.
                  </p>
                </div>

                {isSubmitted ? (
                  <div className="contact-success">
                    <span className="material-symbols-outlined">check_circle</span>
                    <h3>Inquiry received</h3>
                    <p>Thank you. Our team will get back to you during business hours.</p>
                    <button type="button" onClick={() => setIsSubmitted(false)}>
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="contact-form-grid">
                      <label>
                        <span>Name *</span>
                        <input
                          name="name"
                          value={formState.name}
                          onChange={handleChange}
                          placeholder="Your full name"
                          required
                        />
                      </label>
                      <label>
                        <span>Phone *</span>
                        <input
                          name="phone"
                          value={formState.phone}
                          onChange={handleChange}
                          placeholder="10-digit mobile number"
                          required
                        />
                      </label>
                      <label>
                        <span>Email</span>
                        <input
                          name="email"
                          type="email"
                          value={formState.email}
                          onChange={handleChange}
                          placeholder="name@example.com"
                        />
                      </label>
                      <label>
                        <span>Service</span>
                        <select name="service" value={formState.service} onChange={handleChange}>
                          <option value="">Select a service</option>
                          {serviceOptions.map((service) => (
                            <option key={service} value={service}>
                              {service}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="contact-message-field">
                      <span>Message *</span>
                      <textarea
                        name="message"
                        value={formState.message}
                        onChange={handleChange}
                        placeholder="Briefly explain your policy, renewal, or claim requirement."
                        rows={5}
                        required
                      />
                    </label>
                    <button type="submit" className="contact-submit-button">
                      Submit Consultation Request
                    </button>
                  </form>
                )}
              </section>
            </div>
          </section>

          <section className="contact-bottom-band">
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
              <div className="contact-bottom-grid reveal">
                <div>
                  <span>Need faster help?</span>
                  <h2>Call directly for urgent claim or renewal queries.</h2>
                </div>
                <a href={`tel:${BUSINESS_DETAILS.phoneHref}`}>
                  <span className="material-symbols-outlined">call</span>
                  Call {BUSINESS_DETAILS.phone}
                </a>
                <Link href="/services">
                  Explore Services
                  <span className="material-symbols-outlined">arrow_forward</span>
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
