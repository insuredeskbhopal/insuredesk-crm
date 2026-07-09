const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date("2026-07-08T12:10:00Z"), // 17:40 IST is 12:10 UTC
          lte: new Date("2026-07-08T12:20:00Z")  // 17:50 IST is 12:20 UTC
        }
      },
      orderBy: { createdAt: "asc" }
    });

    console.log(`Found ${logs.length} Audit Logs in the 10-minute window:`);
    logs.forEach(log => {
      console.log(`\n- Log ID: ${log.id}`);
      console.log(`  Entity: ${log.entityType} | ID: ${log.entityId}`);
      console.log(`  Action: ${log.action}`);
      console.log(`  User: ${log.userEmail || "System"} (${log.userId})`);
      console.log(`  Created At: ${log.createdAt}`);
      console.log(`  Changes:`, JSON.stringify(log.changes, null, 2));
      console.log(`  Metadata:`, JSON.stringify(log.metadata, null, 2));
    });

  } catch (error) {
    console.error("Error reading audit logs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
