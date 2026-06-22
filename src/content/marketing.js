import { SERVICES } from "./services";

const STATIC_MARKETING_PAGES = [
  {
    path: "/about",
    title: "About BIMAHEADQUARTER",
    description:
      "Learn about BIMAHEADQUARTER, an insurance and claim consulting brand by InsureDesk IMF Pvt Ltd serving individuals and businesses in India.",
    heading: "About BIMAHEADQUARTER",
    summary:
      "BIMAHEADQUARTER helps clients choose suitable insurance coverage and navigate claim complexity with expert support.",
    sections: [
      "Insurance consulting backed by InsureDesk IMF Pvt Ltd.",
      "Policy comparison and coverage gap review for individuals and businesses.",
      "Claim documentation and settlement assistance across leading insurers.",
    ],
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/contact",
    title: "Contact BIMAHEADQUARTER",
    description:
      "Contact BIMAHEADQUARTER for insurance consultation, claim assistance, policy comparison, and business insurance support.",
    heading: "Contact BIMAHEADQUARTER",
    summary: "Reach BIMAHEADQUARTER for insurance advice, claim support, and policy consultation.",
    sections: [
      "Email: info@bimaheadquarter.com",
      "Phone: 88188 89660",
      "Office: S-2, 2nd Floor, Nikhil Homes, Danish Nagar Square Main, 2 Narmadapuram Road, Near D-Mart, Opposite Rajasthan Mishtan, Landmark 1, Bhopal, Madhya Pradesh 462026",
    ],
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy",
    description:
      "Privacy policy for BIMAHEADQUARTER, including how insurance consultation and claim assistance information is handled.",
    heading: "Privacy Policy",
    summary:
      "BIMAHEADQUARTER handles client information for insurance consultation, claim assistance, and policy servicing purposes.",
    sections: [
      "Client data may include contact details, policy details, claim documents, and service requests.",
      "Information is used to provide insurance consultation, claim support, and operational follow-up.",
      "Clients can contact info@bimaheadquarter.com for privacy-related questions.",
    ],
    priority: 0.4,
    changeFrequency: "yearly",
  },
  {
    path: "/terms-and-conditions",
    title: "Terms and Conditions",
    description:
      "Terms and conditions for using BIMAHEADQUARTER insurance consultation and claim assistance services.",
    heading: "Terms and Conditions",
    summary:
      "These terms summarize the basis for using BIMAHEADQUARTER consultation and claim assistance services.",
    sections: [
      "Insurance recommendations depend on information provided by the client and insurer terms.",
      "Final policy issuance, premium, underwriting, and claim decisions remain subject to insurer rules.",
      "BIMAHEADQUARTER may provide claim support, but claim approval is determined by the insurer.",
    ],
    priority: 0.4,
    changeFrequency: "yearly",
  },
  {
    path: "/services",
    title: "Insurance Services Across India | BimaHeadquarter",
    description:
      "Explore insurance services across India with BimaHeadquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory.",
    heading: "Our Insurance Services",
    summary: "Complete insurance solutions and expert claim consulting with Pan India support.",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/blog",
    title: "Insurance Blog & Insights | BimaHeadquarter",
    description:
      "Read the latest guides, checklists, and expert insights on insurance claims, renewals, and risk management from BimaHeadquarter.",
    heading: "Insurance Blog & Insights",
    summary:
      "Expert advice and detailed guides on navigating insurance claims, policy renewals, and risk management.",
    priority: 0.85,
    changeFrequency: "weekly",
  },
  {
    path: "/faq",
    title: "Frequently Asked Questions (FAQ) | BIMAHEADQUARTER",
    description:
      "Find answers to common questions about BIMAHEADQUARTER (InsureDesk IMF Pvt Ltd), claims assistance, policy renewals, and commercial risk advisory.",
    heading: "Frequently Asked Questions",
    summary:
      "Clear, professional answers about our advisory process, claim representation, compliance, and policies.",
    sections: [
      "IRDAI registered Insurance Marketing Firm licensed through InsureDesk IMF Pvt Ltd.",
      "Expert claims assistance and representation support for personal and commercial losses.",
      "Data privacy, secure document management, and regular policy renewal support.",
    ],
    priority: 0.8,
    changeFrequency: "monthly",
  },
];

const servicePages = [];
SERVICES.forEach((service) => {
  // 1. Add Legacy path config (if it exists and differs from route)
  if (service.legacyPath && service.legacyPath !== service.route) {
    servicePages.push({
      path: service.legacyPath,
      title: service.marketingTitle || `${service.title} Consulting`,
      description: service.marketingDescription || service.description,
      heading: service.marketingHeading || `${service.title} Consulting`,
      summary: service.marketingSummary || service.desc,
      sections: service.marketingSections || [],
      priority: 0.8,
      changeFrequency: "monthly",
    });
  }

  // 2. Add services subfolder route config (e.g. /services/motor-insurance)
  servicePages.push({
    path: service.route,
    title: service.seoTitle || `${service.title} Consulting Across India | BimaHeadquarter`,
    description: service.description || service.desc,
    heading: service.title,
    summary: service.marketingSummary || service.desc,
    priority: 0.8,
    changeFrequency: "monthly",
  });
});

export const MARKETING_PAGES = [...STATIC_MARKETING_PAGES, ...servicePages];
