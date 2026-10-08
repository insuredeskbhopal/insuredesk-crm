/**
 * Bima Headquarter — Google Review & Experience System Configuration
 * Brand of Insuredesk IMF Pvt. Ltd. (Bhopal, Madhya Pradesh, India)
 */

export const DEFAULT_GOOGLE_REVIEW_URL =
  process.env.GOOGLE_REVIEW_URL ||
  "https://search.google.com/local/writereview?placeid=ChIJBXaYqcFDfDkRp3Af8Z-9HV0";

export const BRAND_CONFIG = {
  brandName: "Bima Headquarter",
  legalEntity: "Insuredesk IMF Pvt. Ltd.",
  tagline: "Sahi Salah • Sahi Policy • Sahi Protection",
  location: "Bhopal, Madhya Pradesh, India",
  fullAddress:
    "S-2, 2nd Floor, Nikhil Homes, Danish Nagar Square Main, 2 Narmadapuram Road, Near D-Mart, Opposite Rajasthan Mishtan, Landmark 1, Bhopal, Madhya Pradesh 462026",
  phone: "88188 89660",
  phoneRaw: "918818889660",
  email: "info@bimaheadquarter.com",
  canonicalReviewUrl: "https://bimaheadquarter.com/review",
  shortcutRedirectUrl: "https://bimaheadquarter.com/r",
};

export const ALLOWED_CHANNELS = ["direct", "qr", "whatsapp", "sms", "email", "crm", "delivery", "office", "social"];

export const ALLOWED_EVENT_TYPES = [
  "review_page_view",
  "review_google_click",
  "review_shortlink_redirect",
  "review_qr_visit",
  "review_whatsapp_visit",
  "review_private_feedback_submit",
  "review_lang_toggle",
];

export const WHATSAPP_REVIEW_TEMPLATE_HINDI = `नमस्ते,
Bima Headquarter पर भरोसा करने के लिए आपका धन्यवाद।
अगर आपने हमारी सर्विस ली है, तो अपना अनुभव गूगल पर रिव्यू के जरिए जरूर शेयर करें।
आपका फीडबैक हमें अपनी सर्विस बेहतर बनाने में मदद करता है।
अपना रिव्यू यहां दें:
https://bimaheadquarter.com/review
धन्यवाद,
Bima Headquarter`;

