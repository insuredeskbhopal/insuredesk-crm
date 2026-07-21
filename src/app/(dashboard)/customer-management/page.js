export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedCustomerPolicyPage } from "@/lib/records/scoped-data";

export default async function CustomerManagementPage(props) {
  const searchParams = await props.searchParams;
  const q = searchParams.q || "";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const payload = await loadScopedCustomerPolicyPage({ q, page, limit: 12 });
  return (
    <Dashboard
      initialRecords={payload.records.map(normalizeRecord)}
      activePage="customers"
      initialQ={q}
      totalCount={payload.totalCount}
      currentPage={payload.page}
      limit={payload.limit}
      totalPages={payload.totalPages}
      serverPaginatedCustomers
      serverLoadError={payload.serverLoadError ? "Customers could not be loaded. Please try again." : ""}
    />
  );
}
