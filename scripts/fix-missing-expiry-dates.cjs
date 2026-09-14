require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fixes = [
    {
      id: 'fff822fa-024d-4174-acea-38797ebdca78',
      expiryDate: '2027-08-20',
      reason: 'Tata AIG CV Policy 6304280780 Period: 21/08/2026 to 20/08/2027'
    },
    {
      id: '6a9c043c-67ce-4264-99b4-cb787524d0d7',
      expiryDate: '2027-08-20',
      reason: 'Tata AIG CV Policy 6304280781 Period: 21/08/2026 to 20/08/2027'
    },
    {
      id: 'd1136587-a59e-4a3c-9415-80d35b2c76b7',
      expiryDate: '2027-08-20',
      reason: 'Tata AIG CV Policy 6304281715 Period: 21/08/2026 to 20/08/2027'
    },
    {
      id: '3e6c15ba-708d-4c3c-b906-5ed2e66b51ab',
      expiryDate: '2027-08-09',
      reason: 'Dharmendra Rai MP09HG5538 Start Date: 2026-08-10 -> Expiry Date: 2027-08-09'
    }
  ];

  for (const item of fixes) {
    const record = await prisma.policyRecord.findUnique({
      where: { id: item.id }
    });

    if (!record) {
      console.warn(`Record ${item.id} not found`);
      continue;
    }

    const reviewedData = {
      ...(record.reviewedData || {}),
      expiryDate: item.expiryDate,
      policyEndDate: item.expiryDate,
      endDate: item.expiryDate
    };

    const data = {
      ...(record.data || {}),
      expiryDate: item.expiryDate,
      policyEndDate: item.expiryDate,
      endDate: item.expiryDate
    };

    await prisma.policyRecord.update({
      where: { id: item.id },
      data: {
        reviewedData,
        data
      }
    });

    console.log(`Updated ${item.id} (${reviewedData.insuredName || 'Unknown'} - ${reviewedData.registrationNumber || ''}) with expiryDate: ${item.expiryDate}`);
  }

  console.log('\nAll 4 records successfully updated.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
