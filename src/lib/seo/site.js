export const SITE_URL = "https://bimaheadquarter.com";

export const SITE_NAME = "BIMAHEADQUARTER";

export const SITE_TITLE = "BIMAHEADQUARTER | Insurance & Claim Consulting";

export const SITE_DESCRIPTION =
  "BIMAHEADQUARTER helps individuals, families, businesses, warehouses, transporters, and institutions make informed insurance decisions with professional consulting and claim support. Headquartered in Bhopal, we assist clients across India with motor, health, life, marine, warehouse, and commercial insurance solutions.";

export const BRAND_KEYWORDS = [
  "BimaHeadquarter",
  "Bima Headquarter",
  "Bima Headquarters",
  "Bima HQ",
  "BimaHQ",
  "BHQ",
  "BHQ Insurance",
  "BimaHeadquarter by InsureDesk",
  "InsureDesk IMF Private Limited",
  "InsureDesk",
];

export const CORE_SERVICE_KEYWORDS = [
  "insurance consultant",
  "insurance advisor",
  "insurance consulting India",
  "insurance consultant Bhopal",
  "insurance advisor Bhopal",
  "insurance claim assistance",
  "insurance claim support",
  "policy renewal assistance",
  "risk advisory services",
  "commercial insurance consultant",
];

export const INSURANCE_TYPE_KEYWORDS = [
  "motor insurance",
  "car insurance",
  "bike insurance",
  "commercial vehicle insurance",
  "fleet insurance",
  "health insurance",
  "family health insurance",
  "group health insurance",
  "life insurance",
  "term insurance",
  "fire insurance",
  "warehouse insurance",
  "godown insurance",
  "stock insurance",
  "marine insurance",
  "transit insurance",
  "business insurance",
  "commercial insurance",
];

export const CLAIM_ISSUE_KEYWORDS = [
  "insurance claim rejected",
  "claim settlement delayed",
  "claim documents required",
  "insurance company not responding",
  "cashless claim denied",
  "health insurance claim rejected",
  "motor claim rejected",
  "fire insurance claim assistance",
  "warehouse fire claim support",
  "marine cargo claim assistance",
  "commercial insurance claim help",
  "claim settlement consultant",
  "claim documentation assistance",
  "rejected claim review",
  "insurance dispute assistance",
  "car insurance claim rejected",
];

export const PERSONA_KEYWORDS = [
  "insurance for warehouse owner",
  "insurance for transporter",
  "insurance for fleet owner",
  "insurance for business owner",
  "insurance for shop owner",
  "insurance for factory owner",
  "insurance for MSME",
  "insurance for startup",
  "insurance for family",
  "insurance for parents",
];

export const INDUSTRY_KEYWORDS = [
  "warehouse stock insurance",
  "cold storage insurance",
  "rice mill insurance",
  "logistics insurance",
  "transport business insurance",
  "fleet risk insurance",
  "cargo transit insurance",
  "retail shop insurance",
  "office package policy",
  "MSME insurance",
  "factory insurance",
  "manufacturing insurance",
  "godown stock protection",
];

export const QUESTION_KEYWORDS = [
  "which insurance is best for warehouse",
  "how to file insurance claim",
  "what documents are required for insurance claim",
  "why insurance claim is rejected",
  "how to renew expired policy",
  "can rejected insurance claim be reopened",
  "how to choose health insurance",
  "how much warehouse insurance is required",
  "what is fire insurance for warehouse",
  "what is marine cargo insurance",
  "how to claim commercial vehicle insurance",
  "insurance claim rejected what to do",
];

export const LOCATION_KEYWORDS = [
  "insurance consultant near me",
  "insurance advisor near me",
  "claim assistance near me",
  "insurance office Bhopal",
  "insurance consultant Madhya Pradesh",
  "insurance advisor Madhya Pradesh",
  "claim assistance Bhopal",
  "policy renewal Bhopal",
  "warehouse insurance Bhopal",
  "commercial insurance Bhopal",
  "motor insurance Bhopal",
  "health insurance Bhopal",
  "insurance consultant Indore",
  "insurance consultant Jabalpur",
  "insurance consultant Gwalior",
  "insurance consultant Delhi",
  "insurance consultant Mumbai",
];

