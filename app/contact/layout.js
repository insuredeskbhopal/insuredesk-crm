import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Contact BimaHeadquarter | Insurance Agency in Bhopal",
  description: "Contact BimaHeadquarter, a premier insurance agency in Bhopal by Insuredesk IMF Private Ltd. Find our address, phone number, hours, and map.",
  alternates: {
    canonical: "/contact"
  },
  openGraph: {
    title: `Contact BimaHeadquarter | Insurance Agency in Bhopal`,
    description: "Contact BimaHeadquarter, a premier insurance agency in Bhopal by Insuredesk IMF Private Ltd. Find our address, phone number, hours, and map.",
    url: `${SITE_URL}/contact`,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact BimaHeadquarter | Insurance Agency in Bhopal`,
    description: "Contact BimaHeadquarter, a premier insurance agency in Bhopal by Insuredesk IMF Private Ltd. Find our address, phone number, hours, and map."
  }
};

export default function ContactLayout({ children }) {
  return children;
}
