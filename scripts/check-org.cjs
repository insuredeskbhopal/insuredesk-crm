require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  console.log('Org:', org ? { id: org.id, name: org.name } : null);
  const user = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  console.log('Super admin user:', user ? { id: user.id, email: user.email } : null);
}

main().catch(console.error).finally(() => prisma.$disconnect());
