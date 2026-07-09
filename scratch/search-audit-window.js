const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date("2026-07-08T11:30:00Z"), // 17:00 IST
          lte: new Date("2026-07-08T13:00:00Z")  // 18:30 IST
        }
      },
      orderBy: { createdAt: "asc" }
    });

    console.log(`Found ${logs.length} Audit Logs in the window (17:00 - 18:30 IST):`);
    logs.forEach(log => {
      console.log(`- Time: ${log.createdAt.toISOString()} | Action: ${log.action} | Entity: ${log.entityType} | ID: ${log.entityId} | UserID: ${log.userId}`);
      console.log(`  Metadata:`, JSON.stringify(log.metadata));
    });

  } catch (error) {
    console.error("Error reading audit logs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
