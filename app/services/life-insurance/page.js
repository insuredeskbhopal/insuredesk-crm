import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function LifeInsurancePage() {
  return <ServiceDetailPage service={servicesBySlug["life-insurance"]} />;
}
