import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function FireInsurancePage() {
  return <ServiceDetailPage service={servicesBySlug["fire-insurance"]} />;
}
