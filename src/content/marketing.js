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
    title: "Privacy Policy & Data Protection Charter",
    description:
      "Official Privacy Policy and Client Data Protection Charter for Bima Headquarter (InsureDesk IMF Pvt. Ltd.). Zero commercial data selling, 256-bit SSL encryption, and IRDAI compliance.",
    heading: "Privacy Policy & Client Data Protection Charter",
    summary:
      "How Bima Headquarter and InsureDesk IMF Pvt. Ltd. collect, safeguard, and ethically process client insurance portfolios, KYC identifiers, and claim records under IRDAI standards.",
    sections: [
      "Zero Data Monetization Pledge: Client data and mobile numbers are never sold, rented, or leased to third-party telemarketers.",
      "Bank-Grade Security: 256-bit SSL encryption in transit and AES-256 encrypted vaulting for stored policy PDFs and KYC records.",
      "Statutory Grievance Redressal: Direct access to our designated Data Protection Officer with 24-48 hour acknowledgment SLA.",
    ],
    priority: 0.5,
    changeFrequency: "monthly",
  },
  {
    path: "/terms-and-conditions",
    title: "Terms and Conditions of Advisory & Service",
    description:
      "Official Terms and Conditions governing insurance advisory, policy review, claims advocacy, and statutory compliance with Bima Headquarter (InsureDesk IMF Pvt. Ltd.).",
    heading: "Terms and Conditions of Advisory & Service",
    summary:
      "Legal conditions and client engagement charter governing insurance consultation, policy review, claim advocacy, and advisory engagements with Bima Headquarter.",
    sections: [
      "Fiduciary Intermediary: Bima Headquarter operates as an authorized Insurance Marketing Firm (IMF) under IRDAI guidelines.",
      "Utmost Good Faith: Insurance proposals are subject to full material fact disclosure by the client under the principle of Uberrima Fides.",
      "Prohibition of Rebates: Strict compliance with Section 41 of the Insurance Act 1938 prohibiting premium rebates or inducements.",
    ],
    priority: 0.5,
    changeFrequency: "monthly",
  },
  {
    path: "/disclaimer",
    title: "Insurance Consultancy & Regulatory Disclaimer",
    description:
      "Read the official Bima Headquarter disclaimer covering insurance consultancy, intermediary advisory scope, insurer underwriting independence, and claims assistance boundaries.",
    heading: "Insurance Consultancy & Regulatory Disclaimer",
    summary:
      "Statutory disclosures, underwriting boundaries, intermediary advisory status, and liability limitations governing Bima Headquarter (InsureDesk IMF Pvt. Ltd.).",
    sections: [
      "Intermediary Role: Bima Headquarter operates as an authorized Insurance Marketing Firm (IMF) and does not underwrite insurance risk.",
      "Solicitation Disclaimer: Insurance is the subject matter of solicitation. Policy issuance, premiums, and claim payments remain subject to insurer underwriting.",
      "Claims Assistance Boundaries: Claims guidance does not guarantee claim settlement, which remains the exclusive statutory prerogative of the insurer.",
    ],
    priority: 0.5,
    changeFrequency: "monthly",
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
  {
    path: "/download-app",
    title: "Download Bima Headquarter Android App | Insurance In Your Pocket",
    description:
      "Download the official Bima Headquarter mobile app for Android to track policy portfolios, download insurer PDFs, and file claims directly from your phone.",
    heading: "Download Bima Headquarter Mobile App",
    summary:
      "Official Bima Headquarter Android APK download, verified clean installation package, and step-by-step setup guide.",
    sections: [
      "Official Android APK download v1.0.1.",
      "Instant 1-tap policy PDF schedules and offline access.",
      "Direct claim assistance and policy portfolio tracking.",
    ],
    priority: 0.85,
    changeFrequency: "weekly",
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
