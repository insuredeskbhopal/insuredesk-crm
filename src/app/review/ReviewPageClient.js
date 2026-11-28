"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Copy,
  Check,
  Share2,
  ChevronDown,
  Globe,
} from "lucide-react";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import LandingEffects from "@/app/components/LandingEffects";
import { BUSINESS_DETAILS } from "@/lib/seo/site";
import {
  BRAND_CONFIG,
  DEFAULT_GOOGLE_REVIEW_URL,
  WHATSAPP_REVIEW_TEMPLATE_HINDI,
} from "@/lib/review/config";
import styles from "./ReviewPage.module.css";

const FEEDBACK_TYPES = [
  { id: "General Feedback", en: "General Feedback", hi: "सामान्य फीडबैक" },
  { id: "Appreciation", en: "Appreciation", hi: "सराहना" },
  { id: "Policy or Service", en: "Policy or Service", hi: "पॉलिसी या सेवा" },
  { id: "Claim Support", en: "Claim Support", hi: "क्लेम सहायता" },
  { id: "Suggestions", en: "Suggestions", hi: "सुझाव" },
];

const COMPACT_FAQS = [
  {
    enQ: "Do I need a Google account to leave a review?",
    hiQ: "क्या गूगल रिव्यू देने के लिए गूगल अकाउंट जरूरी है?",
    enA: "Yes. Google requires reviewers to sign in with a Google or Gmail account to prevent automated spam.",
    hiA: "हाँ। स्पैम रोकने के लिए गूगल पर लॉगिन आवश्यक होता है।",
  },
  {
    enQ: "Can I update my Google review later?",
    hiQ: "क्या मैं बाद में अपना रिव्यू बदल सकता हूँ?",
    enA: "Yes. You can return to Google Maps anytime to edit your rating or add follow-up details.",
    hiA: "हाँ। आप कभी भी गूगल मैप्स पर जाकर अपनी रेटिंग या टिप्पणी अपडेट कर सकते हैं।",
  },
  {
    enQ: "How is private feedback handled?",
    hiQ: "निजी फीडबैक पर कैसे कार्रवाई होती है?",
    enA: "Your note is delivered directly to the Bima Headquarter team. If you provide contact details and consent, our team can reach out to you.",
    hiA: "आपका संदेश सीधे हमारी Bima Headquarter टीम तक पहुँचता है। यदि आप संपर्क विवरण और सहमति देते हैं, तो टीम आपसे संपर्क कर सकती है।",
  },
];

