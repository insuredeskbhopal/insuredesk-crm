require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const up = await prisma.uploadedFile.findMany({
    where: { sourceFile: { contains: '5538' } },
    select: {
      id: true,
      sourceFile: true,
      extractedData: true,
      rawText: true
    }
  });
  console.log('Uploads for 5538:', up.length);
  up.forEach(u => {
    console.log({
      id: u.id,
      file: u.sourceFile,
      extracted: u.extractedData,
      rawLen: u.rawText?.length
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
