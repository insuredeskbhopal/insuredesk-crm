const { PrismaClient } = require("@prisma/client");
const { syncDueFollowUpNotifications } = require("../src/lib/operations-center/engine.js");

async function main() {
  console.log("Running syncDueFollowUpNotifications...");
  try {
    const result = await syncDueFollowUpNotifications();
    console.log("Sync completed successfully. Result:", result);
  } catch (error) {
    console.error("Sync failed:", error);
  }
}

main();
