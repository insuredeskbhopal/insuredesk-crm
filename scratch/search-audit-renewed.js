const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: "POLICY_RENEWED" },
          {
            createdAt: {
              gte: new Date("2026-07-08T00:00:00Z"),
              lte: new Date("2026-07-08T23:59:59Z")
            }
          }
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    console.log(`Found ${logs.length} Audit Logs:`);
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
