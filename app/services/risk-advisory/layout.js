import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Corporate Risk Advisory Services Bhopal | BimaHeadquarter",
  description: "Identify, assess, and mitigate business risks. Corporate risk advisory services in Bhopal by Insuredesk IMF Private Ltd.",
  alternates: {
    canonical: "/services/risk-advisory"
  },
  openGraph: {
    title: `Corporate Risk Advisory Services Bhopal | BimaHeadquarter`,
    description: "Identify, assess, and mitigate business risks. Corporate risk advisory services in Bhopal by Insuredesk IMF Private Ltd.",
    url: `${SITE_URL}/services/risk-advisory`,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `Corporate Risk Advisory Services Bhopal | BimaHeadquarter`,
    description: "Identify, assess, and mitigate business risks. Corporate risk advisory services in Bhopal by Insuredesk IMF Private Ltd."
  }
};

export default function RiskAdvisoryLayout({ children }) {
  return children;
}
