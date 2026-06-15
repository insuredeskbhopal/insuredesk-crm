import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Insurance Claims Assistance Bhopal | BimaHeadquarter",
  description: "Facing issues with claim settlements? Get expert representation, documentation support, and claims advocacy in Bhopal.",
  alternates: {
    canonical: "/services/claims-assistance"
  },
  openGraph: {
    title: `Insurance Claims Assistance Bhopal | BimaHeadquarter`,
    description: "Facing issues with claim settlements? Get expert representation, documentation support, and claims advocacy in Bhopal.",
    url: `${SITE_URL}/services/claims-assistance`,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `Insurance Claims Assistance Bhopal | BimaHeadquarter`,
    description: "Facing issues with claim settlements? Get expert representation, documentation support, and claims advocacy in Bhopal."
  }
};

export default function ClaimsAssistanceLayout({ children }) {
  return children;
}
