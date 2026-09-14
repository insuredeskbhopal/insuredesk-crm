require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { downloadGoogleDriveFile } = require('../src/lib/storage/google-drive-storage.js');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing PDF retrieval & parse on 3 records...');
  const recs = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      savedAt: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z')
      }
    },
    take: 3,
    select: {
      id: true,
      pdfFileName: true,
      pdfBytes: true,
      reviewedData: true,
      uploadedFile: {
        select: {
          id: true,
          storagePath: true,
          storageProvider: true
        }
      }
    }
  });

  for (const r of recs) {
    let buf = r.pdfBytes;
    if (!buf && r.uploadedFile?.storagePath) {
      if (r.uploadedFile.storageProvider === 'google_drive') {
        buf = await downloadGoogleDriveFile(r.uploadedFile.storagePath);
      }
    }
    console.log(`Record ${r.id}: hasBuffer=${Boolean(buf)}, len=${buf?.length || 0}`);
    if (buf) {
      const parsed = await pdf(buf);
      console.log(`  Parsed text length: ${parsed.text.length}, pages: ${parsed.numpages}`);
      console.log(`  First 150 chars: ${parsed.text.slice(0, 150).replace(/\s+/g, ' ')}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
