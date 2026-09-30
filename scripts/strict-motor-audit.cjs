const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');
const { extractPolicyFromText } = require('../src/lib/policies/pdf/extractor.cjs');

const prisma = new PrismaClient();

function findPdfs(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) {
        results = results.concat(findPdfs(full));
      } else if (file.toLowerCase().endsWith('.pdf')) {
        results.push(full);
      }
    }
  } catch (e) {}
  return results;
}

const REGEX_VEHICLE = /^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{0,4}[ -]?[0-9]{4}$/i;

const JUNK_NAME_PATTERNS = [
  /policy\s+schedule/i,
  /certificate\s+of\s+insurance/i,
  /tax\s+invoice/i,
  /hdfc\s+ergo/i,
  /icici\s+lombard/i,
  /bajaj\s+allianz/i,
  /iffco\s+tokio/i,
  /tata\s+aig/i,
  /new\s+india\s+assurance/i,
  /royal\s+sundaram/i,
  /united\s+india/i,
  /future\s+generali/i,
  /shriram\s+general/i,
  /go\s+digit/i
];

function parseDate(dStr) {
  if (!dStr) return null;
  dStr = String(dStr).trim();
  const dmyMatch = dStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    return new Date(`${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`);
  }
  const dMonYMatch = dStr.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (dMonYMatch) {
    return new Date(dStr);
  }
  const ymdMatch = dStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return new Date(dStr);
  }
  return null;
}

