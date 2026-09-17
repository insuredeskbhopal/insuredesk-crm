const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const TARGET_CLIENT_ID = '496919e5-e4ff-4c10-b530-228a03864ad9';
  const NEW_MPIN = '112233'; // 6-digit MPIN to set

  const client = await prisma.clientAccount.findUnique({
    where: { id: TARGET_CLIENT_ID }
  });

  if (!client) {
    console.error('Client not found!');
    return;
  }

  console.log('Client:', client.name, '|', client.phone);

  const salt = await bcrypt.genSalt(10);
  const mpinHash = await bcrypt.hash(NEW_MPIN, salt);

  const existing = await prisma.task.findUnique({
    where: { sourceKey: `client-credential:${TARGET_CLIENT_ID}` }
  });

  const credVersion = Number(existing?.metadata?.credentialVersion || 0) + 1;

  await prisma.task.upsert({
    where: { sourceKey: `client-credential:${TARGET_CLIENT_ID}` },
    create: {
      title: 'Client portal credential',
      description: 'Secured client MPIN credential.',
      type: 'SERVICE_REQUEST',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      module: 'CLIENT_PORTAL_SECURITY',
      recordId: TARGET_CLIENT_ID,
      recordLabel: client.name,
      customerName: client.name,
      customerMobile: client.phone,
      sourceKey: `client-credential:${TARGET_CLIENT_ID}`,
      metadata: { mpinHash, failedAttempts: 0, lockedUntil: null, credentialVersion: credVersion },
      completedAt: new Date(),
      archivedAt: new Date(),
    },
    update: {
      metadata: { mpinHash, failedAttempts: 0, lockedUntil: null, credentialVersion: credVersion },
      updatedAt: new Date(),
    }
  });

  console.log('\n========================================');
  console.log('✓ MPIN SET SUCCESSFULLY');
  console.log('========================================');
  console.log('Client Name :', client.name);
  console.log('Phone Number:', client.phone);
  console.log('Client ID   :', client.id);
  console.log('MPIN        :', NEW_MPIN);
  console.log('========================================');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
