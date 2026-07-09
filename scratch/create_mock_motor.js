const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@insure.com";
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!adminUser) {
    console.error("Admin user not found!");
    return;
  }

  const organizationId = adminUser.organizationId;
  const actorId = adminUser.id;

  const mockPolicyId = randomUUID();
  const today = new Date();
  
  // Set expiry date to tomorrow
  const expiryDate = new Date();
  expiryDate.setDate(today.getDate() + 1);
  const expiryStr = expiryDate.toISOString().split("T")[0]; // YYYY-MM-DD

  const startDate = new Date();
  startDate.setFullYear(today.getFullYear() - 1);
  const startStr = startDate.toISOString().split("T")[0];

  const payload = {
    insuredName: "Rahul Kumar (Mock)",
    contactNumber: "8839707135",
    customerMobile: "8839707135",
    policyNumber: "MOT-8839707135",
    insuranceCompany: "Bajaj Allianz General Insurance Co. Ltd.",
    policyType: "Private Car Package Policy",
    premium: 12500,
    totalPremium: 12500,
    startDate: startStr,
    expiryDate: expiryStr,
    policyEndDate: expiryStr,
    assignedTo: adminUser.name || adminUser.email,
    assignedToId: actorId
  };

  const record = await prisma.policyRecord.create({
    data: {
      id: mockPolicyId,
      savedAt: today,
      data: payload,
      reviewedData: payload,
      selectedCompany: "Bajaj Allianz General Insurance Co. Ltd.",
      selectedPolicyType: "Private Car Package Policy",
      renewalStatus: "ACTIVE",
      isActivePolicy: true,
      organizationId: organizationId,
      createdById: actorId,
      updatedById: actorId
    }
  });

  console.log("Mock Motor Policy created successfully!");
  console.log(JSON.stringify(record, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
