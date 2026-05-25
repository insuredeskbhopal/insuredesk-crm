import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import Dashboard from "@/app/ui/dashboard";

export default async function DashboardPage({
  activePage = "dashboard",
  customerId = "",
  policyId = ""
}) {
  try {
    const records = await prisma.policyRecord.findMany({
      orderBy: { savedAt: "desc" },
      select: {
        id: true,
        savedAt: true,
        data: true,
        reviewedData: true,
        extractedData: true,
        extractionMethod: true,
        extractionQuality: true,
        extractionLog: true,
        confidenceScore: true,
        pdfFileName: true,
        pdfMimeType: true
      }
    });

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