export const TRANSLATIONS = {
  en: {
    badge: "Official Client Experience Desk",
    mainHeading: "Your Trust Matters to Us",
    subHeading: "Thank you for choosing Bima Headquarter for your insurance needs.",
    introLead:
      "We strive to deliver honest guidance, transparent advice, and dedicated claims support. Your candid feedback helps us elevate our service standard.",
    
    // Star Rating Section
    experienceTitle: "How was your experience with us?",
    experienceSubtitle: "Select a star rating to help us understand your service satisfaction.",
    starsNotice: "Selecting a rating is for private feedback and is not posted to Google.",
    starLabels: {
      1: "Needs Improvement",
      2: "Fair",
      3: "Good",
      4: "Very Good",
      5: "Outstanding Experience",
    },

    // Google Review Section (Primary Action)
    googleSectionTitle: "Share Your Experience on Google",
    googleSectionDesc:
      "Your public feedback helps us improve and helps individuals and businesses choose insurance guidance with confidence.",
    googleButtonCta: "Write a Google Review",
    googleNotice: "Opens official Google Business Profile review dialog in a new tab.",
    googleBadge: "Google Verified Review Form",

    // Private Feedback Section
    privateSectionTitle: "Send Feedback Privately",
    privateSectionSubtitle: "Prefer to share detailed thoughts or concerns directly with our management team?",
    privateDescription:
      "Your notes are delivered confidentially to our senior advisory team. We review every message personally.",
    nameLabel: "Your Name (Optional)",
    namePlaceholder: "e.g. Rahul Sharma",
    contactLabel: "Contact Phone or Email (Optional)",
    contactPlaceholder: "e.g. 98260XXXXX or rahul@example.com",
    messageLabel: "Your Feedback / Message *",
    messagePlaceholder: "Please share details of your experience, policy service, or any suggestion...",
    consentLabel: "I agree to be contacted by Bima Headquarter regarding this feedback.",
    submitButton: "Send Private Feedback",
    submittingButton: "Submitting...",
    feedbackSuccessTitle: "Feedback Received",
    feedbackSuccessMessage:
      "Thank you for sharing your thoughts with us. Our management team will review your message promptly.",
    equalAccessNotice:
      "Note: Google Reviews and Private Feedback are completely independent options. All clients have equal access to leave a Google review at any time.",

    // QR Code Section
    qrSectionTitle: "Scan or Save QR Code",
    qrSectionDesc: "Scan with your phone camera or download to share with family or colleagues.",
    downloadQrPng: "Download PNG",
    downloadQrSvg: "Download SVG",

    // Trust Elements
    trustPillars: [
      { title: "IRDAI Registered", desc: "Corporate Insurance Intermediary" },
      { title: "Claims Advocacy", desc: "End-to-end documentation support" },
      { title: "Zero Gating", desc: "Open, transparent client feedback" },
    ],

    // Footer
    tagline: "Sahi Salah • Sahi Policy • Sahi Protection",
    operatedBy: "Bima Headquarter is a brand owned and operated by InsureDesk IMF Pvt. Ltd.",
    officeLocation: "Headquartered in Bhopal, Madhya Pradesh, India",
    privacyLink: "Privacy Policy",
    termsLink: "Terms & Conditions",
    homeLink: "Return to Main Website",
  },

  hi: {
    badge: "आधिकारिक ग्राहक अनुभव डेस्क",
    mainHeading: "आपका भरोसा हमारे लिए बहुत मायने रखता है",
    subHeading: "अपनी बीमा आवश्यकताओं के लिए Bima Headquarter को चुनने के लिए धन्यवाद।",
    introLead:
      "हम आपको सही सलाह, पारदर्शी सेवा और त्वरित क्लेम सहायता देने के लिए प्रतिबद्ध हैं। आपका निष्पक्ष अनुभव हमारी सेवाओं को और बेहतर बनाने में मदद करता है।",

    // Star Rating Section
    experienceTitle: "हमारे साथ आपका अनुभव कैसा रहा?",
    experienceSubtitle: "अपनी संतुष्टि के अनुसार स्टार चुनें।",
    starsNotice: "स्टार रेटिंग चुनना निजी फीडबैक के लिए है और यह सीधे गूगल पर पोस्ट नहीं होता है।",
    starLabels: {
      1: "सुधार की आवश्यकता",
      2: "संतोषजनक",
      3: "अच्छा",
      4: "बहुत अच्छा",
      5: "उत्कृष्ट अनुभव",
    },

    // Google Review Section (Primary Action)
    googleSectionTitle: "गूगल पर अपना अनुभव शेयर करें",
    googleSectionDesc:
      "आपकी राय हमें सेवा बेहतर करने में मदद करती है और दूसरों को सही बीमा मार्गदर्शन चुनने में विश्वास देती है।",
    googleButtonCta: "गूगल पर अपना रिव्यू दें",
    googleNotice: "नए टैब में आधिकारिक गूगल रिव्यू पेज खुलेगा।",
    googleBadge: "आधिकारिक गूगल प्रोफाइल",

    // Private Feedback Section
    privateSectionTitle: "सीधे हमें निजी फीडबैक भेजें",
    privateSectionSubtitle: "क्या आप कोई सुझाव या समस्या सीधे हमारी प्रबंधन टीम तक पहुँचाना चाहते हैं?",
    privateDescription:
      "आपका संदेश सीधे हमारे वरिष्ठ अधिकारियों तक गोपनीय रूप से पहुँचाया जाएगा।",
    nameLabel: "आपका नाम (वैकल्पिक)",
    namePlaceholder: "जैसे: राहुल शर्मा",
    contactLabel: "मोबाइल नंबर या ईमेल (वैकल्पिक)",
    contactPlaceholder: "जैसे: 98260XXXXX या rahul@example.com",
    messageLabel: "आपका फीडबैक या संदेश *",
    messagePlaceholder: "कृपया अपने अनुभव या किसी सुझाव के बारे में यहाँ लिखें...",
    consentLabel: "मैं इस फीडबैक के संबंध में संपर्क किए जाने की सहमति देता/देती हूँ।",
    submitButton: "निजी फीडबैक सबमिट करें",
    submittingButton: "सबमिट हो रहा है...",
    feedbackSuccessTitle: "फीडबैक प्राप्त हुआ",
    feedbackSuccessMessage:
      "अपने विचार साझा करने के लिए धन्यवाद। हमारी टीम आपके संदेश पर ध्यानपूर्वक विचार करेगी।",
    equalAccessNotice:
      "ध्यान दें: गूगल रिव्यू और निजी फीडबैक दोनों पूरी तरह स्वतंत्र विकल्प हैं। हर ग्राहक किसी भी समय गूगल पर अपनी राय रखने के लिए स्वतंत्र है।",

    // QR Code Section
    qrSectionTitle: "क्यूआर कोड स्कैन या डाउनलोड करें",
    qrSectionDesc: "अपने फोन के कैमरे से स्कैन करें या भविष्य के उपयोग के लिए डाउनलोड करें।",
    downloadQrPng: "PNG डाउनलोड करें",
    downloadQrSvg: "SVG डाउनलोड करें",

    // Trust Elements
    trustPillars: [
      { title: "IRDAI पंजीकृत", desc: "विश्वसनीय कॉर्पोरेट इंश्योरेंस सलाहकार" },
      { title: "क्लेम सहायता", desc: "शुरुआत से अंत तक पूर्ण सहयोग" },
      { title: "पारदर्शी समीक्षा", desc: "खुला और निष्पक्ष ग्राहक अनुभव" },
    ],

    // Footer
    tagline: "सही सलाह • सही पॉलिसी • सही प्रोटेक्शन",
    operatedBy: "Bima Headquarter, InsureDesk IMF Pvt. Ltd. का आधिकारिक ब्रांड है।",
    officeLocation: "भोपाल, मध्य प्रदेश, भारत में स्थित",
    privacyLink: "प्राइवेसी पॉलिसी",
    termsLink: "नियम और शर्तें",
    homeLink: "मुख्य वेबसाइट पर जाएँ",
  },
};