async function runStrictAudit() {
  console.log('====================================================');
  console.log('      DEEP STRICT MOTOR EXTRACTION AUDIT            ');
  console.log('====================================================\n');

  // --- PART 1: PHYSICAL STORAGE AUDIT ---
  const candidateDirs = [
    'storage/AUG POLICIES',
    'storage/aug policy (2)/aug policy',
    'storage/pdf',
    'storage'
  ];

  let candidateFiles = [];
  for (const d of candidateDirs) {
    if (d === 'storage') {
      const rootFiles = fs.readdirSync('storage')
        .filter(f => f.endsWith('.pdf'))
        .map(f => path.join('storage', f));
      candidateFiles = candidateFiles.concat(rootFiles);
    } else if (fs.existsSync(d)) {
      candidateFiles = candidateFiles.concat(findPdfs(d));
    }
  }

  // Remove duplicates by filename
  const uniqueFilesMap = new Map();
  for (const f of candidateFiles) {
    const base = path.basename(f);
    if (!uniqueFilesMap.has(base)) uniqueFilesMap.set(base, f);
  }

  console.log(`Found ${uniqueFilesMap.size} unique candidate PDF files across storage suites.`);

  let totalAudited = 0;
  let motorPoliciesCount = 0;
  let nonMotorCount = 0;
  let strictPassCount = 0;
  let strictViolations = [];
  let insurerBreakdown = {};

  for (const [fileName, filePath] of uniqueFilesMap) {
    totalAudited++;
    try {
      const buf = fs.readFileSync(filePath);
      const parsed = await pdf(buf);
      const res = extractPolicyFromText(parsed.text, fileName);

      // Distinguish category: must be motor and not non-motor (like WC, CPM, Fire, Burglary)
      const cat = res.documentCategory || '';
      const fmt = res.documentFormat || '';
      const isMotor = (cat === 'Motor Insurance' || /MOTOR/i.test(fmt)) &&
                      !/NON[_-]?MOTOR/i.test(fmt) &&
                      !/Warehouse|Burglary|Fire|Workmen|Public Liability|Contractors Plant/i.test(cat);

      if (!isMotor) {
        nonMotorCount++;
        continue;
      }

      motorPoliciesCount++;
      const company = res.insuranceCompany || 'UNKNOWN_INSURER';
      insurerBreakdown[company] = (insurerBreakdown[company] || 0) + 1;

      const fileViolations = [];

      // 1. Policy Number Strict Check
      const polNo = String(res.policyNumber || '').trim();
      if (!polNo) {
        fileViolations.push('CRITICAL: Empty policyNumber');
      } else if (polNo.length < 5) {
        fileViolations.push(`SUSPICIOUS: Extremely short policyNumber "${polNo}"`);
      } else if (/^policy\s*no|^number/i.test(polNo)) {
        fileViolations.push(`FORMAT: policyNumber contains label "${polNo}"`);
      }

      // 2. Registration Number Strict Check
      const regNo = String(res.registrationNumber || res.vehicleNumber || '').trim().replace(/\s+/g, '');
      if (!regNo) {
        fileViolations.push('CRITICAL: Empty registrationNumber/vehicleNumber');
      } else if (regNo.toLowerCase() !== 'new') {
        const isValidFormat = REGEX_VEHICLE.test(regNo) || /^[A-Z]{2}[0-9]{1,2}[A-Z0-9]+$/.test(regNo);
        if (!isValidFormat && regNo.length < 8) {
          fileViolations.push(`SUSPICIOUS: Invalid registrationNumber pattern "${regNo}"`);
        }
        if (/\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(regNo)) {
          fileViolations.push(`CORRUPTION: registrationNumber is a date "${regNo}"`);
        }
      }

      // 3. Insured Name Strict Check
      const name = String(res.insuredName || res.customerName || '').trim();
      if (!name) {
        fileViolations.push('CRITICAL: Empty insuredName');
      } else if (name.length < 3) {
        fileViolations.push(`SUSPICIOUS: Name length < 3 "${name}"`);
      } else {
        for (const pattern of JUNK_NAME_PATTERNS) {
          if (pattern.test(name)) {
            fileViolations.push(`HEADER_LEAK: insuredName matched junk/insurer pattern "${name}"`);
            break;
          }
        }
      }

      // 4. Dates Strict Check
      const startD = parseDate(res.policyStartDate || res.startDate);
      const endD = parseDate(res.policyEndDate || res.expiryDate);
      if (!res.policyStartDate) {
        fileViolations.push('WARNING: Missing policyStartDate');
      }
      if (!res.policyEndDate && !res.expiryDate) {
        fileViolations.push('CRITICAL: Missing policyEndDate/expiryDate');
      }
      if (startD && endD) {
        if (endD <= startD) {
          fileViolations.push(`CHRONOLOGY_ERROR: policyEndDate (${res.policyEndDate}) <= policyStartDate (${res.policyStartDate})`);
        }
      }

      // 5. Financial & Mathematical Strict Check
      const net = parseFloat(String(res.netPremium || '0').replace(/,/g, ''));
      const gross = parseFloat(String(res.totalPremium || res.grossPremium || '0').replace(/,/g, ''));
      const gst = parseFloat(String(res.gstAmount || res.taxAmount || '0').replace(/,/g, ''));

      if (gross <= 0) {
        fileViolations.push(`CRITICAL: Total premium is zero or missing "${res.totalPremium}"`);
      }
      if (net > 0 && gross > 0) {
        if (gross < net) {
          fileViolations.push(`INVERSION_ERROR: totalPremium (${gross}) < netPremium (${net})`);
        }
        if (gst > 0) {
          const diff = Math.abs(gross - (net + gst));
          if (diff > 5.0) { // More than 5 rupee discrepancy
            fileViolations.push(`MATH_DISCREPANCY: Net (${net}) + GST (${gst}) = ${net+gst} != Gross (${gross}) (diff: ${diff.toFixed(2)})`);
          }
        }
      }

      // 6. Engine & Chassis Numbers Strict Check
      const engine = String(res.engineNumber || '').trim();
      const chassis = String(res.chassisNumber || '').trim();
      if (!engine && !chassis) {
        fileViolations.push('WARNING: Both engineNumber and chassisNumber are missing');
      } else {
        if (/^engine\s*no|^chassis\s*no/i.test(engine) || /^engine\s*no|^chassis\s*no/i.test(chassis)) {
          fileViolations.push(`LABEL_LEAK: Engine/Chassis contains field labels (eng: "${engine}", chas: "${chassis}")`);
        }
      }

      // 7. Make & Model Check
      const makeModel = String(res.makeModel || (res.vehicleMake + ' ' + res.vehicleModel) || '').trim();
      if (!makeModel || makeModel === 'undefined undefined') {
        fileViolations.push('WARNING: Missing makeModel');
      }

      if (fileViolations.length === 0) {
        strictPassCount++;
      } else {
        strictViolations.push({
          file: fileName,
          company,
          regNo,
          polNo,
          violations: fileViolations
        });
      }

    } catch (err) {
      strictViolations.push({
        file: fileName,
        error: `CRASH during extraction: ${err.message}`
      });
    }
  }

  console.log(`\n--- PHYSICAL MOTOR PDF AUDIT SUMMARY ---`);
  console.log(`Total Unique PDFs Processed:       ${totalAudited}`);
  console.log(`Confirmed Motor Policies:          ${motorPoliciesCount}`);
  console.log(`Non-Motor Policies (Cleanly skipped): ${nonMotorCount}`);
  console.log(`Strict Perfect Passes:             ${strictPassCount} / ${motorPoliciesCount} (${((strictPassCount/motorPoliciesCount)*100).toFixed(1)}%)`);
  console.log(`Policies with Warnings/Issues:     ${strictViolations.length}`);

  console.log('\n--- BREAKDOWN BY MOTOR INSURER ---');
  for (const [ins, count] of Object.entries(insurerBreakdown)) {
    console.log(`  • ${ins}: ${count} policies`);
  }

  if (strictViolations.length > 0) {
    console.log('\n--- DETAILED AUDIT FINDINGS ---');
    strictViolations.forEach((v, i) => {
      console.log(`[#${i+1}] ${v.file} (${v.company || 'Unknown'})`);
      if (v.violations) {
        v.violations.forEach(vl => console.log(`     ${vl}`));
      }
      if (v.error) {
        console.log(`     CRASH: ${v.error}`);
      }
    });
  } else {
    console.log('\n>>> OUTSTANDING: 0 STRICT VIOLATIONS FOUND ACROSS ALL MOTOR POLICIES! <<<');
  }

  // --- PART 2: DATABASE MOTOR RECORDS STRICT AUDIT ---
  console.log('\n====================================================');
  console.log('      DATABASE MOTOR PRODUCTION DATA AUDIT          ');
  console.log('====================================================\n');

  const dbRecords = await prisma.policyRecord.findMany({
    where: {
      deletedAt: null,
      OR: [
        { detectedServiceCategory: { contains: 'motor', mode: 'insensitive' } },
        { selectedServiceCategory: { contains: 'motor', mode: 'insensitive' } },
        { selectedPolicyType: { contains: 'motor', mode: 'insensitive' } },
        { selectedPolicyType: { contains: 'private car', mode: 'insensitive' } },
        { selectedPolicyType: { contains: 'commercial', mode: 'insensitive' } },
        { selectedPolicyType: { contains: 'two wheeler', mode: 'insensitive' } },
        { selectedPolicyType: { contains: 'package', mode: 'insensitive' } },
      ]
    },
    select: {
      id: true,
      pdfFileName: true,
      pdfBytes: true,
      uploadedFileId: true,
      savedAt: true,
      data: true,
      reviewedData: true,
      selectedPolicyType: true
    }
  });

  console.log(`Total Active Motor Records in Database: ${dbRecords.length}`);

  let dbMissingVeh = 0;
  let dbMissingPolNo = 0;
  let dbMissingCustomer = 0;
  let dbMissingExpiry = 0;
  let dbInvertedPremiums = 0;
  let dbCorruptedAmounts = 0;
  let dbMissingPdfLink = 0;

  for (const rec of dbRecords) {
    const d = { ...(rec.data || {}), ...(rec.reviewedData || {}) };
    const veh = String(d.vehicleNumber || d.registrationNumber || '').trim();
    const pol = String(d.policyNumber || '').trim();
    const cust = String(d.insuredName || d.customerName || '').trim();
    const exp = d.expiryDate || d.policyEndDate;
    const net = parseFloat(String(d.netPremium || '0').replace(/,/g, ''));
    const gross = parseFloat(String(d.totalPremium || '0').replace(/,/g, ''));
    const hasPdf = Boolean(rec.pdfFileName && (rec.pdfBytes || rec.uploadedFileId));

    if (!veh) dbMissingVeh++;
    if (!pol) dbMissingPolNo++;
    if (!cust) dbMissingCustomer++;
    if (!exp) dbMissingExpiry++;
    if (net > 0 && gross > 0 && gross < net) dbInvertedPremiums++;
    if (gross > 10000000) dbCorruptedAmounts++;
    if (!hasPdf) dbMissingPdfLink++;
  }

  console.log(`✓ Records with Registration Number:  ${dbRecords.length - dbMissingVeh} / ${dbRecords.length}`);
  console.log(`✓ Records with Policy Number:        ${dbRecords.length - dbMissingPolNo} / ${dbRecords.length}`);
  console.log(`✓ Records with Customer Name:        ${dbRecords.length - dbMissingCustomer} / ${dbRecords.length}`);
  console.log(`✓ Records with Valid Expiry Date:    ${dbRecords.length - dbMissingExpiry} / ${dbRecords.length}`);
  console.log(`✓ Zero Inverted Premiums:            ${dbInvertedPremiums === 0 ? 'PASS (0)' : 'FAIL (' + dbInvertedPremiums + ')'}`);
  console.log(`✓ Zero Corrupted Premium Outliers:   ${dbCorruptedAmounts === 0 ? 'PASS (0)' : 'FAIL (' + dbCorruptedAmounts + ')'}`);
  console.log(`✓ Records with Linked Source PDF:    ${dbRecords.length - dbMissingPdfLink} / ${dbRecords.length}`);

  console.log('\n====================================================');
  console.log('             STRICT AUDIT COMPLETE                  ');
  console.log('====================================================');

  await prisma.$disconnect();
}

runStrictAudit().catch(err => {
  console.error('Fatal error during strict audit:', err);
  process.exit(1);
});
