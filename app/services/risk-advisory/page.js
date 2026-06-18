import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function RiskAdvisoryPage() {
  return <ServiceDetailPage service={servicesBySlug["risk-advisory"]} />;
}