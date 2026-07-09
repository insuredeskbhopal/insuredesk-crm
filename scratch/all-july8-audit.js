const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date("2026-07-08T00:00:00Z"),
          lte: new Date("2026-07-08T23:59:59Z")
        }
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        userId: true
      }
    });

    console.log(`Found ${logs.length} Audit Logs on July 8:`);
    logs.forEach(log => {
      console.log(`- Time: ${log.createdAt.toISOString()} (${log.createdAt.toString()}) | Action: ${log.action} | Entity: ${log.entityType} | ID: ${log.entityId} | UserID: ${log.userId}`);
    });

  } catch (error) {
    console.error("Error reading audit logs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
