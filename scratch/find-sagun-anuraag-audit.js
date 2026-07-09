const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const ids = [
    "9b6e755a-975d-429e-8223-da67e3e5202f", // ANURAAG
    "22097ba8-6dc1-49d3-9c5a-4bc85dca1611"  // SAGUN KUMAR
  ];

  try {
    const allLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" }
    });

    const filtered = allLogs.filter(log => {
      const logStr = JSON.stringify(log);
      return ids.some(id => logStr.includes(id));
    });

    console.log(`Found ${filtered.length} matching Audit Logs by searching text content:`);
    filtered.forEach(log => {
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
