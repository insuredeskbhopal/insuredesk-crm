export const dynamic = "force-dynamic";

import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords } from "@/lib/records/scoped-data";

export default async function DashboardPage(props) {
  const searchParams = await props.searchParams;
  const q = searchParams.q || "";
  const records = await loadScopedPolicyRecords({ q });
  return <Dashboard initialRecords={records.map(normalizeRecord)} activePage="dashboard" initialQ={q} />;
}
