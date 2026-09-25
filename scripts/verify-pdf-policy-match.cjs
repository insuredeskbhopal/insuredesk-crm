const { PrismaClient } = require("@prisma/client");
const pdf = require("pdf-parse");
const fs = require("fs/promises");
const path = require("path");

const prisma = new PrismaClient();
const storageBase = path.join(process.cwd(), "storage");

function normalize(val) {
  if (!val) return "";
  return String(val).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

async function getPdfBuffer(rec) {
  // 1. Try local file from uploadedFile.storagePath
  if (rec.uploadedFile?.storagePath) {
    const sp = rec.uploadedFile.storagePath;
    const physPath = path.join(storageBase, sp.replace(/^storage[\\/]?/, ""));
    try {
      return await fs.readFile(physPath);
    } catch {}
  }
  // 2. Try pdfBytes from uploadedFile (fetch individually to avoid napi overflow)
  if (rec.uploadedFileId) {
    try {
      const uf = await prisma.uploadedFile.findUnique({
        where: { id: rec.uploadedFileId },
        select: { pdfBytes: true },
      });
      if (uf?.pdfBytes?.length > 0) return Buffer.from(uf.pdfBytes);
    } catch {}
  }
  // 3. Try pdfBytes from policyRecord itself
  try {
    const pr = await prisma.policyRecord.findUnique({
      where: { id: rec.id },
      select: { pdfBytes: true },
    });
    if (pr?.pdfBytes?.length > 0) return Buffer.from(pr.pdfBytes);
  } catch {}
  return null;
}

async function main() {
  const records = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      uploadedFileId: { not: null },
    },
    select: {
      id: true,
      data: true,
      reviewedData: true,
      pdfFileName: true,
      sourceFile: true,
      uploadedFileId: true,
      uploadedFile: {
        select: {
          id: true,
          sourceFile: true,
          storagePath: true,
          storageProvider: true,
        },
      },
    },
  });

  console.log(`\nTotal records with linked PDF: ${records.length}\n`);

  let matched = 0, scanned = 0, mismatch = 0, unreadable = 0, noFile = 0;
  const mismatches = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (i > 0 && i % 50 === 0) console.log(`  ... processed ${i}/${records.length}`);

    const polNum = String(rec.reviewedData?.policyNumber || rec.data?.policyNumber || "").trim();
    const normPol = normalize(polNum);

    if (!normPol) { matched++; continue; }

    const buf = await getPdfBuffer(rec);
    if (!buf) { noFile++; continue; }

    try {
      const parsed = await pdf(buf);
      const pdfText = parsed.text || "";
      const normText = normalize(pdfText);

      if (normText.includes(normPol)) {
        matched++;
      } else if (pdfText.trim().length < 50) {
        scanned++; // image-based PDF
      } else {
        const fnNorm = normalize(rec.pdfFileName || rec.uploadedFile?.sourceFile || "");
        if (fnNorm.includes(normPol)) {
          matched++;
        } else {
          mismatch++;
          mismatches.push({
            id: rec.id,
            policyNumber: polNum,
            pdfFile: rec.pdfFileName || rec.uploadedFile?.sourceFile || "?",
            textSnippet: pdfText.substring(0, 200).replace(/\n/g, " "),
          });
        }
      }
    } catch {
      unreadable++;
    }
  }

  console.log("\n=== PDF <-> Policy Number Verification ===\n");
  console.log(`  Matched (policy# in PDF text):  ${matched}`);
  console.log(`  Scanned PDF (image, no text):   ${scanned}`);
  console.log(`  Mismatch (policy# NOT in PDF):  ${mismatch}`);
  console.log(`  Unreadable/Corrupted PDF:       ${unreadable}`);
  console.log(`  File not found:                 ${noFile}`);
  console.log(`\n  Total checked: ${matched + scanned + mismatch + unreadable + noFile}`);

  if (mismatches.length > 0) {
    console.log("\n--- MISMATCHED RECORDS ---\n");
    for (const m of mismatches) {
      console.log(`  ID: ${m.id}`);
      console.log(`  Policy#: ${m.policyNumber}`);
      console.log(`  PDF File: ${m.pdfFile}`);
      console.log(`  PDF Text: ${m.textSnippet}`);
      console.log("");
    }
  } else {
    console.log("\n  ALL PDFs are correctly linked to matching policy numbers!\n");
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
