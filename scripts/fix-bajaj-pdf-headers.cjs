require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bajajFiles = [
  'MS ADITYA EVENT_MP04ZL4271_2026-27.pdf',
  'MS GSAGENCIES_MP04KG2833_2026-27 POLICY.pdf',
  'MS M.P. AGROTONICS LIMITED_PB39M9839_2026-27.pdf',
  'RAKESHTIWARI_MP05ZB6573_2026-27.pdf',
  'SHEETALNATH BUILDERS PVT LTD_MP04ZY0123_2026-27.pdf',
  'SUNIL CHAUDHARY_MP04CV3258_2026-27.pdf'
];

async function main() {
  console.log('=== FIXING BAJAJ ALLIANZ PDF HEADERS ===\n');

  for (const filename of bajajFiles) {
    const p1 = path.join(process.cwd(), 'storage', 'aug motor', filename);
    const p2 = path.join(process.cwd(), 'storage', 'uploads', '2026', '08', filename);

    let buf = null;
    let targetPath = null;
    if (fs.existsSync(p1)) {
      buf = fs.readFileSync(p1);
      targetPath = p1;
    } else if (fs.existsSync(p2)) {
      buf = fs.readFileSync(p2);
      targetPath = p2;
    }

    if (buf) {
      const idx = buf.indexOf('%PDF-');
      if (idx > 0) {
        console.log(`Fixing ${filename}: stripping ${idx} leading bytes`);
        const cleaned = buf.slice(idx);
        fs.writeFileSync(targetPath, cleaned);
        if (fs.existsSync(p2) && targetPath !== p2) {
          fs.writeFileSync(p2, cleaned);
        }

        // Update in PostgreSQL
        const updated = await prisma.policyRecord.updateMany({
          where: {
            deletedAt: null,
            OR: [
              { pdfFileName: filename },
              { sourceFile: filename }
            ]
          },
          data: {
            pdfBytes: cleaned
          }
        });
        console.log(`  ✓ Updated DB pdfBytes for ${filename} (${updated.count} records updated)`);
      } else {
        console.log(`${filename} already starts with %PDF-`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
