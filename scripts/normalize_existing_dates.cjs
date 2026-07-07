const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function normalizeDateToYMD(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  let cleanStr = dateStr.trim();
  if (!cleanStr) return "";

  // Remove prefixes like "00:00 of ", "00:00 of the "
  cleanStr = cleanStr.replace(/^[0-9]{2}:[0-9]{2}(?:\s+of\s+the|\s+of)?\s+/i, "");

  // If already YYYY-MM-DD
  if (/^\d{4}-(?:0[1-9]|1[0-2])-(?:[0-2][0-9]|3[0-1])$/.test(cleanStr)) {
    return cleanStr;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmYMatch = cleanStr.match(/^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-](\d{4})$/);
  if (dmYMatch) {
    const d = dmYMatch[1].padStart(2, "0");
    const m = dmYMatch[2].padStart(2, "0");
    const y = dmYMatch[3];
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YY or DD-MM-YY
  const dmY2Match = cleanStr.match(/^([0-2]?[0-9]|3[0-1])[/-](0?[1-9]|1[0-2])[/-](\d{2})$/);
  if (dmY2Match) {
    const d = dmY2Match[1].padStart(2, "0");
    const m = dmY2Match[2].padStart(2, "0");
    const yShort = dmY2Match[3];
    const y = Number(yShort) > 50 ? `19${yShort}` : `20${yShort}`;
    return `${y}-${m}-${d}`;
  }

  const parsed = Date.parse(cleanStr);
  if (!isNaN(parsed)) {
    const dateObj = new Date(parsed);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return dateStr.trim();
}

async function main() {
  console.log("Starting date normalization for all existing database policy records...");

  const records = await prisma.policyRecord.findMany({
    select: {
      id: true,
      data: true,
      extractedData: true,
      reviewedData: true,
    }
  });

  console.log(`Checking ${records.length} records...`);
  let updatedCount = 0;

  const dateKeys = ["startDate", "expiryDate", "issuanceDate", "registrationDate", "invoiceDate"];

  for (const r of records) {
    let hasChanges = false;

    const data = r.data ? { ...r.data } : {};
    const extractedData = r.extractedData ? { ...r.extractedData } : {};
    const reviewedData = r.reviewedData ? { ...r.reviewedData } : {};

    for (const key of dateKeys) {
      if (data[key]) {
        const norm = normalizeDateToYMD(data[key]);
        if (norm && norm !== data[key]) {
          console.log(`[ID: ${r.id}] data.${key}: "${data[key]}" -> "${norm}"`);
          data[key] = norm;
          hasChanges = true;
        }
      }
      if (extractedData[key]) {
        const norm = normalizeDateToYMD(extractedData[key]);
        if (norm && norm !== extractedData[key]) {
          console.log(`[ID: ${r.id}] extractedData.${key}: "${extractedData[key]}" -> "${norm}"`);
          extractedData[key] = norm;
          hasChanges = true;
        }
      }
      if (reviewedData[key]) {
        const norm = normalizeDateToYMD(reviewedData[key]);
        if (norm && norm !== reviewedData[key]) {
          console.log(`[ID: ${r.id}] reviewedData.${key}: "${reviewedData[key]}" -> "${norm}"`);
          reviewedData[key] = norm;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await prisma.policyRecord.update({
        where: { id: r.id },
        data: {
          data,
          extractedData,
          reviewedData,
        }
      });
      updatedCount++;
    }
  }

  console.log(`\nMigration completed: Successfully normalized date formats of ${updatedCount} policy records.`);
}

main()
  .catch((err) => {
    console.error("Migration script failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