const COPY = {
  en: {
    breadcrumbHome: "Home",
    breadcrumbCurrent: "Client Feedback",
    headline: "Share your experience with Bima\u00A0Headquarter",
    subtitle:
      "Leave an honest Google review or send private feedback directly to our advisory team.",
    provenanceTitle: "InsureDesk IMF Pvt. Ltd.",
    provenanceSub: "Bhopal, Madhya Pradesh",
    jumpGoogle: "Review on Google",
    jumpPrivate: "Send private feedback",
    googleTitle: "Review us on Google",
    googleDesc:
      "Share your honest experience on Google to help families and businesses choose insurance coverage with confidence.",
    googleCta: "Write a review",
    googleNote: "Opens Google in a new tab. Reviews are published under Google’s guidelines.",
    shareBtn: "Share",
    copyBtn: "Copy link",
    copiedBtn: "Copied",
    qrHeading: "Scan from your phone",
    qrSub: "Open this review page directly on mobile.",
    privateTitle: "Private feedback",
    privateDesc: "Prefer to send a suggestion, concern or appreciation directly to our team?",
    typeLabel: "Feedback type",
    nameLabel: "Name (optional)",
    namePlaceholder: "Your name",
    contactLabel: "Contact (optional)",
    contactPlaceholder: "Phone number or email",
    messageLabel: "Your feedback",
    messagePlaceholder: "Tell us about your experience...",
    consentPrefix: "Yes, Bima Headquarter may contact me regarding this feedback. Read our ",
    privacyLinkText: "Privacy Policy",
    privacyNotice: "Never published publicly. Kept confidential with our team.",
    submitCta: "Submit feedback",
    submittingCta: "Submitting...",
    successTitle: "Thank you for your feedback",
    successDesc: "Your message has been received by the Bima Headquarter team.",
    sendAnother: "Send another message",
    minLengthError: "Please enter at least 5 characters before submitting.",
    submitError: "We could not submit your feedback right now. Please try again or call us directly.",
    independentNote: "Public Google reviews and private feedback are independent options.",
    faqTitle: "Common questions",
    supportHeading: "Need help with your policy or claim?",
    supportSub: "Speak with our Bhopal team at",
    contactUs: "Contact us",
  },
  hi: {
    breadcrumbHome: "होम",
    breadcrumbCurrent: "ग्राहक अनुभव",
    headline: "Bima Headquarter के साथ अपना अनुभव साझा करें",
    subtitle: "गूगल पर अपनी सच्ची समीक्षा लिखें या हमारी टीम को सीधे निजी संदेश भेजें।",
    provenanceTitle: "InsureDesk IMF Pvt. Ltd.",
    provenanceSub: "भोपाल, मध्य प्रदेश",
    jumpGoogle: "गूगल पर रिव्यू दें",
    jumpPrivate: "निजी फीडबैक भेजें",
    googleTitle: "गूगल पर हमें रिव्यू दें",
    googleDesc:
      "अपना सच्चा अनुभव साझा करें ताकि अन्य परिवार और व्यवसाय सही बीमा निर्णय ले सकें।",
    googleCta: "रिव्यू लिखें",
    googleNote: "नए टैब में गूगल खुलेगा। रिव्यू गूगल के दिशानिर्देशों के तहत प्रकाशित होते हैं।",
    shareBtn: "शेयर करें",
    copyBtn: "लिंक कॉपी करें",
    copiedBtn: "कॉपी हुआ",
    qrHeading: "फोन से स्कैन करें",
    qrSub: "मोबाइल पर सीधे इस पेज को खोलें।",
    privateTitle: "निजी फीडबैक",
    privateDesc: "कोई सुझाव, चिंता या सराहना सीधे हमारी टीम के साथ साझा करें।",
    typeLabel: "फीडबैक का प्रकार",
    nameLabel: "नाम (वैकल्पिक)",
    namePlaceholder: "आपका नाम",
    contactLabel: "संपर्क (वैकल्पिक)",
    contactPlaceholder: "मोबाइल नंबर या ईमेल",
    messageLabel: "आपका फीडबैक",
    messagePlaceholder: "अपने अनुभव के बारे में लिखें...",
    consentPrefix: "हाँ, Bima Headquarter टीम इस फीडबैक के संबंध में मुझसे संपर्क कर सकती है। हमारी ",
    privacyLinkText: "प्राइवेसी पॉलिसी",
    privacyNotice: "यह सार्वजनिक नहीं होगा। आपकी जानकारी गोपनीय रहती है।",
    submitCta: "फीडबैक भेजें",
    submittingCta: "भेजा जा रहा है...",
    successTitle: "आपके फीडबैक के लिए धन्यवाद",
    successDesc: "आपका संदेश Bima Headquarter टीम को प्राप्त हो गया है।",
    sendAnother: "एक और संदेश भेजें",
    minLengthError: "कृपया भेजने से पहले कम से कम 5 अक्षर लिखें।",
    submitError: "अभी संदेश भेजा नहीं जा सका। कृपया फिर प्रयास करें या हमें कॉल करें।",
    independentNote: "गूगल रिव्यू और निजी फीडबैक दोनों पूरी तरह अलग विकल्प हैं।",
    faqTitle: "सामान्य प्रश्न",
    supportHeading: "पॉलिसी या क्लेम में मदद चाहिए?",
    supportSub: "हमारी भोपाल टीम से बात करें:",
    contactUs: "संपर्क करें",
  },
};

