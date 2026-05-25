export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";

export default async function SettingsPage() {
  const records = await prisma.policyRecord.findMany({
    orderBy: { savedAt: "desc" }
  });
  return <Dashboard initialRecords={records.map(normalizeRecord)} activePage="settings" />;
}
