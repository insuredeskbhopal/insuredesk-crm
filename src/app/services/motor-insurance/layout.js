import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Motor Insurance Consulting Across India",
  description:
    "Compare and renew car, bike, and commercial vehicle insurance across India. Get expert claim support at Bima Headquarter.",
  alternates: {
    canonical: "/services/motor-insurance",
  },
  openGraph: {
    title: `Motor Insurance Consulting Across India`,
    description:
      "Compare and renew car, bike, and commercial vehicle insurance across India. Get expert claim support at Bima Headquarter.",
    url: `${SITE_URL}/services/motor-insurance`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Motor Insurance Consulting Across India`,
    description:
      "Compare and renew car, bike, and commercial vehicle insurance across India. Get expert claim support at Bima Headquarter.",
  },
};

export default function MotorInsuranceLayout({ children }) {
  return children;
}
