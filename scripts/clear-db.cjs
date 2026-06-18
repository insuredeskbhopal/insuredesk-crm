const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");

  // Delete policy records first
  const deletedRecords = await prisma.policyRecord.deleteMany();
  console.log(`Deleted ${deletedRecords.count} policy records.`);

  // Delete uploaded files
  const deletedFiles = await prisma.uploadedFile.deleteMany();
  console.log(`Deleted ${deletedFiles.count} uploaded file logs.`);

  // Delete field definitions
  const deletedFields = await prisma.fieldDefinition.deleteMany();
  console.log(`Deleted ${deletedFields.count} custom field definitions.`);

  // Delete policy schemas
  const deletedSchemas = await prisma.policySchema.deleteMany();
  console.log(`Deleted ${deletedSchemas.count} policy schemas.`);

  // Delete policy types
  const deletedTypes = await prisma.policyType.deleteMany();
  console.log(`Deleted ${deletedTypes.count} policy types.`);

  // Delete bank sources
  const deletedBankSources = await prisma.bankSource.deleteMany();
  console.log(`Deleted ${deletedBankSources.count} bank sources.`);

  // Delete insurance companies
  const deletedCompanies = await prisma.insuranceCompany.deleteMany();
  console.log(`Deleted ${deletedCompanies.count} insurance companies.`);

  // Delete service categories
  const deletedCategories = await prisma.serviceCategory.deleteMany();
  console.log(`Deleted ${deletedCategories.count} service categories.`);

  console.log("Database cleared successfully!");
}

main()
  .catch((error) => {
    console.error("Clean failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
