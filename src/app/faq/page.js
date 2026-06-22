"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Script from "next/script";
import PublicHeader from "@/app/components/public/PublicHeader";
import LandingEffects from "@/app/components/LandingEffects";
import PublicFooter from "@/app/components/public/PublicFooter";
import { BUSINESS_DETAILS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const faqs = [
  {
    id: "faq-1",
    category: "General & Consultation",
    question: "Who is BIMAHEADQUARTER and what is its role?",
    answer: "• What it is: BIMAHEADQUARTER is a professional insurance consulting and claim support brand operated by InsureDesk IMF Private Limited, an Insurance Marketing Firm licensed and regulated under the guidelines of the Insurance Regulatory and Development Authority of India (IRDAI).\n• Who needs it: Individual policyholders, families, commercial organizations, warehouse owners, transporters, manufacturers, and institutions seeking independent professional advice rather than transaction-focused sales agents.\n• Why it matters: The complexity of policy wordings, hidden deductibles, and claim documentation requirements makes it difficult for policyholders to understand their true coverage and rights, which can lead to unexpected out-of-pocket expenses or claim rejections.\n• How BIMAHEADQUARTER helps: Headquartered in Bhopal and serving clients across all states in India, we analyze policies, identify coverage gaps, and assist in compiling claim documents to ensure complete regulatory alignment."
  },
  {
    id: "faq-2",
    category: "General & Consultation",
    question: "What is the fee structure for BIMAHEADQUARTER's consultation services?",
    answer: "• What it is: BIMAHEADQUARTER operates on a zero-fee model for policyholders. We do not charge individuals or businesses any consulting, auditing, or review fees for our core advisory and claim guidance.\n• Who needs it: Any policyholder—whether an individual reviewing a health plan or a corporate logistics company auditing marine transit risks—who wants to verify coverage parameters without incurring upfront advisory bills.\n• Why it matters: Financial barriers should not prevent policyholders from obtaining professional advice on their risk coverage, especially when evaluating policies before a loss occurs.\n• How BIMAHEADQUARTER helps: We are compensated directly by our insurance partners via standard commission structures allowed under IRDAI regulations. You pay the exact premium set by the underwriter, with no service markups or hidden fees."
  },
  {
    id: "faq-3",
    category: "General & Consultation",
    question: "What is the primary operational focus of the brand?",
    answer: "• What it is: Our focus is strictly centered on insurance consulting, risk analysis, policy renewal tracking, and claim support. We do not distribute retail credit products, personal loans, or mutual funds.\n• Who needs it: Businesses, traders, transporters, and families who need an advisor focused solely on insurance risk mitigation rather than cross-selling other financial instruments.\n• Why it matters: Insurance risk mitigation is a technical specialty that requires full attention. Cross-selling unrelated financial products dilutes the expertise needed to analyze complex commercial policies and claims.\n• How BIMAHEADQUARTER helps: We direct all our resources, database infrastructure, and advisory personnel toward assessing policy wordings, calculating reinstatement values, tracking expirations, and drafting representation claims for clients nationwide."
  },
  {
    id: "faq-4",
    category: "General & Consultation",
    question: "How does BIMAHEADQUARTER differ from policy aggregators?",
    answer: "• What it is: Unlike automated aggregators that rely on algorithms to rank plans based solely on the lowest premium, BIMAHEADQUARTER is a consultation-driven risk advisory brand.\n• Who needs it: Policyholders who require a detailed understanding of policy terms, exclusions, room-rent capping, and deductible clauses rather than a quick transactional checkout.\n• Why it matters: Purchasing a policy based only on the premium can result in severe coverage gaps, meaning the policyholder may find their claim rejected during an actual loss due to overlooked clauses.\n• How BIMAHEADQUARTER helps: We look beyond premium prices. We review policy conditions, network hospital availability, and insurer service logs, and we assign a dedicated human consultant to assist with claim documentation and appeals if a claim is disputed."
  },
  {
    id: "faq-5",
    category: "Health Insurance",
    question: "How does cashless hospitalization work and how is it managed?",
    answer: "• What it is: Cashless hospitalization allows a policyholder to receive treatment at a network hospital without paying the medical bill directly, as the insurer settles it with the hospital according to policy terms.\n• Who needs it: Families, employees, and individual policyholders undergoing planned surgeries or facing medical emergencies who want to avoid paying large out-of-pocket deposits.\n• Why it matters: Delays in pre-authorization or query letters from Third-Party Administrators (TPAs) can delay medical procedures or force families to pay for treatment out of pocket and seek reimbursement later.\n• How BIMAHEADQUARTER helps: We guide clients through the documentation required for pre-authorization, coordinate with hospital TPA desks to resolve queries, and help compile the necessary medical history documents to keep the process moving."
  },
  {
    id: "faq-6",
    category: "Health Insurance",
    question: "What are room rent caps and sub-limits in health insurance?",
    answer: "• What it is: Room rent caps are limits on the daily room charges covered by a policy (e.g., 1% of sum insured). Sub-limits are caps on payout amounts for specific treatments like cataracts or joint replacements.\n• Who needs it: Individuals and families comparing health policies who want to avoid paying unexpected portions of their hospital bills.\n• Why it matters: If you choose a hospital room that exceeds your room rent limit, insurers apply a proportionate deduction, which reduces coverage for your entire bill—including doctor fees and diagnostic charges—proportionally.\n• How BIMAHEADQUARTER helps: We audit policy schedules to highlight hidden room rent limits and sub-limits, helping clients choose policies without these restrictive caps."
  },
  {
    id: "faq-7",
    category: "Health Insurance",
    question: "How do pre-existing disease (PED) waiting periods affect health coverage?",
    answer: "• What it is: A pre-existing disease is any health condition diagnosed or treated in the 48 months before purchasing a policy. Insurers apply a waiting period (commonly 1 to 4 years) before claims related to these diseases are covered.\n• Who needs it: Policyholders with chronic illnesses (such as diabetes or hypertension) who are purchasing or renewing health insurance.\n• Why it matters: Concealing a pre-existing condition during application violates the policy terms, which can lead to claim rejections and policy cancellation for non-disclosure.\n• How BIMAHEADQUARTER helps: We help clients document their medical history transparently during the proposal phase and compare waiting periods and PED riders across various insurers to find suitable options."
  },
  {
    id: "faq-8",
    category: "Motor Insurance",
    question: "What are the differences between comprehensive, own damage, and third-party motor insurance?",
    answer: "• What it is: Third-Party insurance covers legal liability for injury or property damage to others. Own Damage (OD) covers damage to your own vehicle. Comprehensive insurance combines both coverages into a single policy.\n• Who needs it: Vehicle owners, commercial transport operators, and fleet managers who want to understand their legal compliance and vehicle protection options.\n• Why it matters: Relying only on third-party insurance satisfies legal requirements but leaves the vehicle owner to bear the full cost of repairs or theft themselves.\n• How BIMAHEADQUARTER helps: We review your vehicle usage and recommend suitable comprehensive coverage options, along with relevant add-on riders like engine protection or roadside assistance."
  },
  {
    id: "faq-9",
    category: "Motor Insurance",
    question: "What is Zero Depreciation cover and why is it important?",
    answer: "• What it is: Zero Depreciation (or Bumper-to-Bumper) is an add-on rider that ensures the insurer pays the full cost of replaced parts (like plastic, glass, and metal) without deducting depreciation during a claim.\n• Who needs it: Owners of new cars or commercial vehicles (typically under 5 years old) who want to minimize repair costs after an accident.\n• Why it matters: Standard claims apply depreciation deductions of up to 50% on plastic, rubber, or metal parts, which can result in high out-of-pocket costs for the vehicle owner.\n• How BIMAHEADQUARTER helps: We verify the age and eligibility of your vehicle and help select policies with zero-depreciation coverage, explaining any exclusions like compulsory deductibles."
  },
  {
    id: "faq-10",
    category: "Motor Insurance",
    question: "How is the Insured Declared Value (IDV) determined?",
    answer: "• What it is: The Insured Declared Value (IDV) is the sum insured for a vehicle, calculated by applying a standard depreciation percentage to the manufacturer's selling price based on the vehicle's age.\n• Who needs it: Vehicle owners renewing their policies and fleet managers who want to ensure their vehicles are correctly valued.\n• Why it matters: Under-valuing a vehicle reduces the premium but results in lower compensation if the vehicle is stolen or suffers a total loss. Over-valuing increases the premium without increasing the payout, as insurers only settle up to the market value.\n• How BIMAHEADQUARTER helps: We calculate the correct IDV according to standard depreciation tables, helping you secure appropriate coverage without overpaying."
  },
  {
    id: "faq-11",
    category: "Commercial & Business",
    question: "What is the Reinstatement Value Clause (RVC) in commercial property insurance?",
    answer: "• What it is: The Reinstatement Value Clause (RVC) allows a business to claim the cost of replacing damaged assets with new ones of the same type, without deducting depreciation, provided the assets are actually replaced.\n• Who needs it: Manufacturers, warehouse operators, and businesses with significant investments in machinery, equipment, or building infrastructure.\n• Why it matters: Without RVC, claims are settled on a Market Value basis, where depreciation is deducted, leaving the business with insufficient funds to rebuild or purchase new machinery.\n• How BIMAHEADQUARTER helps: We review your asset registers to ensure the RVC is correctly applied to your property policies, protecting your capital investments."
  },
  {
    id: "faq-12",
    category: "Commercial & Business",
    question: "How should businesses protect inventory in storage and transit?",
    answer: "• What it is: Businesses protect inventory using Fire and Burglary insurance for storage locations, and Marine Transit insurance for goods in transit.\n• Who needs it: Traders, manufacturers, exporters, and warehouse owners managing stocks across multiple locations and transport routes.\n• Why it matters: Gaps between storage and transit coverage can lead to disputed claims if damage occurs during loading, unloading, or temporary storage at intermediate transit hubs.\n• How BIMAHEADQUARTER helps: We analyze your logistics flow and recommend structured storage and transit coverage options, including Marine-cum-Storage or Stock Declaration policies, to ensure continuous protection."
  },
  {
    id: "faq-13",
    category: "Commercial & Business",
    question: "What is under-insurance and how does the Condition of Average affect commercial claims?",
    answer: "• What it is: Under-insurance occurs when assets are insured for less than their replacement value. In this scenario, insurers apply the Condition of Average clause to reduce claim payouts proportionally.\n• Who needs it: Warehouse owners, factories, and commercial enterprises with high-value stock or capital equipment.\n• Why it matters: If assets worth ₹10 Crore are insured for ₹6 Crore (60% of value), the insurer will only pay 60% of any loss. A ₹2 Crore claim would result in a payout of only ₹1.2 Crore, requiring the business to absorb the rest.\n• How BIMAHEADQUARTER helps: We conduct asset reviews and help estimate replacement costs to set the correct sum insured, protecting your business from under-insurance penalties."
  },
  {
    id: "faq-14",
    category: "Claims Support & Ombudsman",
    question: "What immediate steps should be taken after a loss at a commercial site?",
    answer: "• What it is: The immediate recovery and registration process that must be followed after damage occurs at a business premises to satisfy policy conditions.\n• Who needs it: Warehouse managers, site supervisors, and business owners who need to preserve evidence and register claims correctly.\n• Why it matters: Failing to report a loss promptly or moving damaged stock before surveyor inspection can lead to claim delays or rejections due to lack of evidence.\n• How BIMAHEADQUARTER helps: We assist in registering the claim, guide you on how to document the scene with photos and videos, help list damaged inventory, and coordinate with the surveyor during their visit."
  },
  {
    id: "faq-15",
    category: "Claims Support & Ombudsman",
    question: "What recourse do policyholders have if a claim is rejected?",
    answer: "• What it is: The official process for appealing a claim rejection, starting with the insurer’s internal grievance department and escalating to the Insurance Ombudsman if needed.\n• Who needs it: Policyholders whose claims have been rejected or delayed by an insurer without clear justification.\n• Why it matters: Claim rejections are often open to review. Many arise from documentation errors or misinterpretations of policy terms that can be resolved through formal appeals.\n• How BIMAHEADQUARTER helps: We review the rejection letter against the policy terms, identify supporting evidence, and help draft formal representations to the insurer’s Grievance Redressal Officer."
  },
  {
    id: "faq-16",
    category: "Claims Support & Ombudsman",
    question: "How does the Insurance Ombudsman system operate in India?",
    answer: "• What it is: A quasi-judicial system established by the Government of India to resolve disputes between individual policyholders and insurers without cost to the complainant.\n• Who needs it: Individual policyholders or sole proprietors whose claims (under ₹30 Lakh) are rejected, delayed, or partially paid, and whose appeals to the insurer have failed.\n• Why it matters: It provides an accessible, lawyer-free dispute resolution path, saving policyholders from lengthy and expensive civil court proceedings.\n• How BIMAHEADQUARTER helps: We help prepare the complaint dossier, collect necessary documents and correspondence, and draft the case summary to present your case clearly."
  }
];

const categories = [
  { name: "All", icon: "apps" },
  { name: "General & Consultation", icon: "handshake" },
  { name: "Health Insurance", icon: "health_and_safety" },
  { name: "Motor Insurance", icon: "directions_car" },
  { name: "Commercial & Business", icon: "domain" },
  { name: "Claims Support & Ombudsman", icon: "gavel" }
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedFaqId, setExpandedFaqId] = useState(null);

  const toggleFaq = (id) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
      const cleanQuery = searchQuery.toLowerCase().trim();
      const matchesSearch =
        cleanQuery === "" ||
        faq.question.toLowerCase().includes(cleanQuery) ||
        faq.answer.toLowerCase().includes(cleanQuery);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const structuredData = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": `${SITE_URL}/faq#webpage`,
          url: `${SITE_URL}/faq`,
          name: `Frequently Asked Questions | ${SITE_NAME}`,
          headline: `Frequently Asked Questions about Insurance and Claims`,
          description: `Find expert answers to common insurance questions regarding claims support, renewals, commercial risks, and policy auditing in India.`,
          isPartOf: {
            "@id": `${SITE_URL}/#website`,
          },
          inLanguage: "en-IN",
        },
        {
          "@type": "FAQPage",
          "@id": `${SITE_URL}/faq#faqpage`,
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
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
          areaServed: BUSINESS_DETAILS.serviceArea,
        },
      ],
    };
  }, []);

  const highlightText = (text, query) => {
    const lines = text.split("\n");
    const escapedQuery = query.trim() ? query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
    const regex = escapedQuery ? new RegExp(`(${escapedQuery})`, "gi") : null;

    return lines.map((line, idx) => {
      const isBullet = line.startsWith("• ");
      let heading = "";
      let remainingText = line;

      if (isBullet) {
        const colonIndex = line.indexOf(":");
        if (colonIndex !== -1) {
          heading = line.substring(2, colonIndex + 1); // e.g. "What it is:"
          remainingText = line.substring(colonIndex + 1);
        }
      }

      const renderText = (content) => {
        if (!regex) return content;
        const parts = content.split(regex);
        return parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-100 text-primary font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        );
      };

      return (
        <p key={idx} className="mb-3 last:mb-0 text-gray-600 text-sm md:text-[15px] leading-relaxed">
          {isBullet ? (
            <>
              <strong style={{ color: "#031638", marginRight: "6px" }}>{heading}</strong>
              {renderText(remainingText)}
            </>
          ) : (
            renderText(remainingText)
          )}
        </p>
      );
    });
  };

  return (
    <>
      <LandingEffects />
      <Script
        id="faq-structured-data"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <style
        dangerouslySetInnerHTML={{
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

        .glass-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.4) 0%, transparent 50%);
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }

        .glass-card:hover::before {
            opacity: 1;
        }

        .glass-card:hover {
            transform: translateY(-2px);
            box-shadow: 0px 15px 35px rgba(26, 43, 78, 0.08);
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

        nav#mainNav.scrolled {
            height: 72px !important;
            background: linear-gradient(90deg, #F8FAFC 0%, #EEF4FF 50%, #F8FAFC 100%) !important;
            box-shadow: none !important;
            border: none !important;
        }

        .landing-page,
        .landing-page * {
            color: inherit !important;
        }

        .landing-page button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            transition: all 0.2s !important;
            border-radius: 0.75rem !important;
            font-weight: 600 !important;
        }

        .landing-page button.bg-primary {
            background-color: #031638 !important;
            color: #ffffff !important;
        }
        .landing-page button.bg-primary:hover {
            background-color: #0d2554 !important;
            color: #ffffff !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 10px 15px -3px rgba(3, 22, 56, 0.3) !important;
        }

        .landing-page button.bg-secondary {
            background-color: #1c6c39 !important;
            color: #ffffff !important;
        }

        .landing-page body,
        .landing-page .bg-background {
            background-color: #f8f9ff !important;
            color: #0b1c30 !important;
        }

        .landing-page h1,
        .landing-page h2,
        .landing-page h3,
        .landing-page h4 {
            color: #031638 !important;
        }

        /* Custom Vanilla Grid & Layout Setup */
        .faq-hero {
            position: relative;
            padding-top: 140px; /* Safe fixed nav clearance */
            padding-bottom: 40px;
            text-align: center;
            background: linear-gradient(180deg, rgba(229, 238, 255, 0.4) 0%, rgba(248, 249, 255, 1) 100%);
            width: 100%;
        }

        .faq-hero-inner {
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
        }

        .faq-badge-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 16px;
            border-radius: 9999px;
            background: rgba(28, 108, 57, 0.08);
            color: #1c6c39 !important;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 20px;
            letter-spacing: 0.5px;
        }

        .faq-title {
            font-size: 32px;
            font-weight: 800;
            color: #031638 !important;
            line-height: 1.2;
            margin: 0 0 16px 0;
        }

        @media (min-width: 768px) {
            .faq-title {
                font-size: 48px;
            }
        }

        .faq-tagline-sub {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1c6c39 !important;
            margin-top: -8px;
            margin-bottom: 20px;
            letter-spacing: 1px;
        }

        .faq-description {
            font-size: 16px;
            color: #4a5568 !important;
            max-width: 740px;
            margin: 0 0 24px 0;
            line-height: 1.6;
        }

        .faq-hero-meta-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            font-size: 13px;
            font-weight: 700;
            color: #031638 !important;
            margin-bottom: 32px;
            background: rgba(3, 22, 56, 0.05);
            padding: 8px 20px;
            border-radius: 9999px;
            flex-wrap: wrap;
        }

        .faq-hero-meta-row .dot {
            color: #c5c6cf !important;
            font-weight: 400;
        }

        .faq-search-wrapper {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            position: relative;
        }

        .faq-search-input {
            width: 100% !important;
            height: 56px !important;
            padding: 0 50px 0 54px !important;
            border-radius: 16px !important;
            background: #ffffff !important;
            border: 1px solid rgba(3, 22, 56, 0.12) !important;
            box-shadow: 0 8px 30px rgba(3, 22, 56, 0.04) !important;
            font-size: 15px !important;
            color: #1a2b4e !important;
            outline: none !important;
            transition: all 0.3s ease !important;
        }

        .faq-search-input:focus {
            border-color: #031638 !important;
            box-shadow: 0 8px 30px rgba(3, 22, 56, 0.08), 0 0 0 3px rgba(3, 22, 56, 0.05) !important;
        }

        .faq-search-icon {
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            color: #a0aec0;
            pointer-events: none;
            z-index: 10;
        }

        .faq-search-clear-btn {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            cursor: pointer;
            color: #a0aec0;
            padding: 4px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 10;
        }

        .faq-search-clear-btn:hover {
            background: rgba(0,0,0,0.05);
            color: #4a5568;
        }

        .faq-content-section {
            padding: 48px 24px 96px 24px;
            max-width: 1280px;
            margin: 0 auto;
            width: 100%;
        }

        .faq-layout-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 32px;
            align-items: start;
            width: 100%;
        }

        @media (min-width: 1024px) {
            .faq-layout-grid {
                grid-template-columns: 320px minmax(0, 1fr);
            }
        }

        /* Sidebar Styling */
        .faq-sidebar {
            background: #ffffff;
            border: 1px solid rgba(3, 22, 56, 0.08);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 4px 20px -2px rgba(26, 43, 78, 0.03);
            width: 100%;
        }

        .sidebar-pill {
            width: 100%;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            padding: 12px 16px !important;
            border-radius: 12px !important;
            background: transparent !important;
            border: 1px solid transparent !important;
            color: #4a5568 !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            transition: all 0.25s ease !important;
            text-align: left !important;
            gap: 12px !important;
            cursor: pointer;
        }

        .sidebar-pill.active {
            background: #031638 !important;
            color: #ffffff !important;
            box-shadow: 0 8px 20px -5px rgba(3, 22, 56, 0.2) !important;
        }

        .sidebar-pill.active .material-symbols-outlined,
        .sidebar-pill.active .badge {
            color: #ffffff !important;
        }

        .sidebar-pill .material-symbols-outlined {
            color: #718096;
            font-size: 20px;
            transition: color 0.25s ease;
        }

        .sidebar-pill:hover:not(.active) {
            background: rgba(3, 22, 56, 0.04) !important;
            color: #031638 !important;
            border-color: rgba(3, 22, 56, 0.08) !important;
        }

        .sidebar-pill:hover:not(.active) .material-symbols-outlined {
            color: #031638 !important;
        }

        .sidebar-pill .badge {
            margin-left: auto;
            font-size: 11px;
            font-weight: 700;
            background: rgba(3, 22, 56, 0.06);
            color: #4a5568 !important;
            padding: 2px 8px;
            border-radius: 10px;
            transition: all 0.25s ease;
        }

        .sidebar-pill.active .badge {
            background: rgba(255, 255, 255, 0.15) !important;
            color: #ffffff !important;
        }

        /* FAQ Accordion Item Styling */
        .faq-list-container {
            width: 100%;
        }

        .faq-card {
            background: #ffffff;
            border: 1px solid rgba(3, 22, 56, 0.07);
            border-radius: 16px;
            box-shadow: 0 4px 15px -2px rgba(26, 43, 78, 0.02);
            margin-bottom: 14px;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            overflow: hidden;
            position: relative;
            width: 100%;
        }

        .faq-card::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: #1c6c39; /* Secondary Green */
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .faq-card.open {
            border-color: rgba(3, 22, 56, 0.15);
            box-shadow: 0 10px 25px -5px rgba(26, 43, 78, 0.05);
            background: #fcfdfe;
        }

        .faq-card.open::after {
            opacity: 1;
        }

        .faq-card:hover:not(.open) {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px -4px rgba(26, 43, 78, 0.04);
            border-color: rgba(3, 22, 56, 0.12);
        }

        .faq-accordion-header {
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s ease;
        }

        .faq-accordion-panel {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), padding 0.35s ease;
        }

        .faq-accordion-panel.open {
            max-height: 1200px;
        }

        .faq-arrow {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .faq-arrow.rotated {
            transform: rotate(180deg);
        }

        .faq-category-label {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1c6c39 !important;
            background: rgba(28, 108, 57, 0.08);
            padding: 3px 10px;
            border-radius: 6px;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }

        /* CTA Section Styling */
        .faq-cta-card {
            position: relative;
            background: #031638;
            color: #ffffff !important;
            border-radius: 32px;
            padding: 64px 32px;
            text-align: center;
            overflow: hidden;
            margin-top: 64px;
            box-shadow: 0 20px 50px rgba(3, 22, 56, 0.15);
            width: 100%;
        }

        @media (min-width: 1024px) {
            .faq-cta-card {
                padding: 80px 64px;
            }
        }

        .faq-cta-card * {
            color: #ffffff !important;
        }

        .faq-cta-title {
            font-size: 32px;
            font-weight: 800;
            margin: 0 0 16px 0;
            line-height: 1.2;
        }

        @media (min-width: 768px) {
            .faq-cta-title {
                font-size: 44px;
            }
        }

        .faq-cta-description {
            font-size: 16px;
            opacity: 0.85;
            max-width: 600px;
            margin: 0 auto 36px auto;
            line-height: 1.6;
        }

        .faq-cta-buttons {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 16px;
        }

        .faq-cta-btn-primary {
            background: #1c6c39 !important;
            color: #ffffff !important;
            padding: 16px 32px !important;
            border-radius: 12px !important;
            font-weight: 700 !important;
            transition: all 0.25s ease !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(28, 108, 57, 0.25);
            cursor: pointer;
        }

        .faq-cta-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(28, 108, 57, 0.35);
        }

        .faq-cta-btn-secondary {
            background: #ffffff !important;
            color: #031638 !important;
            padding: 16px 32px !important;
            border-radius: 12px !important;
            font-weight: 700 !important;
            transition: all 0.25s ease !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px;
            cursor: pointer;
        }

        .faq-cta-btn-secondary:hover {
            transform: translateY(-2px);
            background: #f1f5f9 !important;
        }
      `,
        }}
      />

      <div className="landing-shell bg-background text-on-background font-body-md overflow-x-hidden min-h-screen">
        <PublicHeader />
        <main>
          {/* Hero / Header Section */}
          <header className="faq-hero">
            <div className="faq-hero-inner">
              <div className="entry-anim flex flex-col items-center w-full">
                <div className="faq-badge-pill">
                  <span
                    className="material-symbols-outlined text-[16px] text-secondary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  A Brand of InsureDesk IMF Private Limited
                </div>
                <h1 className="faq-title">
                  Frequently Asked <span className="text-secondary">Questions</span>
                </h1>
                <p className="faq-tagline-sub">
                  Insurance Consulting & Claim Assistance Across India
                </p>
                <p className="faq-description">
                  BIMAHEADQUARTER helps individuals, families, businesses, warehouses, transporters, and institutions make informed insurance decisions with professional consulting and claim support. Headquartered in Bhopal, we assist clients across India with motor, health, life, marine, warehouse, and commercial insurance solutions.
                </p>
                <div className="faq-hero-meta-row">
                  <span>10+ Insurance Partners</span>
                  <span className="dot">•</span>
                  <span>Expert Guidance</span>
                  <span className="dot">•</span>
                  <span>Claim Assistance</span>
                </div>

                {/* Search Bar Container */}
                <div className="faq-search-wrapper">
                  <span className="material-symbols-outlined faq-search-icon">
                    search
                  </span>
                  <input
                    id="faq-search-input"
                    type="text"
                    placeholder="Search by keyword, policy type, or claims query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="faq-search-input"
                    aria-label="Search frequently asked questions"
                  />
                  {searchQuery && (
                    <button
                      id="faq-search-clear"
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="faq-search-clear-btn"
                      aria-label="Clear search"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Layout Container (Side-by-Side) */}
          <section className="faq-content-section">
            <div className="faq-layout-grid">
              
              {/* Left Column: Category Sidebar (Sticky on Desktop) */}
              <aside className="entry-anim">
                <div className="faq-sidebar">
                  <h2 className="font-bold text-primary text-[14px] mb-4 uppercase tracking-wider opacity-75" style={{ color: "#031638" }}>
                    Filter by Category
                  </h2>
                  <div className="space-y-1.5" role="tablist" aria-label="FAQ Categories">
                    {categories.map((cat) => {
                      const count = cat.name === "All"
                        ? faqs.length
                        : faqs.filter((f) => f.category === cat.name).length;
                      const isActive = activeCategory === cat.name;

                      return (
                        <button
                          key={cat.name}
                          id={`category-tab-${cat.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                          onClick={() => {
                            setActiveCategory(cat.name);
                            setExpandedFaqId(null);
                          }}
                          className={`sidebar-pill ${isActive ? "active" : ""}`}
                          role="tab"
                          aria-selected={isActive}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            {cat.icon}
                          </span>
                          <span>{cat.name}</span>
                          <span className="badge">{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h3 className="font-semibold text-primary text-[14px] mb-2" style={{ color: "#031638" }}>Need Expert Help?</h3>
                    <p className="text-gray-500 text-xs leading-relaxed mb-4">
                      Our advisory team reviews current policies for potential risks and gaps at zero charge.
                    </p>
                    <Link
                      href="/contact"
                      className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary/95 text-white font-semibold text-xs rounded-xl shadow-md transition-all text-center"
                      style={{ background: "#1c6c39", color: "#ffffff" }}
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Get Free Audit
                    </Link>
                  </div>
                </div>
              </aside>

              {/* Right Column: FAQ Accordion List */}
              <div className="faq-list-container" id="faq-list-container">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq) => {
                    const isOpen = expandedFaqId === faq.id;
                    return (
                      <article
                        key={faq.id}
                        className={`faq-card ${isOpen ? "open" : ""}`}
                      >
                        <div
                          id={`faq-header-${faq.id}`}
                          onClick={() => toggleFaq(faq.id)}
                          className="faq-accordion-header flex justify-between items-start p-6 md:p-7 gap-4"
                          role="button"
                          aria-expanded={isOpen}
                          aria-controls={`faq-panel-${faq.id}`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleFaq(faq.id);
                            }
                          }}
                        >
                          <div className="flex flex-col items-start pr-2">
                            <span className="faq-category-label">{faq.category}</span>
                            <h3 className="font-bold text-[16px] md:text-[18px] text-primary leading-snug text-left mt-1" style={{ color: "#031638" }}>
                              {highlightText(faq.question, searchQuery)}
                            </h3>
                          </div>
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary-container/10 flex items-center justify-center text-primary mt-4" style={{ background: "rgba(165, 245, 179, 0.25)" }}>
                            <span
                              className={`material-symbols-outlined text-[20px] faq-arrow ${
                                isOpen ? "rotated" : ""
                              }`}
                              style={{ color: "#1c6c39" }}
                            >
                              keyboard_arrow_down
                            </span>
                          </div>
                        </div>
                        <div
                          id={`faq-panel-${faq.id}`}
                          className={`faq-accordion-panel ${isOpen ? "open" : ""}`}
                          role="region"
                          aria-labelledby={`faq-header-${faq.id}`}
                        >
                          <div className="px-6 pb-6 md:px-7 md:pb-7 text-gray-600 text-sm md:text-[15px] leading-relaxed border-t border-gray-50 pt-5">
                            {highlightText(faq.answer, searchQuery)}
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="text-center py-16 bg-white rounded-3xl border border-outline-variant/10 shadow-sm px-6">
                    <span className="material-symbols-outlined text-[48px] text-gray-300 mb-4">
                      search_off
                    </span>
                    <h3 className="font-semibold text-lg text-primary mb-2" style={{ color: "#031638" }}>No matching questions found</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                      We couldn't find any questions matching "{searchQuery}" in our {activeCategory} section. Try adjusting your keywords or clearing the search box.
                    </p>
                    <button
                      id="reset-filters-btn"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory("All");
                      }}
                      className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all"
                      style={{ background: "#031638", color: "#ffffff" }}
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* CTA Banner */}
            <div className="faq-cta-card reveal" id="cta-banner">
              <div className="absolute inset-0 -z-10 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
              </div>
              <h2 className="faq-cta-title">
                Still Have Questions?
              </h2>
              <p className="faq-cta-description">
                If you couldn't find the answers you were looking for, or if you need immediate claims assistance or corporate advisory support, connect with us today. <strong>Consultations are 100% free.</strong>
              </p>
              <div className="faq-cta-buttons">
                <a
                  href={`tel:${BUSINESS_DETAILS.phoneHref}`}
                  id="cta-faq-call"
                  className="faq-cta-btn-primary"
                >
                  <span className="material-symbols-outlined">call</span> Call Us: {BUSINESS_DETAILS.phone}
                </a>
                <a
                  href={`mailto:${BUSINESS_DETAILS.email}`}
                  id="cta-faq-email"
                  className="faq-cta-btn-secondary"
                >
                  <span className="material-symbols-outlined">mail</span> Email Our Experts
                </a>
              </div>
            </div>

          </section>
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
