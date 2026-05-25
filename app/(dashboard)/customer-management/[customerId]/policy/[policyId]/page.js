export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";

export default async function PolicyDetailPage({ params }) {
  const { customerId, policyId } = await params;
  const records = await prisma.policyRecord.findMany({
    orderBy: { savedAt: "desc" }
  });
  return (
    <Dashboard
      initialRecords={records.map(normalizeRecord)}
      activePage="customers"
      selectedClientName={decodeURIComponent(customerId)}
      selectedPolicyId={policyId}
    />
  );
}
