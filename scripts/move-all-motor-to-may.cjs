const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");

  console.log(`Starting comprehensive motor records migration. Mode: ${isExecute ? "EXECUTE" : "DRY RUN"}`);

  // Fetch all motor records currently in June 2026
  const startOfJune = new Date("2026-06-01T00:00:00.000Z");
  const endOfJune = new Date("2026-06-30T23:59:59.999Z");

  const records = await prisma.policyRecord.findMany({
    where: {
      savedAt: {
        gte: startOfJune,
        lte: endOfJune
      },
      OR: [
        { selectedServiceCategory: { contains: "motor", mode: "insensitive" } },
        { detectedServiceCategory: { contains: "motor", mode: "insensitive" } },
        { selectedPolicyType: { contains: "motor", mode: "insensitive" } },
        { detectedPolicyType: { contains: "motor", mode: "insensitive" } },
        { selectedPolicyType: { contains: "car", mode: "insensitive" } },
        { detectedPolicyType: { contains: "car", mode: "insensitive" } },
        { selectedPolicyType: { contains: "wheeler", mode: "insensitive" } },
        { detectedPolicyType: { contains: "wheeler", mode: "insensitive" } },
        { selectedPolicyType: { contains: "vehicle", mode: "insensitive" } },
        { detectedPolicyType: { contains: "vehicle", mode: "insensitive" } }
      ]
    },
    include: {
      uploadedFile: true
    }
  });

  console.log(`Found ${records.length} motor records in June.`);

  for (const r of records) {
    console.log(`----------------------------------------`);
    console.log(`Record ID: ${r.id}`);
    console.log(`PDF Name: ${r.pdfFileName}`);
    console.log(`Category: ${r.selectedServiceCategory || r.detectedServiceCategory}`);
    console.log(`Policy Type: ${r.selectedPolicyType || r.detectedPolicyType}`);
    
    // Calculate new dates (changing month from June/Month 5 to May/Month 4)
    const originalSavedAt = r.savedAt;
    const originalCreatedAt = r.createdAt;
    const originalUpdatedAt = r.updatedAt;

    const newSavedAt = new Date(originalSavedAt);
    newSavedAt.setMonth(4); // Month 4 is May (0-indexed)

    const newCreatedAt = new Date(originalCreatedAt);
    newCreatedAt.setMonth(4);

    const newUpdatedAt = new Date(originalUpdatedAt);
    newUpdatedAt.setMonth(4);

    console.log(`SavedAt:  ${originalSavedAt.toISOString()} -> ${newSavedAt.toISOString()}`);
    console.log(`CreatedAt: ${originalCreatedAt.toISOString()} -> ${newCreatedAt.toISOString()}`);
    console.log(`UpdatedAt: ${originalUpdatedAt.toISOString()} -> ${newUpdatedAt.toISOString()}`);

    if (r.uploadedFile) {
      const originalFileCreatedAt = r.uploadedFile.createdAt;
      const newFileCreatedAt = new Date(originalFileCreatedAt);
      newFileCreatedAt.setMonth(4);
      console.log(`UploadedFile(${r.uploadedFile.id}) CreatedAt: ${originalFileCreatedAt.toISOString()} -> ${newFileCreatedAt.toISOString()}`);
    }

    if (isExecute) {
      // Perform updates
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
      console.log(`STATUS: Successfully updated in database.`);
    } else {
      console.log(`STATUS: Dry run (no database changes made).`);
    }
  }

  console.log(`\nMigration complete. Total processed: ${records.length}`);
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
