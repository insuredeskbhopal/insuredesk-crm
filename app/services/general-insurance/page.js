import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function GeneralInsurancePage() {
  return <ServiceDetailPage service={servicesBySlug["general-insurance"]} />;
}
