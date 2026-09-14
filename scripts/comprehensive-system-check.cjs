require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== COMPREHENSIVE CRM SYSTEM CHECK ===\n');

  // 1. Overall Database Record Counts
  const totalRecords = await prisma.policyRecord.count({ where: { deletedAt: null } });
  console.log(`Total Active Policy Records in DB: ${totalRecords}`);

  // 2. Check September 2026
  const septDateStart = new Date('2026-09-01T00:00:00.000Z');
  const septDateEnd = new Date('2026-09-30T23:59:59.999Z');

  const septRecords = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      savedAt: { gte: septDateStart, lte: septDateEnd }
    },
    select: {
      id: true,
      selectedServiceCategory: true,
      detectedServiceCategory: true,
      selectedPolicyType: true,
      pdfFileName: true,
      pdfBytes: true,
      data: true,
      reviewedData: true,
      sourceFile: true,
    }
  });

  console.log(`\n--- SEPTEMBER 2026 ANALYSIS ---`);
  console.log(`Total September Records: ${septRecords.length}`);

  let septMotor = 0;
  let septWarehouse = 0;
  let septHealth = 0;
  let septOther = 0;
  let septWithPdf = 0;

  for (const r of septRecords) {
    const d = { ...(r.data || {}), ...(r.reviewedData || {}) };
    const polType = (r.selectedPolicyType || d.policyType || '').toLowerCase();
    const servCat = (r.selectedServiceCategory || r.detectedServiceCategory || d.policyCategory || d.documentCategory || '').toLowerCase();
    const veh = (d.vehicleNumber || d.registrationNumber || '').trim();
    const source = (r.sourceFile || r.pdfFileName || '').toLowerCase();
    const hasPdf = Boolean(r.pdfFileName && (r.pdfBytes || r.uploadedFileId));

    if (hasPdf) septWithPdf++;

    if (veh || /motor|vehicle|private car|two wheeler|bike|package policy|act policy|third party|tp/i.test(polType) || servCat.includes('motor')) {
      septMotor++;
    } else if (/warehouse|fire|burglary|msme|sfsp|property|fidelity/i.test(polType) || /warehouse|fire|burglary/i.test(servCat) || source.includes('warehouse')) {
      septWarehouse++;
    } else if (/health|mediclaim|hospital|floater|optima/i.test(polType) || servCat.includes('health') || source.includes('health')) {
      septHealth++;
    } else {
      septOther++;
    }
  }

  console.log(`September Breakdown:`);
  console.log(`  Motor Policies:     ${septMotor}`);
  console.log(`  Warehouse Policies: ${septWarehouse}`);
  console.log(`  Health Policies:    ${septHealth}`);
  console.log(`  Other Policies:     ${septOther}`);
  console.log(`  Records with PDF:   ${septWithPdf}`);

  // 3. Check August 2026
  const augDateStart = new Date('2026-08-01T00:00:00.000Z');
  const augDateEnd = new Date('2026-08-31T23:59:59.999Z');

  const augRecords = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      savedAt: { gte: augDateStart, lte: augDateEnd }
    },
    select: {
      id: true,
      selectedServiceCategory: true,
      detectedServiceCategory: true,
      selectedPolicyType: true,
      sourceFile: true,
      pdfFileName: true,
      data: true,
      reviewedData: true,
    }
  });

  console.log(`\n--- AUGUST 2026 ANALYSIS ---`);
  console.log(`Total August Records: ${augRecords.length}`);
  let augMotor = 0, augWarehouse = 0, augOther = 0;
  for (const r of augRecords) {
    const d = { ...(r.data || {}), ...(r.reviewedData || {}) };
    const polType = (r.selectedPolicyType || d.policyType || '').toLowerCase();
    const servCat = (r.selectedServiceCategory || r.detectedServiceCategory || d.policyCategory || d.documentCategory || '').toLowerCase();
    const veh = (d.vehicleNumber || d.registrationNumber || '').trim();
    if (veh || /motor|vehicle|private car|two wheeler/i.test(polType) || servCat.includes('motor')) {
      augMotor++;
    } else if (/warehouse|fire|burglary|msme|sfsp|property|fidelity/i.test(polType) || /warehouse|fire|burglary/i.test(servCat)) {
      augWarehouse++;
    } else {
      augOther++;
    }
  }
  console.log(`August Breakdown:`);
  console.log(`  Motor Policies:     ${augMotor}`);
  console.log(`  Warehouse Policies: ${augWarehouse}`);
  console.log(`  Other Policies:     ${augOther}`);

  // 4. Check for Any Duplicates in Database
  const duplicates = await prisma.$queryRaw`
    SELECT 
      COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') as pol_no,
      COUNT(*)::integer as count
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '') != ''
    GROUP BY COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', '')
    HAVING COUNT(*) > 1
  `;
  console.log(`\n--- DUPLICATES CHECK ---`);
  console.log(`Duplicate Policy Numbers Count: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('Duplicates:', duplicates.slice(0, 5));
  }

  // 5. Check September Motor Missing Fields Audit
  const septMotorRecords = septRecords.filter(r => {
    const d = { ...(r.data || {}), ...(r.reviewedData || {}) };
    const polType = (r.selectedPolicyType || d.policyType || '').toLowerCase();
    const servCat = (r.selectedServiceCategory || r.detectedServiceCategory || d.policyCategory || d.documentCategory || '').toLowerCase();
    const veh = (d.vehicleNumber || d.registrationNumber || '').trim();
    return (veh || servCat.includes('motor'));
  });

  console.log(`\n--- SEPTEMBER MOTOR QUALITY AUDIT (${septMotorRecords.length} records) ---`);
  let missingVeh = 0, missingName = 0, missingPolNo = 0, missingNet = 0, missingGross = 0, missingContact = 0, missingPdf = 0;
  for (const r of septMotorRecords) {
    const d = { ...(r.data || {}), ...(r.reviewedData || {}) };
    if (!d.vehicleNumber && !d.registrationNumber) missingVeh++;
    if (!d.insuredName) missingName++;
    if (!d.policyNumber) missingPolNo++;
    if (!d.netPremium) missingNet++;
    if (!d.totalPremium && !d.grossPremium) missingGross++;
    if (!d.contactNumber && !d.customerMobile) missingContact++;
    if (!r.pdfFileName) missingPdf++;
  }
  console.log(`Missing Vehicle:  ${missingVeh}`);
  console.log(`Missing Name:     ${missingName}`);
  console.log(`Missing PolicyNo: ${missingPolNo}`);
  console.log(`Missing Net Prem: ${missingNet}`);
  console.log(`Missing Gross:    ${missingGross}`);
  console.log(`Missing Contact:  ${missingContact}`);
  console.log(`Missing PDF:      ${missingPdf}`);

  console.log('\n=== ALL CHECKS FINISHED ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
