require('dotenv').config();
const fs = require('fs');
const pdf = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');
const { extractPolicyFromText } = require('../src/lib/policies/pdf/extractor.cjs');

const prisma = new PrismaClient();

async function main() {
  const filePath = 'storage/LION ENGINEERING CONSULTANTS PRIVATE LIMITED_MP04ZF4664_2026-27 (1).pdf';
  const buf = fs.readFileSync(filePath);
  const pdfData = await pdf(buf);

  const extracted = extractPolicyFromText(pdfData.text, 'LION ENGINEERING CONSULTANTS PRIVATE LIMITED_MP04ZF4664_2026-27 (1).pdf');

  console.log('Extracted Policy:', {
    policyNumber: extracted.policyNumber,
    insuredName: extracted.insuredName,
    registrationNumber: extracted.registrationNumber,
    totalPremium: extracted.totalPremium,
    netPremium: extracted.netPremium,
    odPremium: extracted.odPremium,
    tpPremium: extracted.tpPremium,
    modeOfPayment: extracted.modeOfPayment
  });

  const fullData = {
    ...extracted,
    contactPerson: 'ARJUN SIR',
    contactNumber: '9111111692',
    customerMobile: '9111111692',
    modeOfPayment: 'NEFT / RTGS',
    paymentMode: 'NEFT / RTGS',
    paymentMethod: 'NEFT',
    paymentReference: 'UCBAH26222382015',
    bankName: 'UNION BANK'
  };

  const targetDate = new Date('2026-08-31T12:00:00.000Z');

  const existingRecords = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      OR: [
        { reviewedData: { path: ['policyNumber'], equals: 'N8294142' } },
        { data: { path: ['policyNumber'], equals: 'N8294142' } },
        { data: { path: ['Policy No.'], equals: 'N8294142' } },
        { reviewedData: { path: ['registrationNumber'], equals: 'MP04ZF4664' } }
      ]
    }
  });

  if (existingRecords.length > 0) {
    for (const record of existingRecords) {
      console.log(`Updating existing record ${record.id} to August 2026...`);
      await prisma.policyRecord.update({
        where: { id: record.id },
        data: {
          savedAt: targetDate,
          createdAt: targetDate,
          reviewedData: fullData,
          data: fullData
        }
      });

      if (record.uploadedFileId) {
        try {
          await prisma.uploadedFile.update({
            where: { id: record.uploadedFileId },
            data: {
              createdAt: targetDate
            }
          });
        } catch (e) {
          console.log('Note: uploadedFile update skipped:', e.message);
        }
      }
      console.log(`Record ${record.id} updated successfully to August month.`);
    }
  } else {
    console.log('Creating new record for N8294142 in August 2026...');
    const newRecord = await prisma.policyRecord.create({
      data: {
        id: require('crypto').randomUUID(),
        savedAt: targetDate,
        createdAt: targetDate,
        reviewedData: fullData,
        data: fullData
      }
    });
    console.log(`Created new record ${newRecord.id} in August month.`);
  }

  // Verify the updated record in DB
  const check = await prisma.$queryRaw`
    SELECT id, saved_at, created_at, reviewed_data->>'policyNumber' as policy_number, reviewed_data->>'contactPerson' as contact_person, reviewed_data->>'contactNumber' as contact_number, reviewed_data->>'insuredName' as insured_name, reviewed_data->>'totalPremium' as total_premium, reviewed_data->>'netPremium' as net_premium
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND (
        reviewed_data::text LIKE '%N8294142%'
        OR data::text LIKE '%N8294142%'
      )
  `;
  console.log('=== VERIFICATION FROM DATABASE ===');
  console.log(check);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
