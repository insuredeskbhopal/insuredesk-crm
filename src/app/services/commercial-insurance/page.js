import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function CommercialInsurancePage() {
  return <ServiceDetailPage service={servicesBySlug["commercial-insurance"]} />;
}
