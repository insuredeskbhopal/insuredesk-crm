const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../storage/BH1.xlsx');
const backupPath = path.join(__dirname, '../storage/BH1.backup.xlsx');

const isDryRun = process.argv.includes('--dry-run');

const monthMap = {
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'september': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12
};

function formatAndValidate(y, m, d) {
  const pad = n => String(n).padStart(2, '0');
  let year = parseInt(y, 10);
  const month = parseInt(m, 10);
  let day = parseInt(d, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (year < 100) year = year <= 25 ? 2000 + year : 1900 + year;
  if (month < 1 || month > 12) return null;
  if (month === 11 && day === 31) day = 30; // Nov 30 fix

  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

function cleanPhone(raw) {
  if (!raw) return { primary: null, alternate: null };
  const str = String(raw).trim();
  const parts = str.split(/[/,&|\n]+/).map(p => p.trim()).filter(Boolean);
  const cleanDigits = (p) => {
    let d = p.replace(/\D/g, '');
    if (d.startsWith('91') && d.length === 12) d = d.slice(2);
    if (d.startsWith('0') && d.length === 11) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : null;
  };
  const primary = parts[0] ? cleanDigits(parts[0]) : null;
  const alternate = parts[1] ? cleanDigits(parts[1]) : null;
  return { primary, alternate };
}

function parseDob(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    return formatAndValidate(d.y, d.m, d.d);
  }
  let s = String(raw).replace(/\u00A0/g, ' ').trim();
  if (s === '' || s.toUpperCase() === 'NA' || s === '-' || s.toUpperCase() === 'SWICHED OFF' || s.toUpperCase() === 'USY') {
    return null;
  }
  s = s.replace(/^DATE\s*[:\-]\s*/i, '').trim();

  // Handle specific typo: 074-jan-14 -> 2014-01-07
  if (/^0?74[-/]jan[-/]14$/i.test(s)) {
    return formatAndValidate(2014, 1, 7);
  }

  // Pattern: YYYY-MM-DD
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    return formatAndValidate(m[1], m[2], m[3]);
  }

  // Pattern: DD-MM-YYYY or DD.MM.YYYY or DD/MM/YYYY
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    return formatAndValidate(m[3], m[2], m[1]);
  }

  // Pattern: DD-MM-YY or DD.MM.YY or DD/MM/YY
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (m) {
    return formatAndValidate(m[3], m[2], m[1]);
  }

  // Pattern: '6th March 1983' or '1ST JULY 1958' or '1ST JAN 1961'
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)\s+(\d{4})$/i);
  if (m) {
    const mon = monthMap[m[2].toLowerCase()];
    if (mon) return formatAndValidate(m[3], mon, m[1]);
  }

  // Pattern: '30-JULY-92' or '27-JUNE-1980' or '13-FEB-2002'
  m = s.match(/^(\d{1,2})[-/]([a-zA-Z]+)[-/](\d{2,4})$/i);
  if (m) {
    const mon = monthMap[m[2].toLowerCase()];
    if (mon) return formatAndValidate(m[3], mon, m[1]);
  }

  // Pattern without year: '14-NOV', '21-SEP', '11-JUNE', '22-MARCH', '15-APRIL', '19-oct', '12-dec', '5-july', '31-nov'
  m = s.match(/^(\d{1,2})[-/]([a-zA-Z]+)$/i);
  if (m) {
    const mon = monthMap[m[2].toLowerCase()];
    if (mon) return formatAndValidate(2000, mon, m[1]);
  }

  // Pattern without year: '16th September', '25 April'
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)$/i);
  if (m) {
    const mon = monthMap[m[2].toLowerCase()];
    if (mon) return formatAndValidate(2000, mon, m[1]);
  }

  return null;
}

