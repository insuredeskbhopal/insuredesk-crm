import { SITE_URL } from "@/lib/seo/site";

const title = "Fire Insurance Consulting Across India";
const description =
  "Protect buildings, stock, plant, machinery, warehouses, and commercial assets with fire insurance guidance and claims assistance from Bima Headquarter.";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/services/fire-insurance" },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/services/fire-insurance`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function FireInsuranceLayout({ children }) {
  return children;
}
