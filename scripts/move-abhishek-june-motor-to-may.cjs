const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");
  const userId = "30f1e9c6-7b55-4b49-a1c6-748a42df0fd8"; // Abhishek Verma

  console.log(`Starting simplified migration. Mode: ${isExecute ? "EXECUTE" : "DRY RUN"}`);

  const startOfJune = new Date("2026-06-01T00:00:00.000Z");
  const endOfJune = new Date("2026-06-30T23:59:59.999Z");

  // Fetch all June records created by Abhishek Verma
  const allRecords = await prisma.policyRecord.findMany({
    where: {
      createdById: userId,
      savedAt: {
        gte: startOfJune,
        lte: endOfJune
      }
    },
    include: {
      uploadedFile: true
    }
  });

  // Filter in memory: exclude non-motor policies
  const records = allRecords.filter((r) => {
    // Exclude Hariom Warehouse
    if (r.pdfFileName && r.pdfFileName.includes("HARIOM WAREHOUSE")) {
      return false;
    }
    // Exclude other non-motor categories if they happen to exist
    const category = (r.selectedServiceCategory || r.detectedServiceCategory || "").toLowerCase();
    if (category.includes("fire") || category.includes("warehouse")) {
      return false;
    }
    return true;
  });

  console.log(`Found ${records.length} motor records to move.`);

  for (const r of records) {
    const originalSavedAt = r.savedAt;
    const originalCreatedAt = r.createdAt;
    const originalUpdatedAt = r.updatedAt;

    const newSavedAt = new Date(originalSavedAt);
    newSavedAt.setMonth(4); // May

    const newCreatedAt = new Date(originalCreatedAt);
    newCreatedAt.setMonth(4); // May

    const newUpdatedAt = new Date(originalUpdatedAt);
    newUpdatedAt.setMonth(4); // May

    console.log(`Record ID: ${r.id} | File: ${r.pdfFileName} | New SavedAt: ${newSavedAt.toISOString()}`);

    if (isExecute) {
      await prisma.policyRecord.update({
        where: { id: r.id },
        data: {
          savedAt: newSavedAt,
          createdAt: newCreatedAt,
          updatedAt: newUpdatedAt
        }
      });

      if (r.uploadedFile) {
        const newFileCreatedAt = new Date(r.uploadedFile.createdAt);
        newFileCreatedAt.setMonth(4);
        
        await prisma.uploadedFile.update({
          where: { id: r.uploadedFile.id },
          data: {
            createdAt: newFileCreatedAt
          }
        });
      }
    }
  }

  console.log(`\nProcessed ${records.length} records.`);
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
