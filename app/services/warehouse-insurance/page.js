import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function WarehouseInsurancePage() {
  return <ServiceDetailPage service={servicesBySlug["warehouse-insurance"]} />;
}
