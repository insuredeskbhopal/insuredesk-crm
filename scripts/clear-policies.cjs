const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning policy records and upload logs...");

  // Delete policy records first
  const deletedRecords = await prisma.policyRecord.deleteMany();
  console.log(`Deleted ${deletedRecords.count} policy records.`);

  // Delete uploaded files
  const deletedFiles = await prisma.uploadedFile.deleteMany();
  console.log(`Deleted ${deletedFiles.count} uploaded file logs.`);

  console.log(
    "Policy data cleared successfully (Users, Organizations, Master configuration, and Fields are untouched)!",
  );
}

main()
  .catch((error) => {
    console.error("Clean failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
