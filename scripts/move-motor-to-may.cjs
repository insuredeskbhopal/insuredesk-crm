const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");

  console.log(`Starting motor records migration. Mode: ${isExecute ? "EXECUTE" : "DRY RUN"}`);

  // Fetch all motor records
  const records = await prisma.policyRecord.findMany({
    where: {
      OR: [
        { selectedServiceCategory: { equals: "motor", mode: "insensitive" } },
        { detectedServiceCategory: { equals: "motor", mode: "insensitive" } },
        { selectedPolicyType: { contains: "motor", mode: "insensitive" } },
        { detectedPolicyType: { contains: "motor", mode: "insensitive" } }
      ]
    },
    include: {
      uploadedFile: true
    }
  });

  console.log(`Found ${records.length} motor records.`);

  for (const r of records) {
    console.log(`----------------------------------------`);
    console.log(`Record ID: ${r.id}`);
    console.log(`PDF Name: ${r.pdfFileName}`);
    console.log(`Category: ${r.selectedServiceCategory || r.detectedServiceCategory}`);
    
    // Calculate new dates (changing month to May)
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

    let fileUpdateDetails = "";
    if (r.uploadedFile) {
      const originalFileCreatedAt = r.uploadedFile.createdAt;
      const newFileCreatedAt = new Date(originalFileCreatedAt);
      newFileCreatedAt.setMonth(4);
      fileUpdateDetails = `UploadedFile(${r.uploadedFile.id}) CreatedAt: ${originalFileCreatedAt.toISOString()} -> ${newFileCreatedAt.toISOString()}`;
      console.log(fileUpdateDetails);
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
