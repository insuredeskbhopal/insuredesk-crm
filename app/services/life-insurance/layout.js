import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Life Insurance Consulting Across India",
  description: "Plan for your family's financial security. Expert life insurance consulting across India with BimaHeadquarter (Insuredesk IMF Private Ltd).",
  alternates: {
    canonical: "/services/life-insurance"
  },
  openGraph: {
    title: `Life Insurance Consulting Across India`,
    description: "Plan for your family's financial security. Expert life insurance consulting across India with BimaHeadquarter (Insuredesk IMF Private Ltd).",
    url: `${SITE_URL}/services/life-insurance`,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `Life Insurance Consulting Across India`,
    description: "Plan for your family's financial security. Expert life insurance consulting across India with BimaHeadquarter (Insuredesk IMF Private Ltd)."
  }
};

export default function LifeInsuranceLayout({ children }) {
  return children;
}
