const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuthAndData() {
  console.log('=== VERIFYING CLIENT PORTAL AUTH & DATA FLOW ===');
  const testPhone = '9999990001';
  const testMpin = process.argv[2] || '182603';

  // 1. Simulate authentication logic from src/app/api/auth/client/login/route.js
  const client = await prisma.clientAccount.findFirst({
    where: {
      phone: testPhone,
      deletedAt: null
    }
  });

  if (!client) {
    throw new Error('ClientAccount not found for test phone: ' + testPhone);
  }
  console.log('✓ Found ClientAccount:', { id: client.id, name: client.name, phone: client.phone });

  // 2. Retrieve credential Task
  const credSourceKey = `client-credential:${client.id}`;
  const credTask = await prisma.task.findUnique({
    where: { sourceKey: credSourceKey }
  });

  if (!credTask || !credTask.metadata?.mpinHash) {
    throw new Error('MPIN credential task not found for client: ' + client.id);
  }

  const isValidMpin = await bcrypt.compare(testMpin, credTask.metadata.mpinHash);
  if (!isValidMpin) {
    throw new Error('MPIN mismatch! Test MPIN does not match stored hash.');
  }
  console.log(`✓ MPIN ${testMpin} successfully verified with bcrypt hash.`);

  // 3. Verify Policy retrieval for this client
  const phoneSuffix = testPhone.slice(-10);
  const policies = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      OR: [
        { reviewedData: { path: ['clientId'], equals: client.id } },
        { data: { path: ['clientId'], equals: client.id } },
        { reviewedData: { path: ['mobileNumber'], string_contains: phoneSuffix } },
        { reviewedData: { path: ['phone'], string_contains: phoneSuffix } },
        { reviewedData: { path: ['contactNumber'], string_contains: phoneSuffix } }
      ]
    },
    take: 10
  });

  console.log(`✓ Fetched ${policies.length} live policy record(s) for client:`);
  policies.forEach(p => {
    const d = p.reviewedData || p.data;
    console.log(`   - Policy No: ${d.policyNumber || d.policyNo}, Company: ${d.insuranceCompany}, Premium: ₹${d.totalPremium || d.premium}`);
  });

  if (policies.length === 0) {
    throw new Error('No policies found for test client!');
  }

  // 4. Verify Claims retrieval for this client
  const claims = await prisma.claim.findMany({
    where: {
      deletedAt: null,
      OR: [
        { metadata: { path: ['customerId'], equals: client.id } },
        { mobileNo: { endsWith: phoneSuffix } },
        { policyNo: 'TEST-POL-990001' }
      ]
    }
  });

  console.log(`✓ Fetched ${claims.length} live claim record(s) for client:`);
  claims.forEach(c => {
    console.log(`   - Claim No: ${c.claimNo}, Status: ${c.claimStatus}, Type: ${c.claimType}`);
  });

  if (claims.length === 0) {
    throw new Error('No claims found for test client!');
  }

  // 5. Verify Service Requests retrieval for this client
  const srs = await prisma.task.findMany({
    where: {
      module: 'CLIENT_PORTAL_SUPPORT',
      deletedAt: undefined,
      OR: [
        { recordId: client.id },
        { customerMobile: testPhone }
      ]
    }
  });

  console.log(`✓ Fetched ${srs.length} live service request(s) for client:`);
  srs.forEach(sr => {
    console.log(`   - Ticket: ${sr.metadata?.ticketNo || sr.id}, Title: ${sr.title}, Status: ${sr.status}`);
  });

  if (srs.length === 0) {
    throw new Error('No service requests found for test client!');
  }

  console.log('\n=== ALL REAL CRM DATA VERIFIED SUCCESSFULLY ===');
}

testAuthAndData()
  .catch((err) => {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
