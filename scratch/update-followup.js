const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const policyId = "0b4ff214-5d29-4a33-ac06-0b87a5fc2cad";
  const targetDate = "2026-07-09T11:56";

  console.log(`Setting follow-up to: ${targetDate} for policy: ${policyId}`);

  try {
    const policy = await prisma.policyRecord.findUnique({
      where: { id: policyId }
    });

    if (!policy) {
      console.error("Policy not found!");
      return;
    }

    const reviewed = policy.reviewedData ? { ...policy.reviewedData } : {};
    if (!reviewed.renewalFollowUp) {
      reviewed.renewalFollowUp = {};
    }
    reviewed.renewalFollowUp.nextFollowUpDate = targetDate;
    reviewed.renewalFollowUp.lastRemarkAt = new Date().toISOString();

    const data = policy.data ? { ...policy.data } : {};
    if (!data.renewalFollowUp) {
      data.renewalFollowUp = {};
    }
    data.renewalFollowUp.nextFollowUpDate = targetDate;
    data.renewalFollowUp.lastRemarkAt = new Date().toISOString();

    await prisma.policyRecord.update({
      where: { id: policyId },
      data: {
        reviewedData: reviewed,
        data: data
      }
    });

    console.log("Policy successfully updated with target follow-up time!");

  } catch (error) {
    console.error("Failed to update follow-up:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