function cleanName(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/[\r\n]+/g, ' ')
    .replace(/^[-,\s]+|[-,\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log(`--- Starting Birthday Sync (isDryRun: ${isDryRun}) ---`);

  // 1. Backup source file if not already backed up
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup of original Excel file at ${backupPath}`);
  }

  // Read backup file as source of truth for raw unadulterated data
  const sourcePath = fs.existsSync(backupPath) ? backupPath : filePath;
  const wb = XLSX.readFile(sourcePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet);
  console.log(`Loaded ${rawRows.length} rows from source Excel`);

  const knownPhoneToName = {
    '9575136777': 'Prateek Goyal',
    '9993382370': 'Ashish',
    '7470901186': 'Satya & Group',
    '9893876400': 'Namo Narayan',
    '9926704700': 'Mansa Ji',
    '9993062123': 'Ramesh',
    '7354444525': 'Shree Hariharanand',
    '9229591515': 'Maa Kripa',
    '9575949600': 'Modi Agri Estate',
    '6264774819': 'Maa Ambika',
    '8839463742': 'Rahuveer Shree'
  };

  const knownNameToPhone = {
    'PIYUSH SAHU': '9893086191',
    'RAJNEESH KUMAR SINGH': '7869451106',
    'MAHESH KUMAR AHUJA': '9893989803',
    'VOSMI SHARMA': '7000338920'
  };

  // 2. Parse and normalize each row
  const parsedRecords = [];
  rawRows.forEach((r, idx) => {
    const rowNum = idx + 2;
    let name = cleanName(r['NAME']);
    let dobRaw = r['DATE OF BIRTH'];
    let phoneRaw = r['MOBILE NO'];
    let lob = cleanName(r['LINE OF BUSINESS']);
    let remark = cleanName(r['REMARK']);

    // Special case corrections identified during deep analysis
    if (rowNum === 313) {
      name = 'Dhirendra Singh Chouhan';
      lob = 'Pooja & Aashapura Warehouse';
    } else if (rowNum === 481) {
      name = 'Sunil Singh';
      lob = 'Aastha Warehousing Corporation';
      remark = 'Ambey Traders, Arun Marg, Nehru Nagar, Rewa, MP - 486001';
    } else if (rowNum === 110) {
      name = 'Utkarsh Arya';
      dobRaw = null;
      lob = 'Shri Rajendra Prasad Warehouse';
    }

    let { primary: phone, alternate: alternatePhone } = cleanPhone(phoneRaw);

    if (!phone && name && knownNameToPhone[name.toUpperCase()]) {
      phone = knownNameToPhone[name.toUpperCase()];
    }

    if (!name && phone && knownPhoneToName[phone]) {
      name = knownPhoneToName[phone];
    }

    const dob = parseDob(dobRaw);

    parsedRecords.push({
      originalRow: rowNum,
      sno: r['S.NO.'],
      name: name || 'Unnamed Customer',
      dob, // string YYYY-MM-DD or null
      phone, // 10-digit string or null
      alternatePhone,
      lob,
      remark
    });
  });

  // 3. Deduplicate / Merge exact duplicates
  // Group by (phone || 'NO_PHONE') + '|||' + name.toLowerCase()
  const mergedMap = new Map();

  parsedRecords.forEach(rec => {
    const key = `${rec.phone || 'NO_PHONE'}|||${rec.name.toLowerCase().trim()}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...rec });
    } else {
      const existing = mergedMap.get(key);
      if (!existing.dob && rec.dob) existing.dob = rec.dob;
      if (!existing.alternatePhone && rec.alternatePhone) existing.alternatePhone = rec.alternatePhone;
      if (!existing.lob && rec.lob) existing.lob = rec.lob;
      if (!existing.remark && rec.remark) existing.remark = rec.remark;
      else if (rec.remark && !existing.remark.includes(rec.remark)) {
        existing.remark = `${existing.remark}; ${rec.remark}`;
      }
    }
  });

  const uniqueRecords = Array.from(mergedMap.values());
  console.log(`Deduplicated from ${parsedRecords.length} rows to ${uniqueRecords.length} distinct client records.`);

  const withDobCount = uniqueRecords.filter(r => r.dob).length;
  const withPhoneCount = uniqueRecords.filter(r => r.phone).length;
  console.log(`Records with DOB: ${withDobCount}, Records with Phone: ${withPhoneCount}`);

  if (!isDryRun) {
    // Clean up any previously created partial sync records
    const deletedPartials = await prisma.customerProfile.deleteMany({
      where: { customerType: 'Existing' }
    });
    console.log(`Cleaned up ${deletedPartials.count} previous sync-created profiles to ensure clean slate.`);
  }

  // 4. Fetch existing CustomerProfiles from DB (the original 399 records)
  const existingProfiles = await prisma.customerProfile.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      alternatePhone: true,
      dob: true,
      referenceSource: true,
      remarks: true
    }
  });
  console.log(`Found ${existingProfiles.length} existing customer profiles in database.`);

  const existingByPhone = new Map();
  existingProfiles.forEach(p => {
    if (p.phone) {
      if (!existingByPhone.has(p.phone)) existingByPhone.set(p.phone, []);
      existingByPhone.get(p.phone).push(p);
    }
  });

  // Track phones allocated during this run to avoid duplicates
  const allocatedPhones = new Set();
  existingProfiles.forEach(p => {
    if (p.phone) allocatedPhones.add(p.phone);
  });

  // 5. Categorize actions: update vs create
  let updateList = [];
  let createList = [];

  uniqueRecords.forEach(rec => {
    if (!rec.phone) {
      if (rec.dob) {
        createList.push({
          data: {
            name: rec.name,
            phone: '',
            alternatePhone: rec.alternatePhone || '',
            dob: new Date(`${rec.dob}T12:00:00.000Z`),
            referenceSource: rec.lob || 'BH1 Birthday Sheet',
            remarks: rec.remark || '',
            status: 'Existing Customer',
            customerType: 'Existing',
            assignedTo: 'Abhishek Verma'
          },
          reason: 'No phone provided, creating record for DOB tracking'
        });
      }
      return;
    }

    const matches = existingByPhone.get(rec.phone);
    if (matches && matches.length > 0) {
      const nameLower = rec.name.toLowerCase().trim();
      let matchedProfile = matches.find(p => p.name.toLowerCase().trim() === nameLower);

      if (!matchedProfile) {
        matchedProfile = matches.find(p => {
          const pLower = p.name.toLowerCase().trim();
          return pLower.includes(nameLower) || nameLower.includes(pLower);
        });
      }

      if (!matchedProfile && matches.length === 1) {
        const single = matches[0];
        const corporateKeywords = /\b(warehouse|pvt|ltd|limited|corp|corporation|co\.|company|inc|associates|enterprises|industries|mpwlc)\b/i;
        if (corporateKeywords.test(single.name) || single.name === 'Unnamed Customer') {
          matchedProfile = single;
        }
      }

      if (matchedProfile) {
        updateList.push({
          id: matchedProfile.id,
          existingName: matchedProfile.name,
          newName: rec.name,
          phone: rec.phone,
          dob: rec.dob ? new Date(`${rec.dob}T12:00:00.000Z`) : null,
          alternatePhone: rec.alternatePhone || matchedProfile.alternatePhone || '',
          referenceSource: rec.lob || matchedProfile.referenceSource || 'BH1 Birthday Sheet',
          remarks: rec.remark ? (matchedProfile.remarks ? `${matchedProfile.remarks}; ${rec.remark}` : rec.remark) : matchedProfile.remarks
        });
      } else {
        // Distinct family member sharing the same phone
        createList.push({
          data: {
            name: rec.name,
            phone: rec.phone,
            alternatePhone: rec.alternatePhone || '',
            dob: rec.dob ? new Date(`${rec.dob}T12:00:00.000Z`) : null,
            referenceSource: rec.lob || 'BH1 Birthday Sheet',
            remarks: rec.remark ? `${rec.remark} (Shared phone with ${matches[0].name})` : `Shared phone with ${matches[0].name}`,
            status: 'Existing Customer',
            customerType: 'Existing',
            assignedTo: 'Abhishek Verma'
          },
          reason: `Family member sharing phone ${rec.phone}`
        });
      }
    } else {
      createList.push({
        data: {
          name: rec.name,
          phone: rec.phone,
          alternatePhone: rec.alternatePhone || '',
          dob: rec.dob ? new Date(`${rec.dob}T12:00:00.000Z`) : null,
          referenceSource: rec.lob || 'BH1 Birthday Sheet',
          remarks: rec.remark || '',
          status: 'Existing Customer',
          customerType: 'Existing',
          assignedTo: 'Abhishek Verma'
        },
        reason: 'New customer from BH1 sheet'
      });
      allocatedPhones.add(rec.phone);
    }
  });

  console.log(`Plan Summary:`);
  console.log(`- Profiles to update: ${updateList.length}`);
  console.log(`- Profiles to create: ${createList.length}`);
  console.log(`- Total managed records: ${updateList.length + createList.length}`);

  if (isDryRun) {
    console.log(`\n[DRY RUN] No changes were written to the database or storage.`);
    return;
  }

  // 6. Execute Updates
  console.log(`\nApplying updates to ${updateList.length} profiles...`);
  let updatedCount = 0;
  for (const item of updateList) {
    const updateData = {};
    if (item.dob) updateData.dob = item.dob;
    if (item.alternatePhone) updateData.alternatePhone = item.alternatePhone;
    if (item.referenceSource) updateData.referenceSource = item.referenceSource;
    if (item.remarks) updateData.remarks = item.remarks;

    const corporateKeywords = /\b(warehouse|pvt|ltd|limited|corp|corporation|co\.|company|inc|associates|enterprises|industries|mpwlc)\b/i;
    if ((corporateKeywords.test(item.existingName) || item.existingName === 'Unnamed Customer') && item.newName && !corporateKeywords.test(item.newName)) {
      updateData.name = item.newName;
      updateData.businessType = item.existingName;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.customerProfile.update({
        where: { id: item.id },
        data: updateData
      });
      updatedCount++;
    }
  }
  console.log(`Successfully updated ${updatedCount} existing customer profiles.`);

  // 7. Execute Creations in loop with safety
  console.log(`Creating ${createList.length} customer profiles...`);
  let createdCount = 0;
  let skippedCount = 0;
  for (const item of createList) {
    try {
      await prisma.customerProfile.create({
        data: item.data
      });
      createdCount++;
    } catch (err) {
      console.error(`Failed to create ${item.data.name} (${item.data.phone}):`, err.message);
      skippedCount++;
    }
  }
  console.log(`Successfully created ${createdCount} customer profiles (Skipped: ${skippedCount}).`);

  // 8. Generate perfected Excel file for storage/BH1.xlsx
  console.log(`Generating perfected Excel spreadsheet...`);
  const exportRows = uniqueRecords.map((r, i) => ({
    'S.NO.': i + 1,
    'NAME': r.name,
    'DATE OF BIRTH': r.dob || 'N/A',
    'MOBILE NO': r.phone || 'N/A',
    'ALTERNATE MOBILE': r.alternatePhone || '',
    'LINE OF BUSINESS': r.lob || '',
    'REMARK': r.remark || ''
  }));

  const newWb = XLSX.utils.book_new();
  const newWs = XLSX.utils.json_to_sheet(exportRows);

  newWs['!cols'] = [
    { wch: 8 },  // S.NO.
    { wch: 30 }, // NAME
    { wch: 16 }, // DATE OF BIRTH
    { wch: 16 }, // MOBILE NO
    { wch: 18 }, // ALTERNATE MOBILE
    { wch: 35 }, // LINE OF BUSINESS
    { wch: 40 }  // REMARK
  ];

  XLSX.utils.book_append_sheet(newWb, newWs, 'Birthday Data');
  XLSX.writeFile(newWb, filePath);
  console.log(`Perfected Excel file written to ${filePath}`);

  console.log(`\n=== Birthday Sync Complete ===`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
