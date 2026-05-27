export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords } from "@/lib/scoped-data";

export default async function ManualPolicyEntryPage() {
  const records = await loadScopedPolicyRecords();
  return <Dashboard initialRecords={records.map(normalizeRecord)} activePage="manual-entry" />;
}
