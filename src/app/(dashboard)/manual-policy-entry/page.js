export const dynamic = "force-dynamic";

import Dashboard from "@/app/ui/dashboard";

export default function ManualPolicyEntryPage() {
  return <Dashboard initialRecords={[]} activePage="manual-entry" />;
}
