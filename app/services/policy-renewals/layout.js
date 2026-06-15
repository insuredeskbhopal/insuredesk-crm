import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Easy Policy Renewals in Bhopal | BimaHeadquarter",
  description: "Never let your coverage lapse. Professional assistance for timely policy renewals across all insurance categories in Bhopal.",
  alternates: {
    canonical: "/services/policy-renewals"
  },
  openGraph: {
    title: `Easy Policy Renewals in Bhopal | BimaHeadquarter`,
    description: "Never let your coverage lapse. Professional assistance for timely policy renewals across all insurance categories in Bhopal.",
    url: `${SITE_URL}/services/policy-renewals`,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `Easy Policy Renewals in Bhopal | BimaHeadquarter`,
    description: "Never let your coverage lapse. Professional assistance for timely policy renewals across all insurance categories in Bhopal."
  }
};

export default function PolicyRenewalsLayout({ children }) {
  return children;
}
