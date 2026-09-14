require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'pdf_records',
    'policies',
    'renewal_records',
    'leads',
    'customer_profiles',
    'clients'
  ];

  for (const t of tables) {
    try {
      const res = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${t}'
      `);
      const cols = res.map(c => c.column_name);
      console.log(`Table: ${t}, columns:`, cols.filter(c => c.includes('veh') || c.includes('reg') || c.includes('data')));
    } catch (e) {
      console.log(`Table ${t} does not exist or error:`, e.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
