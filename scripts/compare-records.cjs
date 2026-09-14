require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rOld = await prisma.policyRecord.findUnique({
    where: { id: '3ddf7f7a-4d7c-4f81-9f8a-9b71664e0d90' },
    include: { uploadedFile: true }
  });
  const rNew = await prisma.policyRecord.findUnique({
    where: { id: '4029cc27-83e3-42cd-bab3-aaf21a5d77b0' },
    include: { uploadedFile: true }
  });

  console.log('--- OLD RECORD ---');
  console.log({
    id: rOld.id,
    savedAt: rOld.savedAt,
    contactPersonName: rOld.contactPersonName,
    contactPersonMobile: rOld.contactPersonMobile,
    pdfFileName: rOld.pdfFileName,
    upload: rOld.uploadedFile ? { id: rOld.uploadedFile.id, path: rOld.uploadedFile.storagePath } : null
  });

  console.log('--- TODAY RECORD ---');
  console.log({
    id: rNew.id,
    savedAt: rNew.savedAt,
    contactPersonName: rNew.contactPersonName,
    contactPersonMobile: rNew.contactPersonMobile,
    pdfFileName: rNew.pdfFileName,
    upload: rNew.uploadedFile ? { id: rNew.uploadedFile.id, path: rNew.uploadedFile.storagePath } : null
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
