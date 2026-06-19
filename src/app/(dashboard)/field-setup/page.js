export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords } from "@/lib/records/scoped-data";

export default async function FieldSetupPage() {
  const records = await loadScopedPolicyRecords();
  return <Dashboard initialRecords={records.map(normalizeRecord)} activePage="field-setup" />;
}
