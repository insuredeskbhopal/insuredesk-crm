import { SERVICES } from "@/content/services";
import { BUSINESS_DETAILS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

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
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}/services/${service.slug}#service`,
        name: service.title,
        description: service.description,
        provider: {
          "@type": "Organization",
          name: SITE_NAME,
          legalName: BUSINESS_DETAILS.legalName,
          url: SITE_URL,
        },
        areaServed: {
          "@type": "Country",
          name: BUSINESS_DETAILS.serviceArea,
        },
        serviceType: service.title,
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/services/${service.slug}#faq`,
        mainEntity: service.faqs.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
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
