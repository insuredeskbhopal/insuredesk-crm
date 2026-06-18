import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function ClaimsAssistancePage() {
  return <ServiceDetailPage service={servicesBySlug["claims-assistance"]} />;
}