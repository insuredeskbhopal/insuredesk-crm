export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords } from "@/lib/records/scoped-data";

export default async function BulkUploadPage(props) {
  const searchParams = await props.searchParams;
  const q = searchParams.q || "";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const payload = await loadScopedPolicyRecords({ q, page, limit: 10 });
  return (
    <Dashboard
      initialRecords={payload.records.map(normalizeRecord)}
      activePage="bulk-entry"
      initialQ={q}
      totalCount={payload.totalCount}
      currentPage={payload.page}
      limit={payload.limit}
      totalPages={payload.totalPages}
      serverLoadError={payload.serverLoadError ? "Saved policies could not be loaded. Please try again." : ""}
    />
  );
}
