import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Corporate Risk Advisory Services Across India",
  description:
    "Identify, assess, and mitigate business risks. Corporate risk advisory services across India from InsureDesk IMF Pvt. Ltd.",
  alternates: {
    canonical: "/services/risk-advisory",
  },
  openGraph: {
    title: `Corporate Risk Advisory Services Across India`,
    description:
      "Identify, assess, and mitigate business risks. Corporate risk advisory services across India from InsureDesk IMF Pvt. Ltd.",
    url: `${SITE_URL}/services/risk-advisory`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Corporate Risk Advisory Services Across India`,
    description:
      "Identify, assess, and mitigate business risks. Corporate risk advisory services across India from InsureDesk IMF Pvt. Ltd.",
  },
};

export default function RiskAdvisoryLayout({ children }) {
  return children;
}
