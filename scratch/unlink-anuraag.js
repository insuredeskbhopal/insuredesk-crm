const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const policyId = "9b6e755a-975d-429e-8223-da67e3e5202f"; // ANURAAG

  console.log(`Unlinking and restoring status for policy: ${policyId}`);

  try {
    const updated = await prisma.policyRecord.update({
      where: { id: policyId },
      data: {
        renewalStatus: "ACTIVE",
        renewedPolicyId: null,
        isActivePolicy: true,
        renewalDate: null
      }
    });

    console.log("Successfully restored policy state in database!");
    console.log(`New Status: ${updated.renewalStatus}`);
    console.log(`Renewed Policy ID: ${updated.renewedPolicyId}`);
    console.log(`Is Active: ${updated.isActivePolicy}`);

  } catch (error) {
    console.error("Failed to restore policy state:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
