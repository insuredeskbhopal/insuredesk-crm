import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "About Us",
  description:
    "Learn about Bima Headquarter, an insurance and claim consulting brand by InsureDesk IMF Pvt. Ltd. serving individuals and businesses in India.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: `About Us | ${SITE_NAME}`,
    description:
      "Learn about Bima Headquarter, an insurance and claim consulting brand by InsureDesk IMF Pvt. Ltd.",
    url: `${SITE_URL}/about`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `About Us | ${SITE_NAME}`,
    description:
      "Learn about Bima Headquarter, an insurance and claim consulting brand by InsureDesk IMF Pvt. Ltd.",
  },
};

export default function AboutLayout({ children }) {
  return children;
}
