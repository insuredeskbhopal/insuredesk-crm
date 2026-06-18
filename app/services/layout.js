import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Our Services | Insurance Consulting Across India",
  description: "Explore insurance services across India with BimaHeadquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory.",
  alternates: {
    canonical: "/services"
  },
  openGraph: {
    title: `Our Services | Insurance Consulting Across India`,
    description: "Explore insurance services across India with BimaHeadquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory.",
    url: `${SITE_URL}/services`,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `Our Services | Insurance Consulting Across India`,
    description: "Explore insurance services across India with BimaHeadquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory."
  }
};

export default function ServicesLayout({ children }) {
  return children;
}
