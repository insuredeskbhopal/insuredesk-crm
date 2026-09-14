require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.policyRecord.findUnique({
    where: { id: '12ae5ead-18dd-44b0-9a76-d898d6fb69d8' }
  });
  console.log('uploadedFileId:', r.uploadedFileId);
  if (r.uploadedFileId) {
    const u = await prisma.uploadedFile.findUnique({
      where: { id: r.uploadedFileId }
    });
    console.log('uploadedFile found:', !!u);
    if (u) {
      console.log('filename:', u.originalFileName || u.fileName);
      console.log('extractedText snippet:', (u.extractedText || '').slice(0, 500));
    }
  }
}

main().finally(() => prisma.$disconnect());
