import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Motor Insurance Consulting in Bhopal | BimaHeadquarter",
  description: "Compare and renew car, bike, and commercial vehicle insurance in Bhopal. Get expert claim support at BimaHeadquarter.",
  alternates: {
    canonical: "/services/motor-insurance"
  },
  openGraph: {
    title: `Motor Insurance Consulting in Bhopal | BimaHeadquarter`,
    description: "Compare and renew car, bike, and commercial vehicle insurance in Bhopal. Get expert claim support at BimaHeadquarter.",
    url: `${SITE_URL}/services/motor-insurance`,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `Motor Insurance Consulting in Bhopal | BimaHeadquarter`,
    description: "Compare and renew car, bike, and commercial vehicle insurance in Bhopal. Get expert claim support at BimaHeadquarter."
  }
};

export default function MotorInsuranceLayout({ children }) {
  return children;
}
