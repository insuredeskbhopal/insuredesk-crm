import { SITE_URL } from "@/lib/seo/site";

export const metadata = {
  title: "Warehouse Insurance Consulting Across India | BimaHeadquarter",
  description: "Protect warehouse stock, storage risks, burglary exposure, and fire hazards with warehouse insurance consulting by BimaHeadquarter.",
  alternates: {
    canonical: "/services/warehouse-insurance"
  },
  openGraph: {
    title: "Warehouse Insurance Consulting Across India | BimaHeadquarter",
    description: "Protect warehouse stock, storage risks, burglary exposure, and fire hazards with warehouse insurance consulting by BimaHeadquarter.",
    url: `${SITE_URL}/services/warehouse-insurance`,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Warehouse Insurance Consulting Across India | BimaHeadquarter",
    description: "Protect warehouse stock, storage risks, burglary exposure, and fire hazards with warehouse insurance consulting by BimaHeadquarter."
  }
};

export default function WarehouseInsuranceLayout({ children }) {
  return children;
}
