const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning customer profiles...");
  
  const deletedProfiles = await prisma.customerProfile.deleteMany();
  console.log(`Deleted ${deletedProfiles.count} customer profile records.`);

  console.log("Customer profiles cleared successfully!");
}

main()
  .catch((error) => {
    console.error("Clean failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