export default function ReviewPageClient({
  initialCampaign = "direct",
  initialSource = "web",
  initialChannel = "web",
}) {
  const [lang, setLang] = useState("en");
  const [feedbackType, setFeedbackType] = useState("General Feedback");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackConsent, setFeedbackConsent] = useState(true);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const isHindi = lang === "hi";
  const t = COPY[lang] || COPY.en;

  useEffect(() => {
    try {
      const storageKey = `bhq_review_viewed_${initialCampaign}`;
      if (!window.sessionStorage.getItem(storageKey)) {
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
        }).catch(() => { });
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
    }).catch(() => { });
  };

  const trackGoogleClick = () => {
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
    }).catch(() => { });
  };

  const handleCopyLink = () => {
    const url = BRAND_CONFIG.canonicalReviewUrl;
    if (typeof window !== "undefined" && window.navigator?.clipboard?.writeText) {
      window.navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const text = isHindi
      ? WHATSAPP_REVIEW_TEMPLATE_HINDI
      : `Review Bima Headquarter on Google: ${BRAND_CONFIG.canonicalReviewUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handlePrivateFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackError("");

    if (!feedbackMessage.trim() || feedbackMessage.trim().length < 5) {
      setFeedbackError(t.minLengthError);
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
          message: `[${feedbackType}] ${feedbackMessage.trim()}`,
          consent: feedbackConsent,
          campaign: initialCampaign,
          honeypot,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || t.submitError);
      }

      setFeedbackSubmitted(true);
      setFeedbackMessage("");
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
      }).catch(() => { });
    } catch (err) {
      setFeedbackError(err?.message || t.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <LandingEffects />

      <div className={`landing-shell ${styles.reviewPage}`}>
        <PublicHeader />

        <main className={styles.reviewMain}>
          {/* ─── EDITORIAL HERO HEADER ─── */}
          <section className={styles.heroBand}>
            <div className={styles.container}>
              <div className={styles.heroInner}>
                <div className={styles.heroCopy}>
                  <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                    <Link href="/" className={styles.breadcrumbHome}>
                      {t.breadcrumbHome}
                    </Link>
                    <span className={styles.breadcrumbSep} aria-hidden="true">
                      /
                    </span>
                    <span className={styles.breadcrumbCurrent}>{t.breadcrumbCurrent}</span>
                  </nav>

                  <h1 className={styles.heroTitle}>{t.headline}</h1>
                  <p className={styles.heroSubtitle}>{t.subtitle}</p>
                </div>

                <div className={styles.heroAside}>
                  <div className={styles.langRow}>
                    <Globe size={15} className={styles.langIcon} aria-hidden="true" />
                    <div className={styles.langGroup} role="tablist" aria-label="Language">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={!isHindi}
                        onClick={() => handleLangToggle("en")}
                        className={`${styles.langBtn} ${
                          !isHindi ? styles.langBtnActive : styles.langBtnIdle
                        }`}
                      >
                        English
                      </button>
                      <span className={styles.langDivider} aria-hidden="true" />
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isHindi}
                        onClick={() => handleLangToggle("hi")}
                        className={`${styles.langBtn} ${
                          isHindi ? styles.langBtnActive : styles.langBtnIdle
                        }`}
                      >
                        हिंदी
                      </button>
                    </div>
                  </div>
                  <p className={styles.provenanceLine}>
                    <strong>{t.provenanceTitle}</strong> · {t.provenanceSub}
                  </p>
                </div>
              </div>

              <div className={styles.mobileJumpLinks}>
                <a
                  href={DEFAULT_GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={trackGoogleClick}
                  className={styles.mobileJumpLinkPrimary}
                >
                  {t.jumpGoogle}
                </a>
                <a href="#private-feedback" className={styles.mobileJumpLinkSecondary}>
                  {t.jumpPrivate}
                </a>
              </div>
            </div>
          </section>

          {/* ─── 40:60 SPLIT WORKSPACE ─── */}
          <section className={styles.workspaceSection}>
            <div className={styles.container}>
              <div className={styles.workspaceGrid}>
                {/* 40% LEFT COLUMN: GOOGLE REVIEW */}
                <section className={styles.card} aria-labelledby="google-review-heading">
                  <div className={styles.googleCardHeader}>
                    <span className={styles.googleMark} aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          fill="#EA4335"
                        />
                      </svg>
                    </span>
                    <h2 id="google-review-heading" className={styles.cardTitle}>
                      {t.googleTitle}
                    </h2>
                  </div>

                  <p className={styles.cardDesc}>{t.googleDesc}</p>

                  <div className={styles.googleActionWrap}>
                    <a
                      href={DEFAULT_GOOGLE_REVIEW_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={trackGoogleClick}
                      className={styles.googlePrimaryCta}
                    >
                      <span>{t.googleCta}</span>
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </a>
                    <p className={styles.helperNote}>{t.googleNote}</p>
                  </div>

                  <div className={styles.cardDivider}>
                    <div className={styles.qrRow}>
                      <div className={styles.qrFrame}>
                        <Image
                          src={`/api/review/qr?c=${encodeURIComponent(initialCampaign)}&format=svg`}
                          alt="Scan QR code to review Bima Headquarter"
                          width={72}
                          height={72}
                          unoptimized
                          className={styles.qrImage}
                        />
                      </div>
                      <div>
                        <p className={styles.qrTitle}>{t.qrHeading}</p>
                        <p className={styles.qrDesc}>{t.qrSub}</p>
                        <span className={styles.qrUrl}>bimaheadquarter.com/review</span>
                      </div>
                    </div>

                    <div className={styles.utilityActions}>
                      <button
                        type="button"
                        onClick={handleWhatsAppShare}
                        className={styles.secondaryBtn}
                      >
                        <Share2 size={15} color="#1c6c39" aria-hidden="true" />
                        <span>{t.shareBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className={styles.secondaryBtn}
                      >
                        {copiedLink ? (
                          <Check size={15} color="#1c6c39" aria-hidden="true" />
                        ) : (
                          <Copy size={15} color="#475569" aria-hidden="true" />
                        )}
                        <span>{copiedLink ? t.copiedBtn : t.copyBtn}</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* 60% RIGHT COLUMN: PRIVATE FEEDBACK */}
                <section
                  id="private-feedback"
                  className={styles.card}
                  aria-labelledby="private-feedback-heading"
                >
                  <div className={styles.formHeader}>
                    <h2 id="private-feedback-heading" className={styles.cardTitle}>
                      {t.privateTitle}
                    </h2>
                    <p className={styles.cardDesc}>{t.privateDesc}</p>
                  </div>

                  {feedbackSubmitted ? (
                    <div role="status" className={styles.successCard}>
                      <div className={styles.successIconWrap}>
                        <CheckCircle2 size={24} aria-hidden="true" />
                      </div>
                      <h3 className={styles.successTitle}>{t.successTitle}</h3>
                      <p className={styles.successDesc}>{t.successDesc}</p>
                      <button
                        type="button"
                        onClick={() => setFeedbackSubmitted(false)}
                        className={styles.secondaryBtn}
                      >
                        {t.sendAnother}
                      </button>
                    </div>
                  ) : (
                    <form noValidate onSubmit={handlePrivateFeedbackSubmit} className={styles.form}>
                      <input
                        type="text"
                        name="website_url"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        style={{ display: "none" }}
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                      />

                      {feedbackError && (
                        <div role="alert" className={styles.errorAlert}>
                          <AlertCircle size={17} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{feedbackError}</span>
                        </div>
                      )}

                      <div>
                        <span className={styles.fieldLabel}>{t.typeLabel}</span>
                        <div className={styles.typeChipRow} role="radiogroup" aria-label={t.typeLabel}>
                          {FEEDBACK_TYPES.map((item) => {
                            const selected = feedbackType === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setFeedbackType(item.id)}
                                className={`${styles.typeChip} ${selected ? styles.typeChipActive : styles.typeChipIdle
                                  }`}
                              >
                                {isHindi ? item.hi : item.en}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className={styles.inputGrid}>
                        <div>
                          <label htmlFor="review-name" className={styles.fieldLabel}>
                            {t.nameLabel}
                          </label>
                          <input
                            id="review-name"
                            type="text"
                            value={feedbackName}
                            onChange={(e) => setFeedbackName(e.target.value)}
                            placeholder={t.namePlaceholder}
                            maxLength={100}
                            className={styles.textInput}
                          />
                        </div>
                        <div>
                          <label htmlFor="review-contact" className={styles.fieldLabel}>
                            {t.contactLabel}
                          </label>
                          <input
                            id="review-contact"
                            type="text"
                            value={feedbackContact}
                            onChange={(e) => setFeedbackContact(e.target.value)}
                            placeholder={t.contactPlaceholder}
                            maxLength={100}
                            className={styles.textInput}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="review-message" className={styles.fieldLabel}>
                          {t.messageLabel} *
                        </label>
                        <textarea
                          id="review-message"
                          value={feedbackMessage}
                          onChange={(e) => setFeedbackMessage(e.target.value)}
                          placeholder={t.messagePlaceholder}
                          required
                          rows={4}
                          maxLength={2000}
                          className={styles.textArea}
                        />
                      </div>

                      <div className={styles.consentBlock}>
                        <label htmlFor="review-consent" className={styles.consentLabel}>
                          <input
                            id="review-consent"
                            type="checkbox"
                            checked={feedbackConsent}
                            onChange={(e) => setFeedbackConsent(e.target.checked)}
                            className={styles.consentCheckbox}
                          />
                          <span>
                            {t.consentPrefix}
                            <Link href="/privacy-policy" className={styles.privacyLink}>
                              {t.privacyLinkText}
                            </Link>
                            .
                          </span>
                        </label>
                        <p className={styles.privacyCaption}>{t.privacyNotice}</p>
                      </div>

                      <button type="submit" disabled={submitting} className={styles.submitBtn}>
                        <span>{submitting ? t.submittingCta : t.submitCta}</span>
                      </button>
                    </form>
                  )}
                </section>
              </div>

              <p className={styles.independentNote}>{t.independentNote}</p>

              {/* ─── COMPACT FAQ ACCORDION ─── */}
              <section className={styles.faqSection} aria-labelledby="review-faq-heading">
                <h2 id="review-faq-heading" className={styles.faqHeading}>
                  {t.faqTitle}
                </h2>
                <div className={styles.faqList}>
                  {COMPACT_FAQS.map((faq) => (
                    <details key={faq.enQ} className={styles.faqItem}>
                      <summary className={styles.faqSummary}>
                        <span>{isHindi ? faq.hiQ : faq.enQ}</span>
                        <ChevronDown size={18} className={styles.faqChevron} aria-hidden="true" />
                      </summary>
                      <p className={styles.faqAnswer}>{isHindi ? faq.hiA : faq.enA}</p>
                    </details>
                  ))}
                </div>
              </section>

              {/* ─── QUIET SUPPORT LINE ─── */}
              <section className={styles.supportStrip}>
                <p className={styles.supportHeading}>{t.supportHeading}</p>
                <p className={styles.supportDetails}>
                  {t.supportSub}{" "}
                  <a href={`tel:${BUSINESS_DETAILS.phoneHref}`} className={styles.supportPhoneLink}>
                    {BUSINESS_DETAILS.phone}
                  </a>{" "}
                  ·{" "}
                  <Link href="/contact" className={styles.supportContactLink}>
                    {t.contactUs}
                  </Link>
                </p>
              </section>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
