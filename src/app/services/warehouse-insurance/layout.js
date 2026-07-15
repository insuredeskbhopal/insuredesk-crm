import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Warehouse Insurance Consulting Across India",
  description:
    "Protect warehouse stock, storage risks, burglary exposure, and fire hazards with warehouse insurance consulting by Bima Headquarter.",
  alternates: {
    canonical: "/services/warehouse-insurance",
  },
  openGraph: {
    title: "Warehouse Insurance Consulting Across India",
    description:
      "Protect warehouse stock, storage risks, burglary exposure, and fire hazards with warehouse insurance consulting by Bima Headquarter.",
    url: `${SITE_URL}/services/warehouse-insurance`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Warehouse Insurance Consulting Across India",
    description:
      "Protect warehouse stock, storage risks, burglary exposure, and fire hazards with warehouse insurance consulting by Bima Headquarter.",
  },
};

export default function WarehouseInsuranceLayout({ children }) {
  return children;
}
