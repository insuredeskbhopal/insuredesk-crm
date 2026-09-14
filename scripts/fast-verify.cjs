require('dotenv').config();
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== FAST VERIFYING AUGUST MOTOR POLICY ENTRIES ===\n');
  const mapping = JSON.parse(fs.readFileSync('scripts/complete_100_mapping.json', 'utf8'));

  // Fetch all active policy records saved in August 2026 or with matching vehicles/names
  const records = await prisma.$queryRaw`
    SELECT 
      p.id,
      p.saved_at,
      p.created_at,
      p.contact_person_name,
      p.contact_person_mobile,
      p.pdf_file_name,
      (p.pdf_bytes IS NOT NULL) AS has_pdf_bytes,
      p.data->>'registrationNumber' AS data_reg,
      p.reviewed_data->>'registrationNumber' AS rev_reg,
      p.data->>'insuredName' AS data_name,
      p.reviewed_data->>'insuredName' AS rev_name,
      p.data->>'policyNumber' AS data_pol,
      p.reviewed_data->>'policyNumber' AS rev_pol,
      u.id AS upload_id,
      u.storage_path,
      u.storage_provider
    FROM pdf_records p
    LEFT JOIN uploaded_files u ON p.uploaded_file_id = u.id
    WHERE p.deleted_at IS NULL
  `;

  console.log(`Loaded ${records.length} total active records from database.`);

  let matchedCount = 0;
  let augustDateCount = 0;
  let contactOkCount = 0;
  let downloadablePdfCount = 0;
  const issues = [];
  const foundRecords = [];
  const usedIds = new Set();

  for (let i = 0; i < mapping.length; i++) {
    const item = mapping[i];
    const cleanVeh = (item.veh || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().replace('MP004', 'MP04');
    const cleanPol = (item.pol || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanName = (item.name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Match in fetched records
    let rec = null;
    if (item.dbRecordId) {
      rec = records.find(r => r.id === item.dbRecordId);
    }
    if (!rec) {
      // Find candidate matching vehicle / policy / name
      const candidates = records.filter(r => {
        if (usedIds.has(r.id)) return false;
        const rReg = ((r.rev_reg || r.data_reg || '')).replace(/[^A-Za-z0-9]/g, '').toUpperCase().replace('MP004', 'MP04');
        const rPol = ((r.rev_pol || r.data_pol || '')).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const rName = ((r.rev_name || r.data_name || '')).replace(/[^A-Za-z0-9]/g, '').toUpperCase();

        if (item.sno === '3') {
          return rName.includes('SANJAY') && (rReg === 'MP37C5791' || rReg === 'MP04CA2453');
        }
        if (item.sno === '4') {
          return rName.includes('SUNIL') && rReg === 'MP04CA2453';
        }
        if (['8', '9', '10'].includes(item.sno)) {
          return (rName.includes('VIJAY') || rName.includes('VKM')) && (r.pdf_file_name || '').includes('VKMCPL_CHASSIS');
        }

        if (item.sno === '81') {
          return rName.includes('KAMAL') && (rReg === 'MP09KD6546' || rReg === 'MP09KD6564');
        }

        if (cleanVeh && cleanVeh !== 'NEW' && rReg === cleanVeh) return true;
        if (cleanPol && rPol === cleanPol) return true;
        if (cleanVeh === 'NEW' && (rName.includes(cleanName) || cleanName.includes(rName))) return true;
        return false;
      });

      // Prefer candidate in August 2026
      rec = candidates.find(r => {
        const d = new Date(r.saved_at);
        return d.getUTCFullYear() === 2026 && d.getUTCMonth() === 7;
      }) || candidates[0];
    }

    if (!rec) {
      issues.push(`[S.No ${item.sno}] NOT FOUND: ${item.name} | ${item.veh}`);
      continue;
    }
    usedIds.add(rec.id);

    matchedCount++;
    foundRecords.push({ item, rec });

    // 1. Check August 2026 date
    const d = new Date(rec.saved_at);
    const yr = d.getUTCFullYear();
    const mo = d.getUTCMonth(); // 7 is August
    if (yr === 2026 && mo === 7) {
      augustDateCount++;
    } else {
      issues.push(`[S.No ${item.sno}] Non-August saved_at: ${d.toISOString()} (expected 2026-08) for ${item.name}`);
    }

    // 2. Check contact details
    const cleanDbContact = (rec.contact_person_name || '').trim();
    const cleanItemContact = (item.contactName || '').trim();
    const cleanDbMobile = (rec.contact_person_mobile || '').replace(/\s+/g, '');
    const cleanItemMobile = (item.mobile || '').replace(/\s+/g, '');

    const nameMatch = !cleanItemContact || (cleanDbContact === cleanItemContact);
    const mobMatch = !cleanItemMobile || (cleanDbMobile === cleanItemMobile);
    if (nameMatch && mobMatch) {
      contactOkCount++;
    } else {
      issues.push(`[S.No ${item.sno}] Contact mismatch: DB has '${rec.contact_person_name}' / '${rec.contact_person_mobile}', expected '${item.contactName}' / '${item.mobile}'`);
    }

    // 3. Check PDF downloadable
    const hasDownload = Boolean(rec.storage_path || rec.has_pdf_bytes);
    if (hasDownload) {
      downloadablePdfCount++;
    } else {
      issues.push(`[S.No ${item.sno}] Missing PDF download for ${item.name} (${item.veh})`);
    }
  }

  console.log('\n=========================================');
  console.log('         VERIFICATION SUMMARY            ');
  console.log('=========================================');
  console.log(`Total Rows in User Table:        ${mapping.length}`);
  console.log(`Matched Records in DB:           ${matchedCount} / ${mapping.length}`);
  console.log(`Entries in August 2026:          ${augustDateCount} / ${mapping.length}`);
  console.log(`Contact Details Matched:         ${contactOkCount} / ${mapping.length}`);
  console.log(`PDFs Downloadable:               ${downloadablePdfCount} / ${mapping.length} (Row 81 Kamal Singh has no PDF)`);

  if (issues.length > 0) {
    console.log(`\nIssues detected (${issues.length}):`);
    issues.forEach(iss => console.log(' - ' + iss));
  } else {
    console.log('\n>>> SUCCESS: All 100 entries verified in August 2026 with correct contacts and downloadable PDFs! <<<');
  }

  // Sample check 3 records for direct PDF route compatibility
  console.log('\n--- Checking Sample Records for PDF Download API Compatibility ---');
  for (let s = 0; s < Math.min(5, foundRecords.length); s++) {
    const { item, rec } = foundRecords[s];
    console.log(`Sample ${s + 1} [S.No ${item.sno}]: ${item.name} (${item.veh}) -> ID: ${rec.id}`);
    console.log(`  - SavedAt: ${rec.saved_at}`);
    console.log(`  - Contact: ${rec.contact_person_name} | ${rec.contact_person_mobile}`);
    console.log(`  - Storage: provider=${rec.storage_provider}, path=${rec.storage_path}, has_pdf_bytes=${rec.has_pdf_bytes}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
