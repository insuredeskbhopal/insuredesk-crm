const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { extractPolicyFromText } = require('../src/lib/policies/pdf/extractor.cjs');

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

const JUNK_NAME_PATTERNS = [
  /^policy\s+schedule/i,
  /^certificate\s+of\s+insurance/i,
  /^tax\s+invoice/i,
  /^standard\s+fire/i,
  /^bharat\s+sookshma/i,
  /^bharat\s+laghu/i,
  /^hdfc\s+ergo/i,
  /^icici\s+lombard/i,
  /^bajaj\s+allianz/i,
  /^iffco\s+tokio/i,
  /^tata\s+aig/i,
  /^new\s+india\s+assurance/i,
  /^royal\s+sundaram/i,
  /^united\s+india/i,
  /^future\s+generali/i,
  /^shriram\s+general/i,
  /^go\s+digit/i
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

async function runStrictNonMotorAudit() {
  console.log('====================================================');
  console.log('    DEEP STRICT NON-MOTOR PDF EXTRACTION AUDIT      ');
  console.log('====================================================\n');

  const candidateDirs = [
    'storage/AUG POLICIES',
    'storage/aug policy (2)/aug policy',
    'storage/pdf',
    'storage/NEW HEALTH',
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

  // Deduplicate by filename
  const uniqueFilesMap = new Map();
  for (const f of candidateFiles) {
    const base = path.basename(f);
    if (!uniqueFilesMap.has(base)) uniqueFilesMap.set(base, f);
  }

  console.log(`Scanning ${uniqueFilesMap.size} unique candidate PDF files across storage suites...\n`);

  let totalAudited = 0;
  let nonMotorCount = 0;
  let motorSkipped = 0;
  let strictPassCount = 0;
  let issuesList = [];
  let categoryBreakdown = {};
  let insurerBreakdown = {};

  for (const [fileName, filePath] of uniqueFilesMap) {
    totalAudited++;
    try {
      const buf = fs.readFileSync(filePath);
      const parsed = await pdf(buf);
      if (parsed.text.trim().length < 20) {
        // Scanned/empty PDF without text layer
        continue;
      }
      const res = extractPolicyFromText(parsed.text, fileName);

      const cat = String(res.documentCategory || '');
      const fmt = String(res.documentFormat || '');

      const isMotor = (cat === 'Motor Insurance' || /MOTOR/i.test(fmt)) &&
                      !/NON[_-]?MOTOR/i.test(fmt) &&
                      !/Warehouse|Burglary|Fire|Workmen|Public Liability|Contractors Plant|Health|Marine|Fidelity/i.test(cat);

      if (isMotor) {
        motorSkipped++;
        continue;
      }

      nonMotorCount++;
      const detectedCat = cat || 'UNKNOWN_CATEGORY';
      categoryBreakdown[detectedCat] = (categoryBreakdown[detectedCat] || 0) + 1;

      const company = res.insuranceCompany || 'UNKNOWN_INSURER';
      insurerBreakdown[company] = (insurerBreakdown[company] || 0) + 1;

      const fileViolations = [];

      // 1. Category Strict Check
      if (!cat || cat === 'UNKNOWN_CATEGORY') {
        fileViolations.push(`CRITICAL: Undetected documentCategory (format: "${fmt}")`);
      }

      // 2. Insurer Strict Check
      if (!res.insuranceCompany || res.insuranceCompany === 'UNKNOWN_INSURER') {
        fileViolations.push('CRITICAL: Undetected insuranceCompany');
      }

      // 3. Policy Number Strict Check
      const polNo = String(res.policyNumber || '').trim();
      if (!polNo) {
        fileViolations.push('CRITICAL: Empty policyNumber');
      } else if (polNo.length < 5) {
        fileViolations.push(`SUSPICIOUS: Short policyNumber "${polNo}"`);
      } else if (/^policy\s*no|^number|^pol\b/i.test(polNo)) {
        fileViolations.push(`FORMAT: policyNumber contains label "${polNo}"`);
      }

      // 4. Insured Name Strict Check
      const name = String(res.insuredName || res.customerName || '').trim();
      if (!name) {
        fileViolations.push('CRITICAL: Empty insuredName');
      } else if (name.length < 3) {
        fileViolations.push(`SUSPICIOUS: Insured name too short "${name}"`);
      } else {
        for (const pattern of JUNK_NAME_PATTERNS) {
          if (pattern.test(name)) {
            fileViolations.push(`HEADER_LEAK: insuredName matched junk/header pattern "${name}"`);
            break;
          }
        }
      }

      // 5. Dates Strict Check
      const startD = parseDate(res.policyStartDate || res.startDate);
      const endD = parseDate(res.policyEndDate || res.expiryDate);
      if (!res.policyStartDate && !res.startDate) {
        fileViolations.push('WARNING: Missing policyStartDate');
      }
      if (!res.policyEndDate && !res.expiryDate) {
        fileViolations.push('CRITICAL: Missing policyEndDate/expiryDate');
      }
      if (startD && endD) {
        if (endD <= startD) {
          fileViolations.push(`CHRONOLOGY_ERROR: policyEndDate (${res.policyEndDate || res.expiryDate}) <= policyStartDate (${res.policyStartDate || res.startDate})`);
        }
      }

      // 6. Financial Strict Check
      const net = parseFloat(String(res.netPremium || '0').replace(/,/g, ''));
      const gross = parseFloat(String(res.totalPremium || res.grossPremium || '0').replace(/,/g, ''));
      const gst = parseFloat(String(res.gstAmount || res.taxAmount || '0').replace(/,/g, ''));

      if (gross <= 0) {
        fileViolations.push(`CRITICAL: Total premium is zero or missing "${res.totalPremium}"`);
      }
      if (net > 0 && gross > 0) {
        if (gross < net - 1.0) { // allow standard rounding within 1 rupee
          fileViolations.push(`INVERSION_ERROR: totalPremium (${gross}) < netPremium (${net})`);
        }
        if (gst > 0) {
          const diff = Math.abs(gross - (net + gst));
          // allow up to 15 rupees for stamp duty (ICICI WC) or standard rounding
          const isWcStampDuty = /workmen/i.test(detectedCat) && (diff <= 15.0);
          if (diff > 5.0 && !isWcStampDuty) {
            fileViolations.push(`MATH_DISCREPANCY: Net (${net}) + GST (${gst}) = ${net+gst} != Gross (${gross}) (diff: ${diff.toFixed(2)})`);
          }
        }
      }

      // 7. Sum Insured Check
      const sumIns = parseFloat(String(res.sumInsured || res.totalSumInsured || '0').replace(/,/g, ''));
      const isHealth = /health|mediclaim|gmc/i.test(detectedCat);
      const isWarehouseOrFire = /warehouse|fire|burglary/i.test(detectedCat);
      if ((isHealth || isWarehouseOrFire) && sumIns <= 0) {
        fileViolations.push(`SUM_INSURED: Missing or zero sumInsured for ${detectedCat} ("${res.sumInsured}")`);
      }

      // 8. Motor Contamination Check
      const vehNo = String(res.registrationNumber || res.vehicleNumber || '').trim();
      const isCpm = /contractors\s+plant|cpm/i.test(detectedCat);
      if (vehNo && !isCpm) {
        fileViolations.push(`MOTOR_POLLUTION: Non-motor policy extracted vehicle registration "${vehNo}"`);
      }

      if (fileViolations.length === 0) {
        strictPassCount++;
      } else {
        issuesList.push({
          file: fileName,
          category: detectedCat,
          company,
          policyNumber: polNo,
          insuredName: name,
          violations: fileViolations
        });
      }

    } catch (err) {
      issuesList.push({
        file: fileName,
        error: `CRASH during extraction: ${err.message}`
      });
    }
  }

  console.log('=== STRICT NON-MOTOR AUDIT SUMMARY ===');
  console.log(`Total Unique PDFs Processed:       ${totalAudited}`);
  console.log(`Confirmed Non-Motor Policies:      ${nonMotorCount}`);
  console.log(`Motor Policies (Cleanly skipped):  ${motorSkipped}`);
  console.log(`Strict Perfect Passes:             ${strictPassCount} / ${nonMotorCount} (${((strictPassCount / nonMotorCount) * 100).toFixed(1)}%)`);
  console.log(`Policies with Warnings/Issues:     ${issuesList.length}`);

  console.log('\n--- BREAKDOWN BY CATEGORY ---');
  for (const [cat, count] of Object.entries(categoryBreakdown)) {
    console.log(`  • ${cat}: ${count} policies`);
  }

  console.log('\n--- BREAKDOWN BY INSURER ---');
  for (const [ins, count] of Object.entries(insurerBreakdown)) {
    console.log(`  • ${ins}: ${count} policies`);
  }

  if (issuesList.length > 0) {
    console.log('\n--- DETAILED AUDIT FINDINGS ---');
    issuesList.forEach((item, idx) => {
      console.log(`\n[#${idx + 1}] ${item.file}`);
      console.log(`     Category: ${item.category} | Insurer: ${item.company} | PolicyNo: ${item.policyNumber}`);
      if (item.violations) {
        item.violations.forEach(v => console.log(`     -> ${v}`));
      }
      if (item.error) {
        console.log(`     -> CRASH: ${item.error}`);
      }
    });
  } else {
    console.log('\n>>> OUTSTANDING: 0 STRICT VIOLATIONS FOUND ACROSS ALL NON-MOTOR POLICIES! <<<');
  }

  console.log('\n====================================================');
  console.log('             STRICT AUDIT COMPLETE                  ');
  console.log('====================================================');
}

runStrictNonMotorAudit().catch(err => {
  console.error('Fatal error during strict non-motor audit:', err);
  process.exit(1);
});
