const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Diagnosing policy records in DB...");

  // Let's count records by extractionMethod and date
  const records = await prisma.policyRecord.findMany({
    select: {
      id: true,
      createdAt: true,
      savedAt: true,
      extractionMethod: true,
      sourceFile: true,
      pdfFileName: true,
      renewalStatus: true,
      isActivePolicy: true,
      data: true,
    }
  });

  console.log(`Total policy records in DB: ${records.length}`);

  // Group by extractionMethod
  const methodCounts = {};
  const dateCounts = {};
  const details = [];

  for (const r of records) {
    methodCounts[r.extractionMethod] = (methodCounts[r.extractionMethod] || 0) + 1;
    
    const createdDate = r.createdAt ? r.createdAt.toISOString().split("T")[0] : "unknown";
    dateCounts[createdDate] = (dateCounts[createdDate] || 0) + 1;

    // Check if imported yesterday (July 6th, 2026) or manual renewals
    if (createdDate === "2026-07-06" || r.extractionMethod === "renewal_excel_import" || r.sourceFile?.includes("Renewal")) {
      details.push({
        id: r.id,
        createdAt: r.createdAt,
        savedAt: r.savedAt,
        extractionMethod: r.extractionMethod,
        sourceFile: r.sourceFile,
        pdfFileName: r.pdfFileName,
        insuredName: r.data?.insuredName || "N/A",
        policyNumber: r.data?.policyNumber || "N/A",
      });
    }
  }

  console.log("Counts by extractionMethod:", methodCounts);
  console.log("Counts by creation date:", dateCounts);
  console.log(`\nPotential candidates for deletion (Count: ${details.length}):`);
  details.forEach((d, idx) => {
    console.log(`[${idx + 1}] ID: ${d.id} | Created: ${d.createdAt?.toISOString()} | Saved: ${d.savedAt?.toISOString()} | Method: ${d.extractionMethod} | File: ${d.sourceFile} | Insured: ${d.insuredName} | PolicyNo: ${d.policyNumber}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
