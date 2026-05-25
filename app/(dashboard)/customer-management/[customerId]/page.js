export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";

export default async function CustomerProfilePage({ params }) {
  const { customerId } = await params;
  const records = await prisma.policyRecord.findMany({
    orderBy: { savedAt: "desc" }
  });
  return (
    <Dashboard
      initialRecords={records.map(normalizeRecord)}
      activePage="customers"
      selectedClientName={decodeURIComponent(customerId)}
    />
  );
}
