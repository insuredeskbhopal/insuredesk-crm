export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedCustomerPolicies } from "@/lib/records/scoped-data";

export default async function PolicyDetailPage({ params }) {
  const { customerId, policyId } = await params;
  const customerName = decodeURIComponent(customerId);
  const records = await loadScopedCustomerPolicies(customerName);
  return (
    <Dashboard
      initialRecords={records.map(normalizeRecord)}
      activePage="customers"
      selectedClientName={customerName}
      selectedPolicyId={policyId}
    />
  );
}
