import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Insurance Blog & Insights",
  description:
    "Read the latest guides, checklists, and expert insights on insurance claims, renewals, and risk management from BIMAHEADQUARTER.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: `Insurance Blog & Insights | ${SITE_NAME}`,
    description:
      "Read the latest guides, checklists, and expert insights on insurance claims, renewals, and risk management.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Insurance Blog & Insights | ${SITE_NAME}`,
    description:
      "Read the latest guides, checklists, and expert insights on insurance claims, renewals, and risk management.",
  },
};

export default function BlogLayout({ children }) {
  return children;
}
