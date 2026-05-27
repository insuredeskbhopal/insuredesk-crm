import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";
import { loadScopedPolicyRecords } from "@/lib/scoped-data";

export default async function DashboardPage({
  activePage = "dashboard",
  customerId = "",
  policyId = ""
}) {
  try {
    const records = await loadScopedPolicyRecords();

    return (
      <Dashboard
        initialRecords={records.map(normalizeRecord)}
        initialPage={activePage}
        initialCustomerId={customerId}
        initialPolicyId={policyId}
      />
    );
  } catch (error) {
    console.error("Prisma fetch failed:", error);

    return (
      <main className="state-page">
        <section className="state-card error-state">
          <div className="state-icon">!</div>
          <p className="eyebrow">Database connection failed</p>
          <h1>Could not load policy records</h1>
          <p>
            {error?.message ||
              "The app could not connect to the database. Please verify your database settings and try again."}
          </p>
        </section>
      </main>
    );
  }
}
