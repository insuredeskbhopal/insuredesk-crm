export const dynamic = "force-dynamic";

import { ReportIndexPage } from "@/app/components/reports/ReportingCenter";
import { loadReportingCenterData } from "@/app/lib/reporting/business-intelligence";

export default async function BusinessIntelligenceIndexPage(props) {
  const searchParams = await props.searchParams;
  const data = await loadReportingCenterData({ category: "executive", searchParams });
  return <ReportIndexPage modules={data.modules} lastUpdated={data.lastUpdated} />;
}
