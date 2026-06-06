import OperationsBackLink from "@/app/components/operations/OperationsBackLink";
import CustomerProfilingPage from "@/app/(dashboard)/dashboard/manual-entry/customer-profiling/page";

export default function OperationsCustomerProfilingPage() {
  return (
    <div className="operations-module-page">
      <OperationsBackLink />
      <CustomerProfilingPage />
    </div>
  );
}
