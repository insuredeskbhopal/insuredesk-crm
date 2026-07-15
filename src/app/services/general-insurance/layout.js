import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "General Insurance Consulting Across India",
  description:
    "Secure your personal and business assets across India with General Insurance consulting by Bima Headquarter (InsureDesk IMF Pvt. Ltd.).",
  alternates: {
    canonical: "/services/general-insurance",
  },
  openGraph: {
    title: `General Insurance Consulting Across India`,
    description:
      "Secure your personal and business assets across India with General Insurance consulting by Bima Headquarter (InsureDesk IMF Pvt. Ltd.).",
    url: `${SITE_URL}/services/general-insurance`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `General Insurance Consulting Across India`,
    description:
      "Secure your personal and business assets across India with General Insurance consulting by Bima Headquarter (InsureDesk IMF Pvt. Ltd.).",
  },
};

export default function GeneralInsuranceLayout({ children }) {
  return children;
}
