export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords } from "@/lib/scoped-data";

export default async function PolicyRecordsPage() {
  const records = await loadScopedPolicyRecords({ includeInactive: true });
  return <Dashboard initialRecords={records.map(normalizeRecord)} activePage="records" />;
}
