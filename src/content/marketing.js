import { SERVICES } from "./services";

const STATIC_MARKETING_PAGES = [
  {
    path: "/about",
    title: "About Bima Headquarter",
    description:
      "Learn about Bima Headquarter, an insurance and claim consulting brand by InsureDesk IMF Pvt. Ltd. serving individuals and businesses in India.",
    heading: "About Bima Headquarter",
    summary:
      "Bima Headquarter helps clients choose suitable insurance coverage and navigate claim complexity with expert support.",
    sections: [
      "Insurance consulting backed by InsureDesk IMF Pvt. Ltd.",
      "Policy comparison and coverage gap review for individuals and businesses.",
      "Claim documentation and settlement assistance across leading insurers.",
    ],
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/contact",
    title: "Contact Bima Headquarter",
    description:
      "Contact Bima Headquarter for insurance consultation, claim assistance, policy comparison, and business insurance support.",
    heading: "Contact Bima Headquarter",
    summary: "Reach Bima Headquarter for insurance advice, claim support, and policy consultation.",
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
      "Privacy policy for Bima Headquarter, including how insurance consultation and claim assistance information is handled.",
    heading: "Privacy Policy",
    summary:
      "Bima Headquarter handles client information for insurance consultation, claim assistance, and policy servicing purposes.",
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
      "Terms and conditions for using Bima Headquarter insurance consultation and claim assistance services.",
    heading: "Terms and Conditions",
    summary:
      "These terms summarize the basis for using Bima Headquarter consultation and claim assistance services.",
    sections: [
      "Insurance recommendations depend on information provided by the client and insurer terms.",
      "Final policy issuance, premium, underwriting, and claim decisions remain subject to insurer rules.",
      "Bima Headquarter may provide claim support, but claim approval is determined by the insurer.",
    ],
    priority: 0.4,
    changeFrequency: "yearly",
  },
  {
    path: "/disclaimer",
    title: "Insurance Consultancy Disclaimer",
    description:
      "Read the Bima Headquarter disclaimer covering insurance consultancy, insurer decisions, policy terms, and claims assistance.",
    heading: "Disclaimer",
    summary:
      "Bima Headquarter provides insurance consultancy and claims assistance; insurers retain responsibility for underwriting, policy issuance, and claim decisions.",
    sections: [
      "Bima Headquarter is a brand owned and operated by InsureDesk IMF Pvt. Ltd.",
      "Guidance is based on information supplied by clients and the terms made available by insurers. Clients should read the final policy wording, schedule, exclusions, and endorsements.",
      "Claims assistance does not guarantee settlement. Claim admission, assessment, payment, or rejection remains subject to the insurer's decision and the applicable policy terms.",
    ],
    priority: 0.4,
    changeFrequency: "yearly",
  },
  {
    path: "/services",
    title: "Insurance Services Across India | Bima Headquarter",
    description:
      "Explore insurance services across India with Bima Headquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory.",
    heading: "Our Insurance Services",
    summary: "Complete insurance solutions and expert claim consulting with Pan India support.",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/blog",
    title: "Insurance Blog & Insights | Bima Headquarter",
    description:
      "Read the latest guides, checklists, and expert insights on insurance claims, renewals, and risk management from Bima Headquarter.",
    heading: "Insurance Blog & Insights",
    summary:
      "Expert advice and detailed guides on navigating insurance claims, policy renewals, and risk management.",
    priority: 0.85,
    changeFrequency: "weekly",
  },
  {
    path: "/faq",
    title: "Frequently Asked Questions (FAQ) | Bima Headquarter",
    description:
      "Find answers to common questions about Bima Headquarter (InsureDesk IMF Pvt. Ltd.), claims assistance, policy renewals, and commercial risk advisory.",
    heading: "Frequently Asked Questions",
    summary:
      "Clear, professional answers about our advisory process, claim representation, compliance, and policies.",
    sections: [
      "IRDAI registered Insurance Marketing Firm licensed through InsureDesk IMF Pvt. Ltd.",
      "Expert claims assistance and representation support for personal and commercial losses.",
      "Data privacy, secure document management, and regular policy renewal support.",
    ],
    priority: 0.8,
    changeFrequency: "monthly",
  },
];

const servicePages = [];
SERVICES.forEach((service) => {
  servicePages.push({
    path: service.route,
    title: service.seoTitle || `${service.title} Consulting Across India | Bima Headquarter`,
    description: service.description || service.desc,
    heading: service.title,
    summary: service.marketingSummary || service.desc,
    priority: 0.8,
    changeFrequency: "monthly",
  });
});

export const MARKETING_PAGES = [...STATIC_MARKETING_PAGES, ...servicePages];