export const INSURER_KEYWORDS = [
  "ICICI Lombard claim assistance",
  "HDFC ERGO claim assistance",
  "Tata AIG claim assistance",
  "IFFCO Tokio claim assistance",
  "New India Assurance claim support",
  "Bajaj Allianz claim assistance",
  "Royal Sundaram claim assistance",
  "Future Generali claim assistance",
  "Go Digit claim support",
  "United India claim assistance",
  "Oriental Insurance claim assistance",
  "National Insurance claim assistance",
];

export const COMMERCIAL_INTENT_KEYWORDS = [
  "best insurance consultant",
  "best insurance advisor",
  "compare insurance policy",
  "affordable insurance premium",
  "lowest premium insurance",
  "best warehouse insurance policy",
  "best health insurance consultant",
  "best motor insurance consultant",
  "business insurance quotation",
  "commercial insurance quotation",
  "insurance premium comparison",
  "expert insurance claim consultant",
];

export const LONG_TAIL_KEYWORDS = [
  "warehouse fire insurance claim assistance in India",
  "commercial vehicle insurance renewal support",
  "health insurance cashless claim denied help",
  "business insurance consultant for MSME in India",
  "marine cargo insurance claim documentation support",
  "fire insurance policy for warehouse stock",
  "claim assistance for policy bought from another agent",
  "insurance consultant for family and business protection",
  "corporate insurance advisory and claim support",
  "professional claim assistance for commercial losses",
];

export const SITE_KEYWORDS = [...new Set([
  ...BRAND_KEYWORDS,
  ...CORE_SERVICE_KEYWORDS,
  ...INSURANCE_TYPE_KEYWORDS,
  ...CLAIM_ISSUE_KEYWORDS,
  ...PERSONA_KEYWORDS,
  ...INDUSTRY_KEYWORDS,
  ...QUESTION_KEYWORDS,
  ...LOCATION_KEYWORDS,
  ...INSURER_KEYWORDS,
  ...COMMERCIAL_INTENT_KEYWORDS,
  ...LONG_TAIL_KEYWORDS,
])];



