require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Updating Dharmendra Rai MP09HG5538 ---');
  const dharId = '3e6c15ba-708d-4c3c-b906-5ed2e66b51ab';
  const recs = await prisma.$queryRaw`SELECT * FROM pdf_records WHERE id = ${dharId}::uuid`;
  if (recs.length > 0) {
    const rec = recs[0];
    const reviewed = {
      ...(rec.reviewed_data || {}),
      policyNumber: 'VGC1606513000100',
      policyType: 'COMMERCIAL - PACKAGE',
      insuranceCompany: 'Royal Sundaram General Insurance Co. Limited',
      insuredName: 'Mr.DHARMENDRA RAI',
      contactPerson: 'DHARMENDRA RAI',
      contactNumber: '9893112093',
      registrationNumber: 'MP09HG5538',
      vehicleNumber: 'MP09HG5538',
      make: 'Tata Motors Ltd.',
      model: 'LPT 3118 MS open',
      engineNumber: '11G63156132',
      chassisNumber: 'MAT466417B5G12448',
      manufacturingYear: '2011',
      grossVehicleWeight: '35000',
      idv: '760000.00',
      ncb: '35%',
      netPremium: '45544.00',
      totalPremium: '48028.42',
      odPremium: '1494.00',
      tpPremium: '44050.00',
      startDate: '2026-08-10',
      expiryDate: '2027-08-09',
      policyStartDate: '2026-08-10',
      policyEndDate: '2027-08-09',
      rtoLocation: 'INDORE',
      documentCategory: 'Motor Insurance'
    };

    const dataObj = {
      ...(rec.data || {}),
      ...reviewed
    };

    await prisma.$queryRaw`
      UPDATE pdf_records
      SET 
        reviewed_data = ${JSON.stringify(reviewed)}::jsonb,
        data = ${JSON.stringify(dataObj)}::jsonb,
        updated_at = NOW()
      WHERE id = ${dharId}::uuid
    `;
    console.log('✓ Successfully updated Dharmendra Rai record with exact extracted PDF data');
  }

  console.log('\n--- Cleaning non-motor false registration numbers ---');
  // For any non-motor record, remove vehicle registration numbers (e.g. Workmen Compensation)
  const nonMotorRecs = await prisma.$queryRaw`
    SELECT id, reviewed_data, data
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND saved_at >= '2026-08-01'
      AND saved_at <= '2026-08-31T23:59:59.999Z'
      AND (
        reviewed_data->>'documentCategory' NOT ILIKE '%Motor%'
        AND reviewed_data->>'documentCategory' IS NOT NULL
      )
      AND (
        reviewed_data->>'registrationNumber' IS NOT NULL 
        AND reviewed_data->>'registrationNumber' != ''
      )
  `;

  console.log(`Found ${nonMotorRecs.length} non-motor records with false registration numbers`);

  for (const r of nonMotorRecs) {
    const rev = { ...(r.reviewed_data || {}) };
    const dat = { ...(r.data || {}) };
    delete rev.registrationNumber;
    delete rev.vehicleNumber;
    delete dat.registrationNumber;
    delete dat.vehicleNumber;

    await prisma.$queryRaw`
      UPDATE pdf_records
      SET 
        reviewed_data = ${JSON.stringify(rev)}::jsonb,
        data = ${JSON.stringify(dat)}::jsonb,
        updated_at = NOW()
      WHERE id = ${r.id}::uuid
    `;
    console.log(`✓ Cleaned registrationNumber from non-motor record: ${r.id}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
