import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Frequently Asked Questions (FAQ)",
  description:
    "Find answers to common questions about Bima Headquarter (InsureDesk IMF Pvt. Ltd.), claims assistance, policy renewals, and commercial risk advisory.",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: `FAQ | ${SITE_NAME}`,
    description:
      "Find answers to common questions about Bima Headquarter, claims assistance, policy renewals, and commercial risk advisory.",
    url: `${SITE_URL}/faq`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `FAQ | ${SITE_NAME}`,
    description:
      "Find answers to common questions about Bima Headquarter, claims assistance, policy renewals, and commercial risk advisory.",
  },
};

export default function FaqLayout({ children }) {
  return children;
}
