import OperationsBackLink from "@/app/components/operations/OperationsBackLink";
import LeadGenerationPage from "@/app/(dashboard)/dashboard/manual-entry/customer-profiling/page";

export default function OperationsLeadGenerationPage() {
  return (
    <div className="operations-module-page">
      <OperationsBackLink />
      <LeadGenerationPage />
    </div>
  );
}
