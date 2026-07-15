import { SERVICES } from "@/content/services";
import { BUSINESS_DETAILS, SITE_URL } from "@/lib/seo/site";

export const servicesBySlug = {};
SERVICES.forEach((service) => {
  servicesBySlug[service.slug] = {
    slug: service.slug,
    icon: service.icon,
    eyebrow: service.eyebrow,
    title: service.title,
    seoTitle: service.seoTitle,
    description: service.description,
    heroImage: service.heroImage,
    overview: service.overview,
    audiences: service.audiences,
    benefits: service.benefits,
    faqs: service.faqs,
    related: service.related,
    ctaTitle: service.ctaTitle,
    ctaText: service.ctaText,
  };
});

export const serviceSlugs = Object.keys(servicesBySlug);

export const entityFaqs = [
  [
    "What is Bima Headquarter?",
    "Bima Headquarter is an insurance consultancy brand owned and operated by InsureDesk IMF Pvt. Ltd. From Bhopal, the team serves clients across India with policy guidance, coverage review, renewals, risk advisory, and claims assistance for personal and commercial insurance needs.",
  ],
  [
    "Where is Bima Headquarter located and does it serve all of India?",
    "Bima Headquarter is located in Bhopal, Madhya Pradesh. Its insurance consultancy and claims assistance services are available to individuals, families, and businesses across India through phone, email, online coordination, and office consultations.",
  ],
  [
    "Does Bima Headquarter provide claim assistance?",
    "Yes. Bima Headquarter helps clients understand claim requirements, review documents, coordinate with insurers and surveyors, follow up on submissions, and review rejection reasons. Final claim decisions remain with the insurer and are governed by the applicable policy terms.",
  ],
];

export function getServicePageSchema(service) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/services/${service.slug}#webpage`,
        url: `${SITE_URL}/services/${service.slug}`,
        name: service.seoTitle,
        description: service.description,
        isPartOf: {
          "@id": `${SITE_URL}/#website`,
        },
        about: {
          "@id": `${SITE_URL}/#organization`,
        },
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}/services/${service.slug}#service`,
        name: service.title,
        description: service.description,
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: {
          "@type": "Country",
          name: BUSINESS_DETAILS.serviceArea,
        },
        serviceType: service.title,
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/services/${service.slug}#faq`,
        mainEntity: [...service.faqs, ...entityFaqs].map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/services/${service.slug}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
          {
            "@type": "ListItem",
            position: 3,
            name: service.title,
            item: `${SITE_URL}/services/${service.slug}`,
          },
        ],
      },
    ],
  };
}

const commonRelated = [
  { title: "General Insurance", slug: "general-insurance", icon: "shield" },
  { title: "Health Insurance", slug: "health-insurance", icon: "medical_services" },
  { title: "Motor Insurance", slug: "motor-insurance", icon: "directions_car" },
  { title: "Commercial Insurance", slug: "commercial-insurance", icon: "apartment" },
  { title: "Claims Assistance", slug: "claims-assistance", icon: "gavel" },
  { title: "Policy Renewals", slug: "policy-renewals", icon: "sync" },
];

export function getRelatedServices(service) {
  const bySlug = new Map(commonRelated.map((item) => [item.slug, item]));
  return service.related.map(
    (slug) =>
      bySlug.get(slug) || {
        title: servicesBySlug[slug].title,
        slug,
        icon: servicesBySlug[slug].icon,
      },
  );
}
