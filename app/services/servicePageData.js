import { BUSINESS_DETAILS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const commonRelated = [
  { title: "General Insurance", slug: "general-insurance", icon: "shield" },
  { title: "Health Insurance", slug: "health-insurance", icon: "medical_services" },
  { title: "Motor Insurance", slug: "motor-insurance", icon: "directions_car" },
  { title: "Commercial Insurance", slug: "commercial-insurance", icon: "apartment" },
  { title: "Claims Assistance", slug: "claims-assistance", icon: "gavel" },
  { title: "Policy Renewals", slug: "policy-renewals", icon: "sync" }
];

export const servicesBySlug = {
  "general-insurance": {
    slug: "general-insurance",
    icon: "shield",
    eyebrow: "Asset Protection",
    title: "General Insurance Consulting",
    seoTitle: "General Insurance Consulting Across India | BimaHeadquarter",
    description: "Protect personal assets, homes, shops, property, inventory, and liabilities with correctly structured general insurance guidance across India.",
    heroImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "General insurance protects non-life assets such as property, stock, vehicles, household contents, commercial premises, and liability exposures. A policy works well only when the sum insured, exclusions, add-ons, and claim conditions match the real risk.",
      `BimaHeadquarter, by ${BUSINESS_DETAILS.legalName}, helps individuals and businesses compare coverage options, review policy wordings, identify under-insurance, and prepare documents so claims do not fail because of avoidable gaps.`
    ],
    audiences: ["Homeowners and tenants", "Retailers and shopkeepers", "Business and factory owners", "Logistics and stock-heavy operations"],
    benefits: [
      ["Policy Gap Review", "We check exclusions, deductibles, add-ons, and sum insured adequacy before you commit."],
      ["Asset Value Alignment", "We help estimate practical coverage values so under-insurance does not reduce claims."],
      ["Claim-Ready Setup", "We guide documentation and insurer coordination from policy purchase to claim support."]
    ],
    faqs: [
      ["What does general insurance cover?", "It can cover property, vehicles, stock, household goods, liability, cargo, and other non-life risks depending on the selected policy."],
      ["Can BimaHeadquarter compare multiple insurers?", "Yes. We help compare options across insurer partners and explain the practical differences in policy wording, price, and claim process."],
      ["Why is under-insurance risky?", "If your declared sum insured is lower than the real asset value, the insurer may reduce claim payout proportionately during settlement."],
      ["Do you help after policy purchase?", "Yes. We assist with renewal review, endorsement coordination, documentation, and claim support."]
    ],
    related: ["health-insurance", "motor-insurance", "commercial-insurance", "claims-assistance"],
    ctaTitle: "Need a clean insurance review?",
    ctaText: "Share your existing policy or asset details and our team will help identify coverage gaps before they become claim problems."
  },
  "health-insurance": {
    slug: "health-insurance",
    icon: "medical_services",
    eyebrow: "Medical Cover",
    title: "Health Insurance Consulting",
    seoTitle: "Health Insurance Consulting Across India | BimaHeadquarter",
    description: "Compare individual, family, senior citizen, and corporate health insurance plans with guidance on waiting periods, exclusions, and cashless claims.",
    heroImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "Health insurance decisions should not be based only on premium. Waiting periods, room rent limits, disease-wise caps, network access, restoration benefits, and pre-existing disease terms can change the real value of a plan.",
      "We help families and businesses evaluate health covers with a practical claim lens so hospitalization support remains dependable when it is needed most."
    ],
    audiences: ["Individuals and families", "Senior citizens", "Employers and HR teams", "People reviewing old or limited policies"],
    benefits: [
      ["Network Review", "We help verify hospital network suitability and cashless process expectations."],
      ["Exclusion Clarity", "We explain waiting periods, PED terms, co-pay, sub-limits, and room rent conditions."],
      ["Claim Guidance", "We support pre-authorization, document checks, and reimbursement claim coordination."]
    ],
    faqs: [
      ["What should I check before buying health insurance?", "Review waiting periods, hospital network, room rent conditions, co-pay, exclusions, restoration benefits, and claim settlement process."],
      ["Can I port my existing health policy?", "In many cases yes, subject to insurer rules and timelines. We help review portability documents and continuity benefits."],
      ["Is the cheapest premium always best?", "No. Lower premiums may come with sub-limits, co-pay, or weaker benefits. The right plan balances price with claim usability."],
      ["Do you support cashless claim paperwork?", "Yes. We help with pre-authorization checks, required documents, and insurer coordination."]
    ],
    related: ["life-insurance", "general-insurance", "claims-assistance", "policy-renewals"],
    ctaTitle: "Want a health policy that works during hospitalization?",
    ctaText: "Let us compare the policy conditions that matter before you choose or renew."
  },
  "motor-insurance": {
    slug: "motor-insurance",
    icon: "directions_car",
    eyebrow: "Vehicle Protection",
    title: "Motor & Fleet Insurance Consulting",
    seoTitle: "Motor Insurance Consulting Across India | BimaHeadquarter",
    description: "Compare and renew car, bike, commercial vehicle, and fleet insurance with guidance on IDV, add-ons, NCB, and claim support.",
    heroImage: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "Motor insurance is mandatory, but a meaningful motor policy goes beyond third-party compliance. IDV, zero depreciation, engine protection, consumables, roadside assistance, and NCB handling can affect both premium and claim payout.",
      "BimaHeadquarter helps vehicle owners and fleet operators compare policies, structure add-ons, and manage claim documentation for smoother repair and settlement outcomes."
    ],
    audiences: ["Car and bike owners", "Commercial vehicle owners", "Fleet managers", "Taxi and logistics operators"],
    benefits: [
      ["IDV and Add-on Review", "We help balance premium with realistic vehicle value and useful extensions."],
      ["NCB Protection", "We guide NCB transfer, renewal discounts, and claim impact on future premiums."],
      ["Garage and Claim Help", "We assist with claim intimation, surveyor coordination, and cashless garage process."]
    ],
    faqs: [
      ["What is IDV in motor insurance?", "IDV is the insured declared value of the vehicle and acts as the maximum payable amount in total loss or theft cases."],
      ["Should I take zero depreciation cover?", "It is useful for newer vehicles because it reduces depreciation deductions on replaced parts during claims."],
      ["Can NCB be transferred?", "Yes. NCB belongs to the owner and can often be transferred when changing vehicles or insurers, subject to rules."],
      ["Do you help with accident claims?", "Yes. We guide claim intimation, document checks, surveyor coordination, and garage follow-up."]
    ],
    related: ["general-insurance", "policy-renewals", "claims-assistance", "commercial-insurance"],
    ctaTitle: "Renewing a car, bike, or fleet policy?",
    ctaText: "Get IDV, add-ons, and NCB reviewed before renewal."
  },
  "life-insurance": {
    slug: "life-insurance",
    icon: "family_restroom",
    eyebrow: "Financial Security",
    title: "Life Insurance Consulting",
    seoTitle: "Life Insurance Consulting Across India | BimaHeadquarter",
    description: "Plan term insurance, family protection, savings-linked covers, and key person protection with clear need analysis and policy comparison.",
    heroImage: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "Life insurance should be based on responsibilities, liabilities, income replacement needs, and long-term family security. A random premium-led choice can leave dependents under-protected.",
      "We help calculate practical coverage needs, compare term and savings-linked options, and align life insurance with family and business continuity goals."
    ],
    audiences: ["Earning family members", "Business owners", "Parents planning long-term security", "Companies needing key person protection"],
    benefits: [
      ["Need Analysis", "We estimate coverage using income, liabilities, dependents, and goals."],
      ["Plan Comparison", "We explain term, savings, and protection-led structures without jargon."],
      ["Nomination and Documentation", "We help reduce avoidable claim friction through clean records."]
    ],
    faqs: [
      ["How much life insurance do I need?", "It depends on income, liabilities, dependents, goals, and existing assets. We help calculate a practical coverage range."],
      ["Is term insurance better than savings plans?", "Term insurance is usually best for pure protection. Savings-linked plans serve different goals and need separate evaluation."],
      ["Can businesses buy key person insurance?", "Yes. Key person cover helps businesses manage financial impact if a key contributor dies."],
      ["Do you help with nomination updates?", "Yes. We guide nominee, assignment, and documentation checks."]
    ],
    related: ["health-insurance", "policy-renewals", "general-insurance", "risk-advisory"],
    ctaTitle: "Is your family protection enough?",
    ctaText: "Ask for a practical life cover need review."
  },
  "commercial-insurance": {
    slug: "commercial-insurance",
    icon: "apartment",
    eyebrow: "Business Risk",
    title: "Commercial & Business Insurance",
    seoTitle: "Commercial & Business Insurance Across India | BimaHeadquarter",
    description: "Protect business assets, stock, liabilities, factories, offices, and operational exposures with commercial insurance advisory across India.",
    heroImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "Commercial insurance needs a structured view of assets, locations, stock values, machinery, liability, business interruption, and operational exposures. A generic package can leave serious gaps.",
      "We help businesses evaluate risk, choose suitable policy structures, and prepare claim-ready documentation for fire, burglary, liability, transit, and other corporate risks."
    ],
    audiences: ["SMEs and corporates", "Factories and offices", "Retail chains and distributors", "Asset-heavy businesses"],
    benefits: [
      ["Risk Mapping", "We map assets, processes, and liabilities before recommending coverage."],
      ["Policy Structuring", "We align fire, burglary, liability, marine, and add-on covers."],
      ["Claim Preparedness", "We help organize declarations, invoices, asset schedules, and proof records."]
    ],
    faqs: [
      ["What is commercial insurance?", "It is a group of policies that protect business property, stock, liability, transit, machinery, and other operational risks."],
      ["Can one policy cover all business risks?", "Some package policies combine risks, but every business still needs wording, limits, and exclusions reviewed."],
      ["Do you help with stock value declarations?", "Yes. We guide declaration and floater structures where stock values change frequently."],
      ["Is liability cover important?", "Yes. Liability cover protects against third-party claims arising from business operations, premises, or products."]
    ],
    related: ["warehouse-insurance", "marine-insurance", "claims-assistance", "risk-advisory"],
    ctaTitle: "Need business risk mapped properly?",
    ctaText: "Let us review your commercial exposure before the next renewal."
  },
  "warehouse-insurance": {
    slug: "warehouse-insurance",
    icon: "inventory_2",
    eyebrow: "Stock & Storage",
    title: "Warehouse Insurance Consulting",
    seoTitle: "Warehouse Insurance Consulting Across India | BimaHeadquarter",
    description: "Protect warehouse stock, storage liabilities, fire exposure, burglary risk, and fluctuating inventory values with structured insurance guidance.",
    heroImage: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "Warehouses carry concentrated risk: large stock values, fire exposure, theft possibilities, handling losses, and liability for third-party goods. A weak policy can create major settlement disputes.",
      "We help structure warehouse insurance around stock movement, declarations, location values, storage conditions, burglary controls, and claim documentation requirements."
    ],
    audiences: ["Warehouse owners", "3PL and logistics providers", "Cold storage operators", "Manufacturers and distributors"],
    benefits: [
      ["Stock Value Strategy", "We help choose declaration, floater, and location-wise coverage structures."],
      ["Fire and Burglary Review", "We examine core perils, add-ons, and risk-control documentation."],
      ["Liability Awareness", "We help identify when warehouseman liability coverage is required."]
    ],
    faqs: [
      ["Who needs warehouse insurance?", "Warehouse operators, 3PL providers, distributors, manufacturers, cold storages, and businesses storing high-value goods."],
      ["How is fluctuating stock insured?", "Declaration or floater policies may be suitable depending on stock movement and location spread."],
      ["Does it cover cold storage deterioration?", "Standard covers may not. Deterioration of stock add-ons should be reviewed for temperature-sensitive goods."],
      ["What documents matter during claims?", "Stock registers, invoices, fire reports, police reports, photographs, and location declarations are often important."]
    ],
    related: ["commercial-insurance", "marine-insurance", "claims-assistance", "risk-advisory"],
    ctaTitle: "Storing high-value goods?",
    ctaText: "Get warehouse stock and liability exposure reviewed before loss occurs."
  },
  "marine-insurance": {
    slug: "marine-insurance",
    icon: "directions_boat",
    eyebrow: "Transit Risk",
    title: "Marine Insurance Consulting",
    seoTitle: "Marine Insurance Consulting Across India | BimaHeadquarter",
    description: "Cover goods moving by road, rail, air, or sea with marine cargo and inland transit insurance advisory for businesses across India.",
    heroImage: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "Marine insurance is not limited to sea cargo. It also covers goods moving by road, rail, air, and inland transit. The right policy depends on movement frequency, cargo value, route risk, packaging, and contractual responsibility.",
      "We help businesses select specific voyage, open policy, inland transit, and cargo coverage structures while keeping claim documentation practical."
    ],
    audiences: ["Manufacturers and traders", "Importers and exporters", "Logistics operators", "Businesses moving goods between locations"],
    benefits: [
      ["Transit Structure", "We help choose single transit, annual, or open policy structures."],
      ["Clause Review", "We explain coverage clauses, exclusions, packing conditions, and loading risks."],
      ["Claim Documentation", "We guide LR, invoice, packing list, damage certificate, and insurer intimation."]
    ],
    faqs: [
      ["What does marine cargo insurance cover?", "It covers physical loss or damage to goods during transit, subject to policy terms and selected clauses."],
      ["Is road transit covered?", "Yes. Inland transit by road or rail can be covered through suitable marine/inland transit policies."],
      ["What is an open marine policy?", "It is an annual arrangement for repeated shipments with declarations made during the policy period."],
      ["What documents are required for claims?", "Common documents include invoice, packing list, LR or bill of lading, policy certificate, damage certificate, and claim bill."]
    ],
    related: ["warehouse-insurance", "commercial-insurance", "claims-assistance", "risk-advisory"],
    ctaTitle: "Moving goods across locations?",
    ctaText: "Let us help structure transit coverage before dispatch."
  },
  "policy-renewals": {
    slug: "policy-renewals",
    icon: "sync",
    eyebrow: "Continuity",
    title: "Policy Renewals Support",
    seoTitle: "Easy Policy Renewals Across India | BimaHeadquarter",
    description: "Avoid coverage gaps with timely renewal review, premium comparison, updated risk assessment, and policy continuity support across India.",
    heroImage: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "Renewal is the best time to correct coverage gaps. Risk values change, vehicles age, health requirements shift, businesses expand, and insurer terms may change.",
      "We help clients review existing policies before expiry, compare renewal options, update sums insured, and maintain continuity without unnecessary gaps."
    ],
    audiences: ["Individuals with multiple policies", "Families renewing health cover", "Vehicle owners and fleets", "Businesses with annual policies"],
    benefits: [
      ["Renewal Tracking", "We help prevent missed dates and accidental policy lapses."],
      ["Coverage Refresh", "We review values, add-ons, exclusions, and changed risk profile."],
      ["Premium Comparison", "We compare renewal options while protecting continuity benefits."]
    ],
    faqs: [
      ["Why review a policy at renewal?", "Renewal is the right time to adjust coverage, add riders, correct values, and compare insurer terms."],
      ["Can a lapsed policy be revived?", "Sometimes, depending on insurer rules, inspection requirements, and policy type. We help check options."],
      ["Should I switch insurers every year?", "Only if the new option improves value without harming continuity benefits or claim reliability."],
      ["Do you remind clients before expiry?", "Yes. Renewal support includes tracking and proactive review assistance."]
    ],
    related: ["motor-insurance", "health-insurance", "life-insurance", "claims-assistance"],
    ctaTitle: "Do not let coverage lapse.",
    ctaText: "Share your renewal date and we will help review options before expiry."
  },
  "claims-assistance": {
    slug: "claims-assistance",
    icon: "gavel",
    eyebrow: "Claim Advocacy",
    title: "Insurance Claims Assistance & Advocacy",
    seoTitle: "Insurance Claims Assistance Across India | BimaHeadquarter",
    description: "Get professional help with insurance claim documentation, rejection review, surveyor coordination, and settlement follow-up across India.",
    heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "The real test of an insurance policy begins at claim time. Missing documents, delayed intimation, unclear loss proof, or incorrect interpretation of exclusions can delay or reduce settlement.",
      "We help policyholders organize claim papers, coordinate insurer communication, review rejection letters, and present facts clearly for fair claim consideration."
    ],
    audiences: ["Policyholders with rejected claims", "Businesses handling large losses", "Families during hospitalization", "Vehicle owners after accidents"],
    benefits: [
      ["Document Audit", "We check claim forms, proof, bills, reports, and insurer requirements before submission."],
      ["Surveyor Coordination", "We help align site visits, facts, estimates, and damage documentation."],
      ["Appeal Support", "We review rejection reasons and help prepare formal representation where suitable."]
    ],
    faqs: [
      ["Can you help with a policy bought elsewhere?", "Yes. We can assist with claim documentation and review even if the policy was not originally bought through us."],
      ["Why are claims rejected?", "Common reasons include delayed intimation, non-disclosure, exclusions, lapsed policies, missing proof, or mismatch between loss and policy terms."],
      ["Do you guarantee claim approval?", "No. Final approval depends on insurer terms and facts. We help present the claim correctly and reduce avoidable gaps."],
      ["When should I contact you after a loss?", "As early as possible, ideally before repairs, disposal of damaged property, or incomplete submissions."]
    ],
    related: ["general-insurance", "commercial-insurance", "policy-renewals", "risk-advisory"],
    ctaTitle: "Claim delayed, short-settled, or rejected?",
    ctaText: "Let our team review the papers and identify the next practical step."
  },
  "risk-advisory": {
    slug: "risk-advisory",
    icon: "analytics",
    eyebrow: "Risk Engineering",
    title: "Corporate Risk Advisory Services",
    seoTitle: "Corporate Risk Advisory Services Across India | BimaHeadquarter",
    description: "Identify insurance gaps, asset valuation issues, operational exposures, and risk-control priorities with corporate advisory support across India.",
    heroImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80",
    overview: [
      "Risk advisory helps businesses understand what can go wrong before a loss happens. It connects asset values, operational processes, compliance, insurance wording, and claim-readiness into one practical risk view.",
      "We support businesses with insurance gap audits, asset schedule reviews, risk-control suggestions, and policy alignment before renewal or expansion."
    ],
    audiences: ["SMEs and corporate teams", "Manufacturers and warehouses", "Businesses expanding locations", "Companies reviewing insurance spend"],
    benefits: [
      ["Coverage Gap Audit", "We compare existing insurance against real operational exposures."],
      ["Asset and Value Review", "We help identify under-insurance and missing schedules."],
      ["Risk-Control Priorities", "We suggest practical improvements that can support underwriting and claims."]
    ],
    faqs: [
      ["What is risk advisory?", "It is a structured review of business exposures, insurance gaps, asset values, and risk-control needs."],
      ["Is this only for large corporates?", "No. SMEs, warehouses, manufacturers, distributors, and service businesses can all benefit."],
      ["Can risk advisory reduce premium?", "It may help improve risk presentation, but the main goal is better coverage and fewer claim surprises."],
      ["When should we do a risk audit?", "Before renewal, expansion, asset purchase, new location setup, or after a major operational change."]
    ],
    related: ["commercial-insurance", "warehouse-insurance", "marine-insurance", "claims-assistance"],
    ctaTitle: "Want to see your hidden risk gaps?",
    ctaText: "Request a focused risk and insurance gap review."
  }
};

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
          "@id": `${SITE_URL}/#website`
        }
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
          url: SITE_URL
        },
        areaServed: {
          "@type": "Country",
          name: BUSINESS_DETAILS.serviceArea
        },
        serviceType: service.title
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/services/${service.slug}#faq`,
        mainEntity: service.faqs.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer
          }
        }))
      }
    ]
  };
}

export function getRelatedServices(service) {
  const bySlug = new Map(commonRelated.map((item) => [item.slug, item]));
  return service.related.map((slug) => bySlug.get(slug) || {
    title: servicesBySlug[slug].title,
    slug,
    icon: servicesBySlug[slug].icon
  });
}
