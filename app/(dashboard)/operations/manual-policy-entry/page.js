import OperationsBackLink from "@/app/components/operations/OperationsBackLink";
import ManualPolicyEntryPage from "@/app/(dashboard)/manual-policy-entry/page";

export default function OperationsManualPolicyEntryPage() {
  return (
    <div className="operations-module-page">
      <OperationsBackLink />
      <ManualPolicyEntryPage />
    </div>
  );
}
