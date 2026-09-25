const { PrismaClient } = require('@prisma/client');
const pdf = require('pdf-parse');
const prisma = new PrismaClient();

function normalizePolicyNumber(val) {
  if (!val) return '';
  return String(val).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

async function run() {
  console.log('--- Verifying All Linked PDFs in Batches ---');

  // First fetch just the IDs and metadata (no pdfBytes)
  const policyList = await prisma.$queryRawUnsafe(`
    SELECT
      id,
      pdf_file_name,
      source_file,
      uploaded_file_id,
      COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') AS policy_number,
      COALESCE(reviewed_data->>'insuredName', data->>'insuredName') AS insured_name
    FROM pdf_records
    WHERE deleted_at IS NULL
      AND (pdf_bytes IS NOT NULL OR uploaded_file_id IS NOT NULL)
  `);

  console.log(`Found ${policyList.length} policies to verify.`);

  let verifiedInText = 0;
  let verifiedInFilename = 0;
  let scannedOrNoText = 0;
  let mismatchCount = 0;

  const mismatches = [];
  const BATCH_SIZE = 25;

  for (let i = 0; i < policyList.length; i += BATCH_SIZE) {
    const chunk = policyList.slice(i, i + BATCH_SIZE);
    const chunkIds = chunk.map(c => `'${c.id}'`).join(',');

    const bytesData = await prisma.$queryRawUnsafe(`
      SELECT id, pdf_bytes FROM pdf_records WHERE id IN (${chunkIds})
    `);
    const byteMap = new Map();
    for (const b of bytesData) {
      if (b.pdf_bytes) byteMap.set(b.id, b.pdf_bytes);
    }

    for (const p of chunk) {
      const polNum = p.policy_number || '';
      const normPolNum = normalizePolicyNumber(polNum);
      const pdfBytes = byteMap.get(p.id);

      if (!pdfBytes || pdfBytes.length === 0) {
        mismatches.push({ id: p.id, policyNumber: polNum, reason: 'No pdfBytes in record' });
        mismatchCount++;
        continue;
      }

      let pdfText = '';
      try {
        const parsed = await pdf(pdfBytes);
        pdfText = parsed.text || '';
      } catch (e) {
        mismatches.push({ id: p.id, policyNumber: polNum, reason: 'Corrupted PDF: ' + e.message });
        mismatchCount++;
        continue;
      }

      const normText = normalizePolicyNumber(pdfText);

      if (normPolNum && normText.includes(normPolNum)) {
        verifiedInText++;
      } else {
        const fn = (p.pdf_file_name || '') + ' ' + (p.source_file || '');
        const normFn = normalizePolicyNumber(fn);
        if (normPolNum && normFn.includes(normPolNum)) {
          verifiedInFilename++;
        } else if (pdfText.trim().length < 50) {
          scannedOrNoText++;
        } else {
          mismatches.push({
            id: p.id,
            policyNumber: polNum,
            pdfFileName: p.pdf_file_name,
            snippet: pdfText.slice(0, 150).replace(/\s+/g, ' ')
          });
          mismatchCount++;
        }
      }
    }

    console.log(`Processed ${Math.min(i + BATCH_SIZE, policyList.length)}/${policyList.length} policies...`);
  }

  console.log('\n--- Final Verification Summary ---');
  console.log('Verified inside PDF text:', verifiedInText);
  console.log('Verified in Filename:', verifiedInFilename);
  console.log('Scanned / No text (< 50 chars):', scannedOrNoText);
  console.log('Mismatches / Unverified:', mismatchCount);
  if (mismatches.length > 0) {
    console.log('Mismatches sample:', mismatches.slice(0, 10));
  }

  await prisma.$disconnect();
}

run().catch(console.error);
