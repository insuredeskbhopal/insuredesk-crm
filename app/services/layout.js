import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Insurance Services in Bhopal | BimaHeadquarter",
  description: "Explore insurance services in Bhopal by BimaHeadquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory.",
  alternates: {
    canonical: "/services"
  },
  openGraph: {
    title: `Insurance Services in Bhopal | BimaHeadquarter`,
    description: "Explore insurance services in Bhopal by BimaHeadquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory.",
    url: `${SITE_URL}/services`,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `Insurance Services in Bhopal | BimaHeadquarter`,
    description: "Explore insurance services in Bhopal by BimaHeadquarter. We offer general, health, motor, life, commercial insurance, claims assistance, and risk advisory."
  }
};

export default function ServicesLayout({ children }) {
  return children;
}
