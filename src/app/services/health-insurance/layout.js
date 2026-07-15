import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Health Insurance Consulting Across India",
  description:
    "Get the best health insurance plans for individuals, families, and corporates across India with Bima Headquarter's expert consulting.",
  alternates: {
    canonical: "/services/health-insurance",
  },
  openGraph: {
    title: `Health Insurance Consulting Across India`,
    description:
      "Get the best health insurance plans for individuals, families, and corporates across India with Bima Headquarter's expert consulting.",
    url: `${SITE_URL}/services/health-insurance`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Health Insurance Consulting Across India`,
    description:
      "Get the best health insurance plans for individuals, families, and corporates across India with Bima Headquarter's expert consulting.",
  },
};

export default function HealthInsuranceLayout({ children }) {
  return children;
}
