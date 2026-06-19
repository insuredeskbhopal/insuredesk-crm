import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function MarineInsurancePage() {
  return <ServiceDetailPage service={servicesBySlug["marine-insurance"]} />;
}
