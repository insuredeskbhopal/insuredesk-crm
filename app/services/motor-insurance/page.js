import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function MotorInsurancePage() {
  return <ServiceDetailPage service={servicesBySlug["motor-insurance"]} />;
}