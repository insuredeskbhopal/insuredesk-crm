import { BRAND_CONFIG, DEFAULT_GOOGLE_REVIEW_URL } from "@/lib/review/config";
import ReviewPageClient from "./ReviewPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Share Your Experience | Bima Headquarter",
  description:
    "Share your experience with Bima Headquarter and help us improve our insurance service. Official review page for InsureDesk IMF Pvt. Ltd., Bhopal.",
  alternates: {
    canonical: "/review",
  },
  openGraph: {
    title: "Share Your Experience | Bima Headquarter",
    description:
      "Your trust matters to us. Share your genuine feedback and review your insurance advisory experience with Bima Headquarter.",
    url: BRAND_CONFIG.canonicalReviewUrl,
    siteName: BRAND_CONFIG.brandName,
    images: [
      {
        url: "/brand/main-logo-wide.webp",
        width: 1024,
        height: 570,
        alt: `${BRAND_CONFIG.brandName} Logo`,
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Share Your Experience | Bima Headquarter",
    description: "Share your experience with Bima Headquarter and help us improve our insurance service.",
    images: ["/brand/main-logo-wide.webp"],
  },
};

export default async function ReviewPage({ searchParams }) {
  const params = await searchParams;
  const initialCampaign = params?.c || params?.campaign || "direct";
  const initialSource = params?.src || params?.source || params?.utm_source || "web";
  const initialChannel = params?.ch || params?.channel || "web";

  // Structured Data Schema for LocalBusiness
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "InsuranceAgency",
    name: BRAND_CONFIG.brandName,
    legalName: BRAND_CONFIG.legalEntity,
    url: BRAND_CONFIG.canonicalReviewUrl,
    logo: "https://bimaheadquarter.com/brand/main-logo-wide.webp",
    description:
      "Bima Headquarter is an insurance advisory firm owned by InsureDesk IMF Pvt. Ltd., serving clients across India with Motor, Health, and Commercial insurance consulting.",
    address: {
      "@type": "PostalAddress",
      streetAddress:
        "S-2, 2nd Floor, Nikhil Homes, Danish Nagar Square Main, 2 Narmadapuram Road, Near D-Mart, Opposite Rajasthan Mishtan, Landmark 1",
      addressLocality: "Bhopal",
      addressRegion: "Madhya Pradesh",
      postalCode: "462026",
      addressCountry: "IN",
    },
    telephone: BRAND_CONFIG.phone,
    email: BRAND_CONFIG.email,
    sameAs: [DEFAULT_GOOGLE_REVIEW_URL],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReviewPageClient
        initialCampaign={initialCampaign}
        initialSource={initialSource}
        initialChannel={initialChannel}
      />
    </>
  );
}
