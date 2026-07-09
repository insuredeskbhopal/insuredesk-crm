const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const sagunId = "22097ba8-6dc1-49d3-9c5a-4bc85dca1611";

  try {
    const policy = await prisma.policyRecord.findUnique({
      where: { id: sagunId }
    });

    if (!policy) {
      console.log("SAGUN KUMAR policy not found.");
      return;
    }

    console.log("--- SAGUN KUMAR RAW DATA ---");
    console.log("contactNumber:", policy.data.contactNumber);
    console.log("customerMobile:", policy.data.customerMobile);
    console.log("contactPerson:", policy.data.contactPerson);
    console.log("insuredName:", policy.data.insuredName);

    console.log("\n--- SAGUN KUMAR REVIEWED DATA ---");
    console.log("contactNumber:", policy.reviewedData.contactNumber);
    console.log("customerMobile:", policy.reviewedData.customerMobile);
    console.log("contactPerson:", policy.reviewedData.contactPerson);
    console.log("insuredName:", policy.reviewedData.insuredName);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
