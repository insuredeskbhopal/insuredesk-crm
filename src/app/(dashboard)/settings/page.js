export const dynamic = "force-dynamic";

import { getTenantFilter } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { withoutManualRenewalSources } from "@/lib/records/manual-renewal-source";
import { getCurrentSessionFromCookies } from "@/lib/records/scoped-data";

export default async function SettingsPage() {
  const session = await getCurrentSessionFromCookies();
  const visiblePolicyCount = session
    ? await prisma.policyRecord.count({
        where: withoutManualRenewalSources({
          ...getTenantFilter(session, "read"),
          deletedAt: null,
          isActivePolicy: true,
        }),
      })
    : 0;

  return (
    <section className="settings-grid">
      <section className="glass-panel">
        <p className="eyebrow">Database</p>
        <h2>Prisma + Neon</h2>
        <div className="settings-list">
          <div><span>Stack</span><strong>Next.js App Router</strong></div>
          <div><span>ORM</span><strong>Prisma</strong></div>
          <div><span>Database</span><strong>Neon PostgreSQL</strong></div>
        </div>
      </section>
      <section className="glass-panel">
        <p className="eyebrow">Status</p>
        <h2>Current environment</h2>
        <div className="settings-list">
          <div><span>Records available</span><strong>{visiblePolicyCount}</strong></div>
          <div><span>Uploads queued</span><strong>0</strong></div>
          <div><span>Mock seed data</span><strong>Removed</strong></div>
        </div>
      </section>
    </section>
  );
}
