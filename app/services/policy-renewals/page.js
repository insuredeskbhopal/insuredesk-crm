import ServiceDetailPage from "../ServiceDetailPage";
import { servicesBySlug } from "../servicePageData";

export default function PolicyRenewalsPage() {
  return <ServiceDetailPage service={servicesBySlug["policy-renewals"]} />;
}
