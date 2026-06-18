import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Contact & Support | Insurance Consulting Across India",
  description:
    "Get in touch with BimaHeadquarter, a Pan India insurance consulting and claim assistance brand by Insuredesk IMF Private Ltd.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: `Contact & Support | Insurance Consulting Across India`,
    description:
      "Get in touch with BimaHeadquarter, a Pan India insurance consulting and claim assistance brand by Insuredesk IMF Private Ltd.",
    url: `${SITE_URL}/contact`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact & Support | Insurance Consulting Across India`,
    description:
      "Get in touch with BimaHeadquarter, a Pan India insurance consulting and claim assistance brand by Insuredesk IMF Private Ltd.",
  },
};

export default function ContactLayout({ children }) {
  return children;
}
