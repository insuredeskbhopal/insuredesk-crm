import { BUSINESS_DETAILS } from "./business";

export const HOMEPAGE_CONTENT = {
  hero: {
    brandBadge: "A Brand of InsureDesk IMF Private Limited",
    headlineLine1: "Insurance Consulting &",
    headlineLine2Highlight: "Claim Assistance",
    headlineLine2Tail: " Across India",
    description:
      "BIMAHEADQUARTER helps individuals, families, businesses, warehouses, transporters, and institutions make informed insurance decisions with professional consulting and claim support. Headquartered in Bhopal, we assist clients across India with motor, health, life, marine, warehouse, and commercial insurance solutions.",
    ctaConsultationText: "Get Insurance Consultation",
    ctaClaimsText: "Claim Assistance",
    stats: [
      {
        value: "+10",
        label: "Partner Insurers",
        isCounter: true,
        id: "partners-counter",
      },
      {
        value: "Claims",
        label: "Assistance",
      },
      {
        value: "Expert",
        label: "Consultation",
      },
    ],
  },
  partnerSliderTitle: "Authorized Partners with Leading Insurers",
  servicesSection: {
    kicker: "OUR SERVICES",
    heading: "Comprehensive Insurance Solutions",
    subheading: "From personal protection to large-scale industrial risks,\nwe provide tailored consultancy for every need.",
  },
  trustBar: [
    {
      icon: "shield",
      title: "Trusted Expertise",
      desc: "Years of experience you can rely on.",
    },
    {
      icon: "person_add",
      title: "Client First Approach",
      desc: "Solutions tailored to your needs.",
    },
    {
      icon: "verified",
      title: "Reliable Support",
      desc: "We're here when you need us most.",
    },
  ],
  whyChooseUs: {
    heading: "BIMAHEADQUARTER At a Glance",
    subheading: `Insurance consulting and claims advocacy backed by ${BUSINESS_DETAILS.legalName}.`,
    ctaText: "View Our Process",
    cards: [
      {
        icon: "shield",
        title: "Brand & Support",
        desc: "BIMAHEADQUARTER is a customer-facing insurance consulting and claim assistance brand of InsureDesk IMF Private Limited. We help clients understand policy options, documentation, renewals, and claim communication with insurers.",
      },
      {
        icon: "share_location",
        title: "Office & Reach",
        desc: "Based in Bhopal, we assist individuals, families, businesses, warehouses, transporters, and institutions across India through consultation, documentation support, and claim follow-up coordination.",
      },
      {
        icon: "category",
        title: "Insurance Areas",
        desc: "Our team supports motor, health, life, fire, marine, warehouse, commercial, group insurance, renewals, endorsements, and claim assistance.",
      },
    ],
  },
  processSection: {
    kicker: "Stress-Free Settlements",
    heading: "Claim Assistance Excellence",
    ctaText: "Start a Claim Request",
    steps: [
      {
        number: 1,
        title: "Incident Reporting",
        desc: "Notify us immediately after an incident. Our response team is available 24/7 to guide you.",
      },
      {
        number: 2,
        title: "Documentation Support",
        desc: "Our experts help you gather and verify all required documents to ensure no technical rejections.",
      },
      {
        number: 3,
        title: "Advocacy & Settlement",
        desc: "We represent you to the insurer, handling all negotiations until the claim is successfully settled.",
      },
    ],
  },
  faqSection: {
    heading: "Common Inquiries",
    subheading: "Can't find what you're looking for? Reach out to our dedicated support team directly.",
    ctaText: "Contact Support",
    faqs: [
      {
        question: "Is the first consultation really free?",
        answer:
          "Yes, we provide initial policy review and consultation at no cost to help you understand your current coverage gaps and potential savings.",
      },
      {
        question: "How many insurance partners do you work with?",
        answer:
          "We are authorized partners with over 10 leading national insurance companies, ensuring you get a wide range of quotes and feature sets.",
      },
      {
        question: "Can you help with a claim for a policy I didn't buy through you?",
        answer:
          "Absolutely. Our Claim Assistance service is available for all policyholders, regardless of where the policy was originally purchased. Fees may apply for third-party advocacy.",
      },
    ],
  },
  ctaBanner: {
    heading: "Need Help Choosing Insurance?",
    subheading: "Get a personalized risk assessment and expert recommendations today from our certified advisors.",
    callCtaText: "Call Now:",
    scheduleCtaText: "Schedule Consultation",
  },
};
