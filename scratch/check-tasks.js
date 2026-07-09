const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const policyId = "0b4ff214-5d29-4a33-ac06-0b87a5fc2cad";
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Querying DB (Attempt ${attempts}/${maxAttempts})...`);
    try {
      // 1. Search Tasks
      const tasks = await prisma.task.findMany({
        where: { recordId: policyId }
      });
      console.log(`\nFound ${tasks.length} Tasks in the database:`);
      tasks.forEach(t => {
        console.log(`- ID: ${t.id}`);
        console.log(`  Title: ${t.title}`);
        console.log(`  Status: ${t.status}`);
        console.log(`  Priority: ${t.priority}`);
        console.log(`  Due At: ${t.dueAt}`);
        console.log(`  Updated At: ${t.updatedAt}`);
      });

      // 2. Search Notifications
      const notifications = await prisma.notification.findMany({
        where: { recordId: policyId }
      });
      console.log(`\nFound ${notifications.length} Notifications in the database:`);
      notifications.forEach(n => {
        console.log(`- ID: ${n.id}`);
        console.log(`  Title: ${n.title}`);
        console.log(`  Message: ${n.message}`);
        console.log(`  Severity: ${n.severity}`);
        console.log(`  Created At: ${n.createdAt}`);
      });

      return; // Success, exit main

    } catch (error) {
      console.warn(`Attempt ${attempts} failed: ${error.message}`);
      if (attempts >= maxAttempts) {
        console.error("All database attempts failed.");
      } else {
        await new Promise(r => setTimeout(r, 2000)); // wait 2 seconds
      }
    }
  }

  await prisma.$disconnect();
}

main();
