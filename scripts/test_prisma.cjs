const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const records = await prisma.policyRecord.findMany({
      take: 1,
      select: { id: true, data: true }
    });
    console.log('Success connection. Record count:', records.length);
    
    // Test JSON querying with path and string_contains
    const filtered = await prisma.policyRecord.findMany({
      where: {
        reviewedData: {
          path: ['policyNumber'],
          string_contains: '123'
        }
      },
      take: 1
    });
    console.log('Filtered record count:', filtered.length);
  } catch (e) {
    console.error('Error testing JSON contains:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
