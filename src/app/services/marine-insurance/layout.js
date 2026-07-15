import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Marine Insurance Consulting Across India",
  description:
    "Get marine and transit insurance consulting for cargo moved by road, rail, air, or sea with expert claim support by Bima Headquarter.",
  alternates: {
    canonical: "/services/marine-insurance",
  },
  openGraph: {
    title: "Marine Insurance Consulting Across India",
    description:
      "Get marine and transit insurance consulting for cargo moved by road, rail, air, or sea with expert claim support by Bima Headquarter.",
    url: `${SITE_URL}/services/marine-insurance`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marine Insurance Consulting Across India",
    description:
      "Get marine and transit insurance consulting for cargo moved by road, rail, air, or sea with expert claim support by Bima Headquarter.",
  },
};

export default function MarineInsuranceLayout({ children }) {
  return children;
}
