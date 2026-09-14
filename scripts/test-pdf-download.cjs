require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { downloadGoogleDriveFile } = require('../src/lib/storage/google-drive-storage.js');
const fs = require('fs/promises');

async function main() {
  console.log('=== TESTING PDF DOWNLOAD FOR AUGUST RECORDS ===\n');

  // Test 3 random August records
  const sampleRecords = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      savedAt: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z')
      },
      uploadedFile: { isNot: null }
    },
    take: 3,
    include: { uploadedFile: true }
  });

  for (const rec of sampleRecords) {
    console.log(`Testing record ID: ${rec.id}`);
    console.log(` - Insured: ${rec.reviewedData?.insuredName}`);
    console.log(` - Vehicle: ${rec.reviewedData?.registrationNumber}`);
    console.log(` - SavedAt: ${rec.savedAt.toISOString()}`);
    console.log(` - Storage Provider: ${rec.uploadedFile?.storageProvider}`);
    console.log(` - Storage Path: ${rec.uploadedFile?.storagePath}`);

    let downloadedBuffer = null;
    if (rec.uploadedFile?.storageProvider === 'google_drive') {
      try {
        downloadedBuffer = await downloadGoogleDriveFile(rec.uploadedFile.storagePath);
        console.log(`   ✓ Successfully downloaded from Google Drive: ${downloadedBuffer.length} bytes`);
      } catch (err) {
        console.warn(`   ! Google Drive download failed: ${err.message}, checking fallback`);
      }
    }

    if (!downloadedBuffer && rec.pdfBytes) {
      downloadedBuffer = rec.pdfBytes;
      console.log(`   ✓ Successfully fetched from DB pdfBytes: ${downloadedBuffer.length} bytes`);
    }

    if (downloadedBuffer) {
      console.log(`   ✓ RESULT: PDF is 100% DOWNLOADABLE (${downloadedBuffer.length} bytes)\n`);
    } else {
      console.error(`   ✗ RESULT: PDF download failed\n`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