export const MARKETING_PAGES = [
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
    path: "/motor-insurance",
    title: "Motor Insurance Consulting",
    description:
      "Motor insurance consulting for cars, bikes, commercial vehicles, renewals, coverage comparison, and claim assistance.",
    heading: "Motor Insurance Consulting",
    summary: "Get help choosing motor insurance coverage for personal and commercial vehicles.",
    sections: [
      "Compare coverage for car, bike, and commercial vehicle policies.",
      "Review own damage, third-party, add-on, and renewal options.",
      "Get claim documentation and settlement support when needed.",
    ],
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/health-insurance",
    title: "Health Insurance Consulting",
    description:
      "Health insurance consulting for individuals, families, businesses, cashless treatment support, and claim assistance.",
    heading: "Health Insurance Consulting",
    summary: "Choose health insurance with suitable sum insured, network hospital access, and claim support.",
    sections: [
      "Review individual, family, and group health insurance needs.",
      "Understand waiting periods, exclusions, cashless treatment, and renewals.",
      "Get assistance when a health claim needs documentation or follow-up.",
    ],
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/life-insurance",
    title: "Life Insurance Consulting",
    description:
      "Life insurance consulting for family protection, income planning, policy comparison, and long-term financial security.",
    heading: "Life Insurance Consulting",
    summary:
      "Plan life insurance coverage based on family responsibilities, income, liabilities, and future goals.",
    sections: [
      "Compare life insurance options for family protection.",
      "Review coverage amount, premium affordability, and policy terms.",
      "Get guidance on documentation and policy servicing.",
    ],
    priority: 0.75,
    changeFrequency: "monthly",
  },
  {
    path: "/business-insurance",
    title: "Business Insurance Consulting",
    description:
      "Business insurance consulting for companies, shops, offices, assets, liability, operations, and commercial risk protection.",
    heading: "Business Insurance Consulting",
    summary:
      "Protect business assets, operations, employees, and liabilities with suitable commercial insurance.",
    sections: [
      "Review risk exposure for business premises, stock, equipment, and operations.",
      "Compare commercial insurance options across insurer partners.",
      "Get expert claim support during loss documentation and settlement.",
    ],
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/fire-insurance",
    title: "Fire Insurance Consulting",
    description:
      "Fire insurance consulting for property, stock, plant, machinery, business assets, and fire claim assistance.",
    heading: "Fire Insurance Consulting",
    summary: "Cover property and business assets against fire and allied risks with expert policy review.",
    sections: [
      "Assess risk location, occupancy, stock, property, and asset values.",
      "Compare fire and allied peril coverage options.",
      "Get claim documentation guidance after a loss event.",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/warehouse-insurance",
    title: "Warehouse Insurance Consulting",
    description:
      "Warehouse insurance consulting for stock, storage risk, fire exposure, transit links, and claim assistance.",
    heading: "Warehouse Insurance Consulting",
    summary:
      "Protect warehouse stock and storage operations with coverage tailored to risk location and inventory value.",
    sections: [
      "Review warehouse location, stock value, and storage exposure.",
      "Compare fire, burglary, and allied risk coverage options.",
      "Get support for claim paperwork and insurer coordination.",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/marine-insurance",
    title: "Marine Insurance Consulting",
    description:
      "Marine insurance consulting for cargo, inland transit, import export shipments, annual policies, and claim support.",
    heading: "Marine Insurance Consulting",
    summary:
      "Protect goods in transit with marine insurance guidance for route, cargo, and annual movement exposure.",
    sections: [
      "Review cargo type, routes, annual transit value, and shipment mode.",
      "Compare transit and marine cargo insurance options.",
      "Get support for documentation during transit claims.",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/cyber-insurance",
    title: "Cyber Insurance Consulting",
    description:
      "Cyber insurance consulting for businesses, data exposure, digital operations, cyber incidents, and claim support.",
    heading: "Cyber Insurance Consulting",
    summary:
      "Understand cyber risk coverage for businesses that handle customer data, websites, and digital operations.",
    sections: [
      "Review data exposure, website risk, employee access, and digital dependency.",
      "Compare cyber insurance options for incident response and liability support.",
      "Get guidance on claim documentation after cyber incidents.",
    ],
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/travel-insurance",
    title: "Travel Insurance Consulting",
    description:
      "Travel insurance consulting for domestic and international trips, medical emergencies, baggage, delays, and claims.",
    heading: "Travel Insurance Consulting",
    summary:
      "Choose travel insurance based on destination, trip duration, travelers, and medical or baggage protection needs.",
    sections: [
      "Review destination, travel dates, travelers, and trip duration.",
      "Compare medical, baggage, delay, and emergency assistance benefits.",
      "Get claim support for travel-related documentation.",
    ],
    priority: 0.65,
    changeFrequency: "monthly",
  },
  {
    path: "/claims-assistance",
    title: "Claims Assistance",
    description:
      "Insurance claim assistance for documentation, insurer coordination, rejected claim review, and settlement follow-up.",
    heading: "Claims Assistance",
    summary:
      "Get help with claim documentation, insurer follow-up, and settlement guidance even when the policy was bought elsewhere.",
    sections: [
      "Review claim documents and insurer requirements.",
      "Coordinate follow-ups and identify documentation gaps.",
      "Support claim settlement workflows for individuals and businesses.",
    ],
    priority: 0.85,
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
    path: "/services/general-insurance",
    title: "General Insurance Consulting Across India | BimaHeadquarter",
    description:
      "Secure your personal and business assets across India with General Insurance consulting by BimaHeadquarter (Insuredesk IMF Private Ltd).",
    heading: "General Insurance Consulting",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/services/health-insurance",
    title: "Health Insurance Consulting Across India | BimaHeadquarter",
    description:
      "Get the best health insurance plans for individuals, families, and corporates across India with BimaHeadquarter's expert consulting.",
    heading: "Health Insurance Consulting",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/services/motor-insurance",
    title: "Motor Insurance Consulting Across India | BimaHeadquarter",
    description:
      "Compare and renew car, bike, and commercial vehicle insurance across India. Get expert claim support at BimaHeadquarter.",
    heading: "Motor Insurance Consulting",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/services/life-insurance",
    title: "Life Insurance Consulting Across India | BimaHeadquarter",
    description:
      "Plan for your family's financial security. Expert life insurance consulting across India with BimaHeadquarter (Insuredesk IMF Private Ltd).",
    heading: "Life Insurance Consulting",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/services/commercial-insurance",
    title: "Commercial & Business Insurance Across India | BimaHeadquarter",
    description:
      "Protect your corporate assets, stocks, and liabilities across India. Professional commercial insurance advisory by BimaHeadquarter.",
    heading: "Commercial Insurance Consulting",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/services/warehouse-insurance",
    title: "Warehouse Insurance Consulting Across India | BimaHeadquarter",
    description:
      "Protect warehouse stock, storage risks, burglary exposure, and fire hazards with warehouse insurance consulting by BimaHeadquarter.",
    heading: "Warehouse Insurance Consulting",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/services/marine-insurance",
    title: "Marine Insurance Consulting Across India | BimaHeadquarter",
    description:
      "Get marine and transit insurance consulting for cargo moved by road, rail, air, or sea with expert claim support by BimaHeadquarter.",
    heading: "Marine Insurance Consulting",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/services/policy-renewals",
    title: "Easy Policy Renewals Across India | BimaHeadquarter",
    description:
      "Never let your coverage lapse. Professional assistance for timely policy renewals across all insurance categories in India.",
    heading: "Policy Renewals Support",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/services/claims-assistance",
    title: "Insurance Claims Assistance Across India | BimaHeadquarter",
    description:
      "Facing issues with claim settlements? Get expert representation, documentation support, and claims advocacy across India.",
    heading: "Claims Assistance Service",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/services/risk-advisory",
    title: "Corporate Risk Advisory Services Across India | BimaHeadquarter",
    description:
      "Identify, assess, and mitigate business risks. Corporate risk advisory services across India from Insuredesk IMF Private Ltd.",
    heading: "Risk Advisory Services",
    priority: 0.8,
    changeFrequency: "monthly",
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

export const PUBLIC_ROUTES = [
  {
    path: "/",
    priority: 1,
    changeFrequency: "weekly",
  },
  ...MARKETING_PAGES.map(({ path, priority, changeFrequency }) => ({
    path,
    priority,
    changeFrequency,
  })),
];

export const PUBLIC_ROUTE_PATHS = PUBLIC_ROUTES.map((route) => route.path);

export const BUSINESS_DETAILS = {
  legalName: "Insuredesk IMF Private Ltd",
  brandName: SITE_NAME,
  email: "info@bimaheadquarter.com",
  phone: "88188 89660",
  phoneHref: "+918818889660",
  address: {
    streetAddress:
      "S-2, 2nd Floor, Nikhil Homes, Danish Nagar Square Main, 2 Narmadapuram Road, Near D-Mart, Opposite Rajasthan Mishtan, Landmark 1",
    addressLocality: "Bhopal",
    addressRegion: "Madhya Pradesh",
    postalCode: "462026",
    addressCountry: "IN",
  },
  fullAddress:
    "S-2, 2nd Floor, Nikhil Homes, Danish Nagar Square Main, 2 Narmadapuram Road, Near D-Mart, Opposite Rajasthan Mishtan, Landmark 1, Bhopal, Madhya Pradesh 462026",
  shortAddress: "S-2, 2nd Floor, Nikhil Homes, Danish Nagar Square, Bhopal 462026",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=S-2%2C%202nd%20Floor%2C%20Nikhil%20Homes%20Danish%20Nagar%20Square%20Main%2C%202%2C%20Narmadapuram%20Rd%2C%20near%20D%20mart%2C%20opposite%20Rajasthan%20Mishtan%2C%20Landmark%201%2C%20Bhopal%2C%20Madhya%20Pradesh%20462026",
  serviceArea: "India",
  hours: "Monday – Saturday 9:00 AM – 6:00 PM",
  rating: "4.9/5 based on Google Reviews",
};
