"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  AlertCircle,
  Check,
  Lock,
  ArrowUpRight,
  Send,
  Star,
  Copy,
  Share2,
  Compass,
} from "lucide-react";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import LandingEffects from "@/app/components/LandingEffects";
import { BRAND_CONFIG, DEFAULT_GOOGLE_REVIEW_URL, TRANSLATIONS, WHATSAPP_REVIEW_TEMPLATE_HINDI } from "@/lib/review/config";

export default function ReviewPageClient({ initialCampaign = "direct", initialSource = "web", initialChannel = "web" }) {
  const [lang, setLang] = useState("en");

  // Private feedback form state
  const [feedbackCategory, setFeedbackCategory] = useState("Claim Issue");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackConsent, setFeedbackConsent] = useState(true);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  // Copy link state
  const [copiedLink, setCopiedLink] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Track initial page view with sessionStorage deduplication
  useEffect(() => {
    try {
      const storageKey = `bhq_review_viewed_${initialCampaign}`;
      const alreadyTracked = window.sessionStorage.getItem(storageKey);

      if (!alreadyTracked) {
        fetch("/api/review/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "review_page_view",
            campaign: initialCampaign,
            source: initialSource,
            channel: initialChannel,
            lang,
          }),
        }).catch(() => {});
        window.sessionStorage.setItem(storageKey, "1");
      }
    } catch {
      // Safe fallback
    }
  }, [initialCampaign, initialSource, initialChannel, lang]);

  const handleLangToggle = (newLang) => {
    setLang(newLang);
    fetch("/api/review/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "review_lang_toggle",
        campaign: initialCampaign,
        source: initialSource,
        channel: initialChannel,
        lang: newLang,
      }),
    }).catch(() => {});
  };

  const handleGoogleReviewClick = () => {
    fetch("/api/review/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "review_google_click",
        campaign: initialCampaign,
        source: initialSource,
        channel: initialChannel,
        lang,
      }),
    }).catch(() => {});

    window.open(DEFAULT_GOOGLE_REVIEW_URL, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    const url = BRAND_CONFIG.shortcutRedirectUrl;
    if (typeof window !== "undefined" && window.navigator?.clipboard?.writeText) {
      window.navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const text =
      lang === "hi"
        ? WHATSAPP_REVIEW_TEMPLATE_HINDI
        : `Review Bima Headquarter on Google: ${BRAND_CONFIG.shortcutRedirectUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handlePrivateFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackError("");

    if (!feedbackMessage.trim() || feedbackMessage.trim().length < 5) {
      setFeedbackError(lang === "hi" ? "कृपया कम से कम 5 अक्षरों का संदेश लिखें।" : "Please enter at least 5 characters in your note.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/review/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feedbackName,
          contact: feedbackContact,
          message: `[Category: ${feedbackCategory}] ${feedbackMessage}`,
          consent: feedbackConsent,
          campaign: initialCampaign,
          honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setFeedbackSubmitted(true);
      fetch("/api/review/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "review_private_feedback_submit",
          campaign: initialCampaign,
          source: initialSource,
          channel: initialChannel,
          lang,
        }),
      }).catch(() => {});
    } catch (err) {
      setFeedbackError(err.message || "An error occurred while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <LandingEffects />

      {/* Bulletproof Scoped CSS guaranteeing exact multi-column layouts across all screen resolutions */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap');

        .bhq-page-wrap {
          background-color: #FBF9F5 !important;
          color: #171A19 !important;
          font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif !important;
          min-height: 100vh !important;
        }

        .bhq-serif {
          font-family: 'Newsreader', Georgia, serif !important;
        }

        /* Responsive 2-Track Grid: Equal balanced desks on tablet & desktop */
        .bhq-tracks-container {
          display: grid !important;
          gap: 28px !important;
          align-items: stretch !important;
        }
        @media (min-width: 960px) {
          .bhq-tracks-container {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 959px) {
          .bhq-tracks-container {
            grid-template-columns: 1fr !important;
          }
        }

        /* 3-Benefit Trio inside Track A */
        .bhq-trio-row {
          display: grid !important;
          gap: 12px !important;
          margin-bottom: 24px !important;
        }
        @media (min-width: 540px) {
          .bhq-trio-row {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 539px) {
          .bhq-trio-row {
            grid-template-columns: 1fr !important;
          }
        }

        /* 4-Column Statutory Commitments Grid */
        .bhq-commitments-grid {
          display: grid !important;
          gap: 20px !important;
        }
        @media (min-width: 1024px) {
          .bhq-commitments-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
        @media (min-width: 600px) and (max-width: 1023px) {
          .bhq-commitments-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 599px) {
          .bhq-commitments-grid {
            grid-template-columns: 1fr !important;
          }
        }

        /* 2-Column FAQ Grid */
        .bhq-faq-row {
          display: grid !important;
          gap: 20px !important;
        }
        @media (min-width: 720px) {
          .bhq-faq-row {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 719px) {
          .bhq-faq-row {
            grid-template-columns: 1fr !important;
          }
        }

        /* Primary Google Review CTA Button: Solid dark background with light cream text */
        .bhq-btn-forest-cta {
          background-color: #0B261E !important;
          color: #F5F2EA !important;
          border: 0 !important;
          border-radius: 10px !important;
          padding: 14px 24px !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          width: 100% !important;
          box-shadow: 0 2px 6px rgba(11, 38, 30, 0.2) !important;
          cursor: pointer !important;
          outline: none !important;
          transition: transform 0.15s ease, box-shadow 0.15s ease !important;
        }
        .bhq-btn-forest-cta:hover {
          background-color: #0E362B !important;
          color: #F5F2EA !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 16px rgba(11, 38, 30, 0.3) !important;
        }
        .bhq-btn-forest-cta:active {
          background-color: #081d17 !important;
          color: #F5F2EA !important;
          transform: scale(0.99) !important;
          box-shadow: 0 2px 4px rgba(11, 38, 30, 0.2) !important;
        }
        .bhq-btn-forest-cta:focus-visible {
          outline: 2px solid #A47D2C !important;
          outline-offset: 2px !important;
        }
        .bhq-btn-forest-cta *,
        .bhq-btn-forest-cta span,
        .bhq-btn-forest-cta svg {
          color: #F5F2EA !important;
          stroke: #F5F2EA !important;
        }

        /* Secondary actions: Clean light background with dark text */
        .bhq-btn-tool {
          background-color: #ffffff !important;
          border: 1px solid #D6D0C2 !important;
          color: #171A19 !important;
          border-radius: 10px !important;
          padding: 12px 16px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          cursor: pointer !important;
          outline: none !important;
          transition: transform 0.15s ease, background-color 0.1s ease !important;
        }
        .bhq-btn-tool:hover {
          background-color: #F5F2EA !important;
          border-color: #B8B0A0 !important;
          color: #0B261E !important;
        }
        .bhq-btn-tool:active {
          background-color: #ECE7DA !important;
          transform: scale(0.98) !important;
        }
        .bhq-btn-tool:focus-visible {
          outline: 2px solid #0B261E !important;
          outline-offset: 1px !important;
        }
        .bhq-btn-tool svg {
          color: inherit !important;
          stroke: currentColor !important;
        }
        .bhq-btn-tool-copied {
          background-color: #ECFDF5 !important;
          border-color: #10B981 !important;
          color: #065F46 !important;
        }
        .bhq-btn-tool-copied svg {
          color: #059669 !important;
          stroke: #059669 !important;
        }

        /* Card styles */
        .bhq-card-white {
          background-color: #ffffff !important;
          border: 1px solid #E6E2D8 !important;
          border-radius: 16px !important;
          box-shadow: 0 1px 3px rgba(17, 24, 20, 0.04), 0 4px 12px rgba(17, 24, 20, 0.03) !important;
        }
        .bhq-card-cream {
          background-color: rgba(245, 242, 234, 0.75) !important;
          border: 1px solid #E6E2D8 !important;
          border-radius: 16px !important;
          box-shadow: 0 1px 3px rgba(17, 24, 20, 0.04), 0 4px 12px rgba(17, 24, 20, 0.03) !important;
        }

        /* Category Selection Pills */
        .bhq-cat-pill {
          padding: 8px 10px !important;
          border-radius: 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          text-align: center !important;
          cursor: pointer !important;
          border-width: 1px !important;
          border-style: solid !important;
          user-select: none !important;
          outline: none !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: transform 0.12s ease !important;
        }
        .bhq-cat-selected,
        .bhq-cat-selected:hover,
        .bhq-cat-selected:focus,
        .bhq-cat-selected:active {
          background-color: #0B261E !important;
          color: #F5F2EA !important;
          border-color: #0B261E !important;
          box-shadow: 0 1px 3px rgba(11, 38, 30, 0.2) !important;
        }
        .bhq-cat-unselected {
          background-color: #ffffff !important;
          color: #374151 !important;
          border-color: #D6D0C2 !important;
        }
        .bhq-cat-unselected:hover {
          background-color: #F5F2EA !important;
          color: #0B261E !important;
          border-color: #B8B0A0 !important;
        }
        .bhq-cat-unselected:active {
          background-color: #ECE7DA !important;
          color: #0B261E !important;
          transform: scale(0.98) !important;
        }
        .bhq-cat-unselected:focus-visible {
          outline: 2px solid #0B261E !important;
          outline-offset: 1px !important;
        }

        /* Language Toggle Buttons */
        .bhq-lang-btn {
          padding: 4px 10px !important;
          border-radius: 6px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          border: 1px solid transparent !important;
          outline: none !important;
          transition: transform 0.12s ease !important;
        }
        .bhq-lang-btn-selected,
        .bhq-lang-btn-selected:hover,
        .bhq-lang-btn-selected:focus,
        .bhq-lang-btn-selected:active {
          background-color: #0B261E !important;
          color: #F5F2EA !important;
          border-color: #0B261E !important;
          box-shadow: 0 1px 2px rgba(11, 38, 30, 0.15) !important;
        }
        .bhq-lang-btn-unselected {
          background-color: transparent !important;
          color: #525854 !important;
        }
        .bhq-lang-btn-unselected:hover {
          background-color: rgba(255, 255, 255, 0.7) !important;
          color: #0B261E !important;
        }
        .bhq-lang-btn-unselected:active {
          background-color: rgba(255, 255, 255, 0.95) !important;
        }
        .bhq-lang-btn-unselected:focus-visible {
          outline: 2px solid #0B261E !important;
          outline-offset: 1px !important;
        }

        /* Executive Form Submit Button */
        .bhq-btn-submit-leadership {
          background-color: #0B261E !important;
          color: #F5F2EA !important;
          border: 0 !important;
          border-radius: 10px !important;
          padding: 12px 20px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          letter-spacing: 0.02em !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          cursor: pointer !important;
          box-shadow: 0 1px 3px rgba(11, 38, 30, 0.2) !important;
          outline: none !important;
          transition: transform 0.15s ease, box-shadow 0.15s ease !important;
        }
        .bhq-btn-submit-leadership:hover:not(:disabled) {
          background-color: #0E362B !important;
          color: #F5F2EA !important;
          box-shadow: 0 4px 10px rgba(11, 38, 30, 0.25) !important;
        }
        .bhq-btn-submit-leadership:active:not(:disabled) {
          background-color: #081d17 !important;
          color: #F5F2EA !important;
          transform: scale(0.99) !important;
        }
        .bhq-btn-submit-leadership:focus-visible {
          outline: 2px solid #A47D2C !important;
          outline-offset: 2px !important;
        }
        .bhq-btn-submit-leadership:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        .bhq-btn-submit-leadership *,
        .bhq-btn-submit-leadership svg {
          color: #F5F2EA !important;
          stroke: #F5F2EA !important;
        }
      `}} />

      <div className="landing-shell bhq-page-wrap flex flex-col justify-between antialiased">
        {/* Official Website Navigation Header */}
        <PublicHeader />

        {/* ─── MAIN CONTENT CONTAINER ─── */}
        <main className="flex-grow w-full max-w-[1360px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8 sm:py-12 space-y-12 sm:space-y-16">
          
          {/* ─── 1. HERO SECTION: EDITORIAL DIGNITY ─── */}
          <section className="max-w-4xl mx-auto text-center space-y-4 pt-2">
            {/* Eyebrow Seal with Language Toggle */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E6E2D8] bg-white text-[11px] tracking-[0.14em] uppercase text-[#525854] font-medium shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A47D2C]" />
                {lang === "hi" ? "ग्राहक अनुभव एवं संरक्षण डेस्क" : "Client Experience & Fiduciary Advocacy Desk"}
              </div>

              {/* Discreet Language Selector */}
              <div className="inline-flex items-center p-0.5 rounded-lg border border-[#E6E2D8] bg-[#F5F2EA] text-xs" role="tablist" aria-label="Language selection">
                <button
                  type="button"
                  role="tab"
                  aria-selected={lang === "en"}
                  onClick={() => handleLangToggle("en")}
                  className={`bhq-lang-btn ${
                    lang === "en" ? "bhq-lang-btn-selected" : "bhq-lang-btn-unselected"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={lang === "hi"}
                  onClick={() => handleLangToggle("hi")}
                  className={`bhq-lang-btn ${
                    lang === "hi" ? "bhq-lang-btn-selected" : "bhq-lang-btn-unselected"
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>

            {/* Editorial Headline in Newsreader Serif */}
            <h1 className="text-3xl sm:text-5xl md:text-[52px] bhq-serif font-normal text-[#0B261E] tracking-tight leading-[1.12]">
              {lang === "hi"
                ? "आपका सच्चा अनुभव तय करता है कि भारत में सही बीमा कैसे चुना जाए।"
                : "Your genuine experience shapes how India buys insurance."}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-[#525854] font-normal leading-relaxed max-w-2xl mx-auto">
              {lang === "hi"
                ? "कोई प्रायोजित रैंकिंग नहीं। कोई विवाद छिपाना नहीं। अनफ़िल्टर्ड ग्राहक रिव्यू स्थानीय पॉलिसीधारकों की रक्षा करते हैं, अस्पष्ट शर्तों को उजागर करते हैं और बीमा कंपनियों के क्लेम विभागों को जवाबदेह बनाते हैं।"
                : "No sponsored rankings. No hidden dispute filtering. Unfiltered client reviews defend local policyholders, illuminate opaque fine print, and hold insurer claim departments accountable."}
            </p>

            {/* Google Rating Seal */}
            <div className="pt-1 flex items-center justify-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-white border border-[#E6E2D8] shadow-2xs">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <div className="h-3.5 w-px bg-[#E6E2D8]" />
                <div className="flex items-center gap-1.5 text-xs text-[#171A19]">
                  <span className="font-bold text-sm tracking-tight bhq-serif text-[#0B261E]">4.9</span>
                  <div className="flex text-[#D97706] text-[11px] gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={11} className="fill-[#D97706] text-[#D97706]" />
                    ))}
                  </div>
                  <span className="text-[#525854] text-[11px] font-normal pl-0.5">
                    {lang === "hi" ? "250+ सत्यापित पॉलिसीधारक" : "over 250+ verified policyholders"}
                  </span>
                </div>
                <div className="h-3.5 w-px bg-[#E6E2D8] hidden sm:block" />
                <span className="text-[10px] font-semibold text-[#0E362B] tracking-wider uppercase bg-[#F2F7F4] px-2 py-0.5 rounded border border-[#0E362B]/15 hidden sm:inline-block">
                  Verified Public Profile
                </span>
              </div>
            </div>
          </section>

          {/* ─── 2. TWO CLEAR, DISTINGUISHED PATHS (SIDE-BY-SIDE ON DESKTOP) ─── */}
          <section className="bhq-tracks-container pt-1">
            
            {/* PATH A: PUBLIC GOOGLE REVIEW (PRIMARY DESK) */}
            <div className="bhq-card-white p-6 sm:p-8 lg:p-9 flex flex-col justify-between">
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-[#E6E2D8]">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-[#8A6822] bg-[#FAF7EE] px-2.5 py-0.5 rounded border border-[#EBDDBF]">
                      Primary Track
                    </span>
                    <span className="text-xs font-medium text-[#525854]">Public Google Review Desk</span>
                  </div>
                  <span className="text-[10px] tracking-wider font-semibold text-emerald-800 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Unmoderated
                  </span>
                </div>

                {/* Section Title */}
                <h2 className="text-2xl sm:text-3xl bhq-serif font-normal text-[#0B261E] tracking-tight mb-2">
                  {lang === "hi" ? "गूगल पर अपना रिव्यू लिखें" : "Write your review on Google"}
                </h2>
                <p className="text-[#525854] text-xs sm:text-sm leading-relaxed mb-5 font-normal">
                  {lang === "hi"
                    ? "हमारे भोपाल परामर्श डेस्क के साथ अपने अनुभव को साझा करने में केवल 30 सेकंड का समय दें। आपका दृष्टिकोण भ्रामक बहिष्करणों को रोकता है और साथी परिवारों को जागरूक होकर बीमा चुनने में मदद करता है।"
                    : "Take 30 seconds to share your encounter with our Bhopal advisory desk. Your perspective prevents deceptive exclusions and helps neighbouring families choose coverage with eyes wide open."}
                </p>

                {/* Consultation Topics Pill Box */}
                <div className="p-3.5 rounded-xl bg-[#F5F2EA]/60 border border-[#E6E2D8] mb-5 space-y-2">
                  <p className="text-xs font-semibold text-[#0B261E] flex items-center gap-2">
                    <Compass size={13} className="text-[#8A6822]" />
                    <span>{lang === "hi" ? "परामर्श में क्या सबसे उल्लेखनीय था?" : "What was most notable about your consultation?"}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="px-2.5 py-1 rounded bg-white text-[#525854] border border-[#E6E2D8] text-[11px]">
                      Claim Settlement Speed
                    </span>
                    <span className="px-2.5 py-1 rounded bg-white text-[#525854] border border-[#E6E2D8] text-[11px]">
                      Zero Hidden Deductibles
                    </span>
                    <span className="px-2.5 py-1 rounded bg-white text-[#525854] border border-[#E6E2D8] text-[11px]">
                      Policy Wording Audit
                    </span>
                    <span className="px-2.5 py-1 rounded bg-white text-[#525854] border border-[#E6E2D8] text-[11px]">
                      Danish Nagar Desk Courtesy
                    </span>
                  </div>
                </div>

                {/* Benefits Trio Row */}
                <div className="bhq-trio-row">
                  <div className="p-3 rounded-xl border border-[#E6E2D8] bg-[#FBF9F5]">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#0B261E] mb-1">
                      Under 45 Seconds
                    </span>
                    <p className="text-[#525854] text-[11px] leading-snug">
                      Direct 1-click star rating and open feedback field.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-[#E6E2D8] bg-[#FBF9F5]">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#0B261E] mb-1">
                      Directly Public
                    </span>
                    <p className="text-[#525854] text-[11px] leading-snug">
                      Zero gating, zero pre-moderation, completely unedited.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-[#E6E2D8] bg-[#FBF9F5]">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#0B261E] mb-1">
                      Community Defense
                    </span>
                    <p className="text-[#525854] text-[11px] leading-snug">
                      Guides local Madhya Pradesh policyholders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Base Area */}
              <div className="pt-4 border-t border-[#E6E2D8] space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                  <button
                    type="button"
                    onClick={handleGoogleReviewClick}
                    className="bhq-btn-forest-cta flex-1"
                  >
                    <span>{t.googleButtonCta}</span>
                    <ArrowUpRight size={14} />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      title="Share via WhatsApp"
                      className="bhq-btn-tool"
                    >
                      <Share2 size={13} className="text-emerald-700" />
                      <span>Share</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      title="Copy Direct URL"
                      className={`bhq-btn-tool ${copiedLink ? "bhq-btn-tool-copied" : ""}`}
                    >
                      {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedLink ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Mobile QR Companion Strip */}
                <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#E6E2D8] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded border border-[#E6E2D8] bg-white p-1 flex items-center justify-center shrink-0">
                      <Image
                        src={`/api/review/qr?c=${initialCampaign}&format=svg`}
                        alt="Mobile Scan QR"
                        width={28}
                        height={28}
                        unoptimized
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-[#0B261E] text-xs">
                        {lang === "hi" ? "फोन से रिव्यू देना पसंद करेंगे?" : "Prefer reviewing on mobile?"}
                      </p>
                      <p className="text-[11px] text-[#525854]">
                        Scan with camera or visit <span className="font-mono text-[#0E362B] font-semibold">bimaheadquarter.com/r</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#525854] bg-[#E6E2D8]/60 px-2 py-1 rounded">
                    Camera Scan
                  </span>
                </div>
              </div>
            </div>

            {/* PATH B: PRIVATE OMBUDSMAN & LEADERSHIP DESK */}
            <div className="bhq-card-cream p-6 sm:p-8 lg:p-9 flex flex-col justify-between">
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-[#E6E2D8]">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-[#0E362B] bg-[#E7EFEA] px-2.5 py-0.5 rounded border border-[#0E362B]/15">
                      Path B • Confidential
                    </span>
                  </div>
                  <span className="text-[10px] tracking-wider font-mono text-[#525854] flex items-center gap-1">
                    <Lock size={10} className="text-[#144638]" />
                    <span>MD Desk</span>
                  </span>
                </div>

                <h2 className="text-2xl bhq-serif font-normal text-[#0B261E] tracking-tight mb-2">
                  {lang === "hi" ? "गोपनीय प्रबंधन संदेश" : "Private Executive Note"}
                </h2>
                <p className="text-[#525854] text-xs leading-relaxed mb-4">
                  {lang === "hi"
                    ? "क्लेम विवाद, असंतोष या संवेदनशील फीडबैक सीधे प्रबंध निदेशक (MD) एवं कार्यकारी निरीक्षण समिति तक पहुंचाएं।"
                    : "Share confidential claim grievances, disputes, or sensitive feedback directly with the Managing Director & Executive Oversight Committee."}
                </p>

                {/* Category Selector */}
                <div className="mb-4">
                  <span className="block text-[11px] font-semibold tracking-wider uppercase text-[#525854] mb-1.5">
                    Subject Classification
                  </span>
                  <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="Subject Classification">
                    {["Claim Issue", "Advisor Praise", "Policy Audit"].map((cat) => {
                      const isSelected = feedbackCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => setFeedbackCategory(cat)}
                          className={`bhq-cat-pill ${
                            isSelected ? "bhq-cat-selected" : "bhq-cat-unselected"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Structured Form */}
                {feedbackSubmitted ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2 animate-in fade-in">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
                      <CheckCircle2 size={20} />
                    </div>
                    <h4 className="text-sm font-semibold text-emerald-950">
                      {t.feedbackSuccessTitle}
                    </h4>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      {t.feedbackSuccessMessage}
                    </p>
                    <p className="text-[11px] text-emerald-700 pt-1 font-medium">
                      Addressed personally within 24 working hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handlePrivateFeedbackSubmit} className="space-y-3">
                    {/* Honeypot Spam Trap */}
                    <input
                      type="text"
                      name="website_url"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      style={{ display: "none" }}
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    {feedbackError && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{feedbackError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0B261E] mb-1">
                          Your Name <span className="text-[#525854]/60 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={feedbackName}
                          onChange={(e) => setFeedbackName(e.target.value)}
                          placeholder="e.g. Anand Verma"
                          maxLength={100}
                          className="w-full text-xs rounded-lg bg-white border border-[#E6E2D8] text-[#171A19] placeholder:text-stone-400 py-2 px-3 focus:outline-hidden focus:border-[#144638] transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#0B261E] mb-1">
                          Phone or Email <span className="text-[#525854]/60 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={feedbackContact}
                          onChange={(e) => setFeedbackContact(e.target.value)}
                          placeholder="For response"
                          maxLength={100}
                          className="w-full text-xs rounded-lg bg-white border border-[#E6E2D8] text-[#171A19] placeholder:text-stone-400 py-2 px-3 focus:outline-hidden focus:border-[#144638] transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#0B261E] mb-1">
                        Confidential Note / Experience *
                      </label>
                      <textarea
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Please describe any claim dispute, delay, recommendation, or commendation..."
                        required
                        rows={3}
                        maxLength={2000}
                        className="w-full text-xs rounded-lg bg-white border border-[#E6E2D8] text-[#171A19] placeholder:text-stone-400 py-2 px-3 focus:outline-hidden focus:border-[#144638] transition"
                      />
                      <div className="flex items-center justify-between text-[10px] text-[#525854]/80 mt-1">
                        <span>Encrypted delivery • Never shared publicly</span>
                        <span>Direct to Leadership</span>
                      </div>
                    </div>

                    {/* Strict Controlled Checkbox to avoid CSS blowout */}
                    <div className="pt-0.5 flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="bhq-feedback-consent"
                        checked={feedbackConsent}
                        onChange={(e) => setFeedbackConsent(e.target.checked)}
                        style={{
                          width: "16px",
                          height: "16px",
                          minWidth: "16px",
                          maxWidth: "16px",
                          minHeight: "16px",
                          maxHeight: "16px",
                          margin: "2px 0 0 0",
                          accentColor: "#0B261E",
                          cursor: "pointer",
                        }}
                      />
                      <label htmlFor="bhq-feedback-consent" className="text-[11px] text-[#525854] cursor-pointer leading-snug">
                        Deliver confidentially to Bima Headquarter Ombudsman &amp; Leadership Oversight.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="bhq-btn-submit-leadership w-full"
                    >
                      <Send size={13} />
                      <span>{submitting ? "Sending..." : "Send Directly to Leadership"}</span>
                    </button>
                  </form>
                )}
              </div>

              <p className="text-[10px] text-[#525854]/80 text-center font-normal pt-3 mt-3 border-t border-[#E6E2D8]">
                Addressed personally within 24 working hours. Both tracks are independent.
              </p>
            </div>
          </section>

          {/* ─── 3. CORE STATUTORY COMMITMENTS (4-COLUMN GRID) ─── */}
          <section className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#E6E2D8] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#8A6822] block mb-0.5">
                  Institutional Principles
                </span>
                <h3 className="text-xl sm:text-2xl bhq-serif text-[#0B261E] font-normal">
                  Our statutory commitments to every policyholder
                </h3>
              </div>
              <span className="text-xs text-[#525854] mt-1 sm:mt-0 font-medium">
                Audited Intermediary Governance
              </span>
            </div>

            <div className="bhq-commitments-grid">
              {/* Pillar 1 */}
              <div className="p-6 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xs flex flex-col justify-between min-h-[190px]">
                <div>
                  <div className="w-7 h-7 rounded border border-[#E6E2D8] bg-[#F5F2EA] flex items-center justify-center text-[#0E362B] text-xs mb-3 font-mono font-bold">
                    01
                  </div>
                  <h4 className="text-sm font-semibold text-[#0B261E] mb-1">Strict Zero Gating</h4>
                  <p className="text-xs text-[#525854] leading-relaxed">
                    We never conceal negative feedback, intercept unhappy policyholders, or manipulate public reviews. Sovereign transparency is sacred.
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#0E362B] font-semibold pt-3 mt-3 border-t border-[#E6E2D8]/60">
                  Unfiltered Ledger
                </span>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xs flex flex-col justify-between min-h-[190px]">
                <div>
                  <div className="w-7 h-7 rounded border border-[#E6E2D8] bg-[#F5F2EA] flex items-center justify-center text-[#0E362B] text-xs mb-3 font-mono font-bold">
                    02
                  </div>
                  <h4 className="text-sm font-semibold text-[#0B261E] mb-1">IRDAI Intermediary</h4>
                  <p className="text-xs text-[#525854] leading-relaxed">
                    IMF Registration No. IMF182444280220190240. We represent policyholders as fiduciaries, not corporate insurer sales quotas.
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#0E362B] font-semibold pt-3 mt-3 border-t border-[#E6E2D8]/60">
                  Fiduciary Duty
                </span>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xs flex flex-col justify-between min-h-[190px]">
                <div>
                  <div className="w-7 h-7 rounded border border-[#E6E2D8] bg-[#F5F2EA] flex items-center justify-center text-[#0E362B] text-xs mb-3 font-mono font-bold">
                    03
                  </div>
                  <h4 className="text-sm font-semibold text-[#0B261E] mb-1">Bhopal Claim Escort</h4>
                  <p className="text-xs text-[#525854] leading-relaxed">
                    Real humans at our physical office in Danish Nagar Square escort surveyor disputes, repudiations, and hospital cashless claims.
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#0E362B] font-semibold pt-3 mt-3 border-t border-[#E6E2D8]/60">
                  Physical Presence
                </span>
              </div>

              {/* Pillar 4 */}
              <div className="p-6 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xs flex flex-col justify-between min-h-[190px]">
                <div>
                  <div className="w-7 h-7 rounded border border-[#E6E2D8] bg-[#F5F2EA] flex items-center justify-center text-[#0E362B] text-xs mb-3 font-mono font-bold">
                    04
                  </div>
                  <h4 className="text-sm font-semibold text-[#0B261E] mb-1">Zero Data Selling</h4>
                  <p className="text-xs text-[#525854] leading-relaxed">
                    Your contact details are strictly confidential. We never sell your number to telemarketing agencies or aggregator call centers.
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#0E362B] font-semibold pt-3 mt-3 border-t border-[#E6E2D8]/60">
                  Privacy Vault
                </span>
              </div>
            </div>
          </section>

          {/* ─── 4. REFINED EDITORIAL FAQ GRID (2 COLUMNS) ─── */}
          <section className="max-w-5xl mx-auto space-y-6 pt-2">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#525854]">
                Clarity &amp; Protocol
              </span>
              <h3 className="text-2xl bhq-serif text-[#0B261E] font-normal">
                Frequently Asked Questions
              </h3>
            </div>

            <div className="bhq-faq-row">
              <div className="p-6 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xs space-y-2">
                <h4 className="font-semibold text-[#0B261E] flex items-center gap-2 text-xs">
                  <span className="text-[#8A6822] font-mono text-[11px] font-bold">Q1</span>
                  Do I require a Google account to post a review?
                </h4>
                <p className="text-[#525854] text-xs leading-relaxed">
                  Yes. Google requires an authenticated Google or Gmail account to prevent automated bot spam and ensure reviews originate from real policyholders.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xs space-y-2">
                <h4 className="font-semibold text-[#0B261E] flex items-center gap-2 text-xs">
                  <span className="text-[#8A6822] font-mono text-[11px] font-bold">Q2</span>
                  How long does the Google review take?
                </h4>
                <p className="text-[#525854] text-xs leading-relaxed">
                  Typically under 30 to 45 seconds. Simply tap the star rating, write one or two sentences on your experience, and press publish.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xs space-y-2">
                <h4 className="font-semibold text-[#0B261E] flex items-center gap-2 text-xs">
                  <span className="text-[#8A6822] font-mono text-[11px] font-bold">Q3</span>
                  Can I edit or update my review later?
                </h4>
                <p className="text-[#525854] text-xs leading-relaxed">
                  Yes, at any time. When your claim finalizes or policy updates occur, you can return to Google Maps to amend your rating and feedback.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#E6E2D8] shadow-2xs space-y-2">
                <h4 className="font-semibold text-[#0B261E] flex items-center gap-2 text-xs">
                  <span className="text-[#8A6822] font-mono text-[11px] font-bold">Q4</span>
                  How is confidential feedback processed?
                </h4>
                <p className="text-[#525854] text-xs leading-relaxed">
                  Confidential notes bypass intermediary staff and route directly to the Executive Leadership &amp; Ombudsman Desk. If requested, an ombudsman calls you back.
                </p>
              </div>
            </div>
          </section>

        </main>

        {/* Official Website Footer */}
        <PublicFooter />
      </div>
    </>
  );
}
