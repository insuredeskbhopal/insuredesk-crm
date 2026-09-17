const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Creating/Updating Real Test Client in CRM Database ---');

  const testPhone = '9999990001';
  // Generate a secure random 6-digit MPIN (100000 - 999999)
  const testMpin = crypto.randomInt(100000, 1000000).toString();
  const testName = 'TEST ACCOUNT - Mobile Client';
  const testEmail = 'test.client@bimaheadquarter.com';

  // 1. Create or update ClientAccount
  let client = await prisma.clientAccount.findFirst({
    where: { phone: testPhone }
  });

  if (!client) {
    client = await prisma.clientAccount.create({
      data: {
        name: testName,
        phone: testPhone,
        email: testEmail,
        organizationId: null,
      }
    });
    console.log('✓ Created ClientAccount:', { id: client.id, name: client.name, phone: client.phone });
  } else {
    client = await prisma.clientAccount.update({
      where: { id: client.id },
      data: {
        name: testName,
        email: testEmail,
        deletedAt: null
      }
    });
    console.log('✓ Updated existing ClientAccount:', { id: client.id, name: client.name, phone: client.phone });
  }

  // 2. Set 6-digit MPIN credential in Task table
  const salt = await bcrypt.genSalt(10);
  const mpinHash = await bcrypt.hash(testMpin, salt);
  const credSourceKey = `client-credential:${client.id}`;

  const existingCred = await prisma.task.findUnique({
    where: { sourceKey: credSourceKey },
    select: { metadata: true }
  });

  const credentialVersion = Number(existingCred?.metadata?.credentialVersion || 0) + 1;
  const credMetadata = {
    mpinHash,
    failedAttempts: 0,
    lockedUntil: null,
    credentialVersion
  };

  await prisma.task.upsert({
    where: { sourceKey: credSourceKey },
    create: {
      organizationId: null,
      title: 'Client portal credential',
      description: 'Secured client MPIN credential for test account.',
      type: 'SERVICE_REQUEST',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      module: 'CLIENT_PORTAL_SECURITY',
      recordId: client.id,
      recordLabel: client.name,
      customerName: client.name,
      customerMobile: client.phone,
      sourceKey: credSourceKey,
      metadata: credMetadata,
      completedAt: new Date(),
      archivedAt: new Date(),
    },
    update: {
      metadata: credMetadata,
      recordLabel: client.name,
      customerName: client.name,
      customerMobile: client.phone,
      updatedAt: new Date(),
    }
  });
  console.log('✓ Saved 6-digit MPIN credential (bcrypt hashed). Version:', credentialVersion);

  // 3. Create or update Test Policy in PolicyRecord
  const expiryDateObj = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000); // 18 days in future
  const expiryDateStr = expiryDateObj.toISOString().split('T')[0];

  const policyPayload = {
    clientId: client.id,
    policyNumber: 'TEST-POL-990001',
    insuranceCompany: 'ICICI Lombard General Insurance',
    policyType: 'Motor Comprehensive',
    totalPremium: '18,450',
    premium: '18450',
    sumInsured: '6,50,000',
    vehicleNumber: 'MP-04-AB-1234',
    registrationNumber: 'MP-04-AB-1234',
    makeModel: 'Hyundai Creta SX',
    insuredName: client.name,
    mobileNumber: testPhone,
    phone: testPhone,
    contactNumber: testPhone,
    expiryDate: expiryDateStr,
    policyExpiryDate: expiryDateStr,
    renewalStatus: 'DUE',
    isActivePolicy: true,
  };

  let policy = await prisma.policyRecord.findFirst({
    where: {
      reviewedData: {
        path: ['policyNumber'],
        equals: 'TEST-POL-990001'
      }
    }
  });

  if (!policy) {
    policy = await prisma.policyRecord.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: null,
        pdfFileName: 'TEST_MOTOR_POLICY_SCHEDULE.pdf',
        pdfMimeType: 'application/pdf',
        selectedCompany: 'ICICI Lombard General Insurance',
        selectedPolicyType: 'Motor Comprehensive Insurance',
        isActivePolicy: true,
        renewalDate: expiryDateObj,
        renewalStatus: 'DUE',
        reviewedData: policyPayload,
        data: policyPayload,
      }
    });
    console.log('✓ Created Test PolicyRecord:', { id: policy.id, policyNumber: 'TEST-POL-990001' });
  } else {
    policy = await prisma.policyRecord.update({
      where: { id: policy.id },
      data: {
        reviewedData: policyPayload,
        data: policyPayload,
        renewalDate: expiryDateObj,
        renewalStatus: 'DUE',
        deletedAt: null
      }
    });
    console.log('✓ Updated existing Test PolicyRecord:', { id: policy.id, policyNumber: 'TEST-POL-990001' });
  }

  // 4. Create or update Test Claim in Claim table
  let claim = await prisma.claim.findFirst({
    where: { claimNo: 'TEST-CLM-7701' }
  });

  if (!claim) {
    claim = await prisma.claim.create({
      data: {
        organizationId: null,
        insuredName: client.name,
        claimNo: 'TEST-CLM-7701',
        policyNo: 'TEST-POL-990001',
        claimType: 'Motor Accidental Repair',
        claimStatus: 'SURVEYOR_ASSIGNED',
        claimDescription: 'Front bumper & headlight cashless repair authorized at Bhopal Prime Motors',
        claimDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        mobileNo: testPhone,
        metadata: {
          customerId: client.id,
          claimAmount: '24,500',
          garageOrHospital: 'Bhopal Prime Motors Workshop',
          surveyorName: 'Rahul Verma (Senior Surveyor)'
        }
      }
    });
    console.log('✓ Created Test Claim:', { id: claim.id, claimNo: claim.claimNo });
  } else {
    claim = await prisma.claim.update({
      where: { id: claim.id },
      data: {
        insuredName: client.name,
        policyNo: 'TEST-POL-990001',
        claimStatus: 'SURVEYOR_ASSIGNED',
        mobileNo: testPhone,
        metadata: {
          customerId: client.id,
          claimAmount: '24,500',
          garageOrHospital: 'Bhopal Prime Motors Workshop',
          surveyorName: 'Rahul Verma (Senior Surveyor)'
        },
        deletedAt: null
      }
    });
    console.log('✓ Updated existing Test Claim:', { id: claim.id, claimNo: claim.claimNo });
  }

  // 5. Create or update Test Service Request in Task table
  const srSourceKey = `client-sr:test-sr-101`;
  await prisma.task.upsert({
    where: { sourceKey: srSourceKey },
    create: {
      organizationId: null,
      title: 'Address Endorsement on Motor Policy',
      description: 'Customer requested address endorsement on Policy #TEST-POL-990001',
      type: 'SERVICE_REQUEST',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      module: 'CLIENT_PORTAL_SUPPORT',
      recordId: client.id,
      recordLabel: client.name,
      customerName: client.name,
      customerMobile: testPhone,
      sourceKey: srSourceKey,
      metadata: {
        customerId: client.id,
        ticketNo: 'SR-TEST-101',
        requestType: 'ENDORSEMENT',
        remarks: 'Documents verified. Endorsement schedule being generated.'
      }
    },
    update: {
      title: 'Address Endorsement on Motor Policy',
      description: 'Customer requested address endorsement on Policy #TEST-POL-990001',
      status: 'IN_PROGRESS',
      metadata: {
        customerId: client.id,
        ticketNo: 'SR-TEST-101',
        requestType: 'ENDORSEMENT',
        remarks: 'Documents verified. Endorsement schedule being generated.'
      }
    }
  });
  console.log('✓ Created/Updated Test Service Request #SR-TEST-101');

  console.log('\n=============================================================');
  console.log('REAL TEST CLIENT READY FOR PRODUCTION/MOBILE USE:');
  console.log('Name:       ', client.name);
  console.log('Client ID:  ', client.id);
  console.log('Mobile (ID):', testPhone);
  console.log('6-Digit MPIN:', testMpin);
  console.log('Policy No:  ', 'TEST-POL-990001 (ICICI Lombard Motor - ₹18,450)');
  console.log('Claim No:   ', 'TEST-CLM-7701 (Motor Repair - ₹24,500)');
  console.log('Ticket No:  ', 'SR-TEST-101 (Address Endorsement)');
  console.log('=============================================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
