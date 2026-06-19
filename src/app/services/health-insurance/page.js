import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function HealthInsurancePage() {
  return <ServiceDetailPage service={servicesBySlug["health-insurance"]} />;
}
