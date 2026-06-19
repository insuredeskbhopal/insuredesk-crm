import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Commercial & Business Insurance Across India",
  description:
    "Protect your corporate assets, stocks, and liabilities across India. Professional commercial insurance advisory by BimaHeadquarter.",
  alternates: {
    canonical: "/services/commercial-insurance",
  },
  openGraph: {
    title: `Commercial & Business Insurance Across India`,
    description:
      "Protect your corporate assets, stocks, and liabilities across India. Professional commercial insurance advisory by BimaHeadquarter.",
    url: `${SITE_URL}/services/commercial-insurance`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Commercial & Business Insurance Across India`,
    description:
      "Protect your corporate assets, stocks, and liabilities across India. Professional commercial insurance advisory by BimaHeadquarter.",
  },
};

export default function CommercialInsuranceLayout({ children }) {
  return children;
}
