import { ReportIndexPage } from "@/app/components/reports/ReportingCenter";
import { REPORT_CATEGORIES } from "@/app/lib/reporting/business-intelligence";

export default function BusinessIntelligenceIndexPage() {
  return <ReportIndexPage modules={REPORT_CATEGORIES} lastUpdated={new Date().toISOString()} />;
}
