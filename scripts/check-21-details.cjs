require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ids = [
  '4029cc27-83e3-42cd-bab3-aaf21a5d77b0',
  'ffc226df-2eb0-4415-9936-897c8f866c38',
  '736ac7a1-c862-4aa8-9176-9296ef67c2fb',
  '1bbd6c70-71fe-42d5-a138-6761f2bc5c09',
  'b3ed53a9-63a6-48de-81bf-a20b382390df',
  'c5baf1cb-ef17-4755-9353-97794fc48977',
  '53c3fc86-9aec-4e4a-b876-5bade0988b8d',
  '83534676-1b3e-428c-ae40-dd386d2f005b',
  'f1420360-29aa-41ab-9ad5-7e7c3feba22b',
  '2aa5d166-3cea-4968-a7e4-aee71eeb8966',
  '6557093c-fee9-4c4b-bb74-8ea337ecac79',
  'f5dc364b-8c9a-4760-8061-9cb184e0c026',
  '1fde7c7e-f637-4025-9e9e-233d5e924334',
  'bae3d94a-c3f2-42d6-a4cf-fc486a0b651b',
  '3baffc34-80ce-46b7-af35-b1f2711396e5',
  '5918f485-d6f0-409d-b508-dc8ca48c02f2',
  'ddbbdfb0-8510-429a-a28b-a64900815a7f',
  'a66f6926-34f2-4ecb-8ba3-9429647e91e6',
  '00b629bb-8e6c-44a7-82ba-7813a727ff60',
  '3bd3903e-f2de-41da-b856-22eb4650c051',
  '928097ca-103d-4be8-816c-296cde0848c3'
];

async function main() {
  const records = await prisma.policyRecord.findMany({
    where: { id: { in: ids } },
    include: {
      uploadedFile: {
        select: {
          id: true,
          storagePath: true,
          storageProvider: true,
          sourceFile: true
        }
      }
    }
  });

  console.log(`Loaded ${records.length} records.`);
  records.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.id}] ${r.reviewedData?.insuredName || r.data?.insuredName}`);
    console.log(`   Reg: ${r.reviewedData?.registrationNumber || r.data?.registrationNumber}`);
    console.log(`   SavedAt: ${r.savedAt.toISOString()}`);
    console.log(`   Contact: ${r.contactPersonName} (${r.contactPersonMobile})`);
    console.log(`   Upload: provider=${r.uploadedFile?.storageProvider}, path=${r.uploadedFile?.storagePath}, hasBytes=${Boolean(r.pdfBytes)}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
