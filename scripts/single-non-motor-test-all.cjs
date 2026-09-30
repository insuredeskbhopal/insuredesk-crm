const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
  if (dmyMatch) return new Date(`${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`);
  const dMonYMatch = dStr.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (dMonYMatch) return new Date(dStr);
  const ymdMatch = dStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) return new Date(dStr);
  return null;
}

async function runExhaustiveNonMotorAudit() {
  console.log('========================================================================');
  console.log('     EXHAUSTIVE SINGLE-POLICY TEST FOR EVERY NON-MOTOR PDF IN CRM       ');
  console.log('========================================================================\n');

  const allPaths = findPdfs('storage').concat(fs.existsSync('tests/Warehouse') ? findPdfs('tests/Warehouse') : []);
  console.log(`Found ${allPaths.length} total PDF file paths.`);

  // Deduplicate by file size + first 4096 bytes md5 hash
  const uniqueDocs = new Map();
  for (const p of allPaths) {
    try {
      const stat = fs.statSync(p);
      if (stat.size < 100) continue;
      const fd = fs.openSync(p, 'r');
      const buf = Buffer.alloc(Math.min(stat.size, 4096));
      fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);
      const hash = stat.size + '_' + crypto.createHash('md5').update(buf).digest('hex');
      if (!uniqueDocs.has(hash)) {
        uniqueDocs.set(hash, p);
      }
    } catch(e) {}
  }

  console.log(`Found ${uniqueDocs.size} distinct physical PDF documents to inspect.\n`);

  let scannedCount = 0;
  let skippedScannedEmpty = 0;
  let motorSkipped = 0;
  let nonMotorPolicies = [];

  for (const [hash, filePath] of uniqueDocs) {
    scannedCount++;
    try {
      const buf = fs.readFileSync(filePath);
      const parsed = await pdf(buf);
      const fileName = path.basename(filePath);

      if (parsed.text.trim().length < 20) {
        skippedScannedEmpty++;
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

      nonMotorPolicies.push({
        filePath,
        fileName,
        text: parsed.text,
        res
      });

    } catch (err) {
      console.error(`Error reading ${filePath}: ${err.message}`);
    }
  }

  console.log(`Scanned: ${scannedCount} PDFs | Motor skipped: ${motorSkipped} | Scanned/empty skipped: ${skippedScannedEmpty}`);
  console.log(`Identified Non-Motor Documents to Audit: ${nonMotorPolicies.length}\n`);

  let passCount = 0;
  let issues = [];
  const categorySummary = {};
  const insurerSummary = {};

  for (let i = 0; i < nonMotorPolicies.length; i++) {
    const item = nonMotorPolicies[i];
    const res = item.res;
    const cat = res.documentCategory || 'UNKNOWN_CATEGORY';
    const ins = res.insuranceCompany || 'UNKNOWN_INSURER';

    categorySummary[cat] = (categorySummary[cat] || 0) + 1;
    insurerSummary[ins] = (insurerSummary[ins] || 0) + 1;

    const policyIssues = [];

    // 1. Category Check
    if (!res.documentCategory || res.documentCategory === 'UNKNOWN_CATEGORY') {
      policyIssues.push(`Undetected documentCategory (format: "${res.documentFormat}")`);
    }

    // 2. Insurer Check
    if (!res.insuranceCompany || res.insuranceCompany === 'UNKNOWN_INSURER') {
      policyIssues.push('Undetected insuranceCompany');
    }

    // 3. Policy Number Check
    const polNo = String(res.policyNumber || '').trim();
    if (!polNo) {
      policyIssues.push('Missing policyNumber');
    } else if (polNo.length < 5) {
      policyIssues.push(`Suspicious short policyNumber "${polNo}"`);
    } else if (/^policy\s*no|^number|^pol\b/i.test(polNo)) {
      policyIssues.push(`PolicyNumber contains label prefix "${polNo}"`);
    }

    // 4. Insured Name Check
    const name = String(res.insuredName || res.customerName || '').trim();
    if (!name) {
      policyIssues.push('Missing insuredName');
    } else if (name.length < 3) {
      policyIssues.push(`InsuredName length < 3 "${name}"`);
    } else {
      for (const pat of JUNK_NAME_PATTERNS) {
        if (pat.test(name)) {
          policyIssues.push(`InsuredName header leak: "${name}"`);
          break;
        }
      }
    }

    // 5. Dates Check
    const startD = parseDate(res.policyStartDate || res.startDate);
    const endD = parseDate(res.policyEndDate || res.expiryDate);
    if (!res.policyStartDate && !res.startDate) {
      policyIssues.push('Missing policyStartDate');
    }
    if (!res.policyEndDate && !res.expiryDate) {
      policyIssues.push('Missing policyEndDate/expiryDate');
    }
    if (startD && endD) {
      if (endD <= startD) {
        policyIssues.push(`Chronology error: end (${res.policyEndDate || res.expiryDate}) <= start (${res.policyStartDate || res.startDate})`);
      }
    }

    // 6. Premium Sanity Check
    const net = parseFloat(String(res.netPremium || '0').replace(/,/g, ''));
    const gross = parseFloat(String(res.totalPremium || res.grossPremium || '0').replace(/,/g, ''));
    const gst = parseFloat(String(res.gstAmount || res.taxAmount || '0').replace(/,/g, ''));

    if (gross <= 0) {
      policyIssues.push(`Zero or missing totalPremium: "${res.totalPremium}"`);
    }
    if (net > 0 && gross > 0) {
      if (gross < net - 1.0) { // allow 1-rupee rounding
        policyIssues.push(`Inverted premium: Gross (${gross}) < Net (${net})`);
      }
      if (gst > 0) {
        const diff = Math.abs(gross - (net + gst));
        const isWcStampDuty = /workmen/i.test(cat) && (diff <= 15.0);
        if (diff > 5.0 && !isWcStampDuty) {
          policyIssues.push(`Math discrepancy: Net (${net}) + GST (${gst}) = ${net+gst} != Gross (${gross}) (diff: ${diff.toFixed(2)})`);
        }
      }
    }

    // 7. Sum Insured Check (for property/liability/health)
    const isPropertyOrHealth = /Warehouse|Fire|Burglary|Health|Marine/i.test(cat);
    const sumIns = parseFloat(String(res.sumInsured || res.totalSumInsured || '0').replace(/,/g, ''));
    if (isPropertyOrHealth && sumIns <= 0) {
      policyIssues.push(`Missing sumInsured for ${cat} ("${res.sumInsured}")`);
    }

    // 8. Motor Pollution Check
    const vehNo = String(res.registrationNumber || res.vehicleNumber || '').trim();
    const isCpm = /contractors\s+plant|cpm/i.test(cat);
    if (vehNo && !isCpm) {
      policyIssues.push(`Motor field pollution: registrationNumber was extracted as "${vehNo}"`);
    }

    if (policyIssues.length === 0) {
      passCount++;
    } else {
      issues.push({
        index: i + 1,
        file: item.fileName,
        path: item.filePath,
        category: cat,
        insurer: ins,
        policyNumber: polNo,
        insuredName: name,
        netPremium: res.netPremium,
        totalPremium: res.totalPremium,
        sumInsured: res.sumInsured,
        issues: policyIssues
      });
    }
  }

  console.log('========================================================================');
  console.log('                       DETAILED TEST AUDIT RESULTS                      ');
  console.log('========================================================================');
  console.log(`Total Non-Motor Policies Audited:   ${nonMotorPolicies.length}`);
  console.log(`Perfect 100% Flawless Policies:     ${passCount} / ${nonMotorPolicies.length} (${((passCount / nonMotorPolicies.length) * 100).toFixed(1)}%)`);
  console.log(`Policies Requiring Attention:       ${issues.length}`);

  console.log('\n--- BREAKDOWN BY CATEGORY ---');
  for (const [c, cnt] of Object.entries(categorySummary)) {
    console.log(`  • ${c.padEnd(30)}: ${cnt} policies`);
  }

  console.log('\n--- BREAKDOWN BY INSURER ---');
  for (const [inName, cnt] of Object.entries(insurerSummary)) {
    console.log(`  • ${inName.padEnd(50)}: ${cnt} policies`);
  }

  if (issues.length > 0) {
    console.log('\n--- ISSUES IDENTIFIED (SINGLE-POLICY INSPECTION) ---');
    issues.forEach(iss => {
      console.log(`\n[Policy #${iss.index}] ${iss.file}`);
      console.log(`   Path:        ${iss.path}`);
      console.log(`   Insurer:     ${iss.insurer}`);
      console.log(`   Category:    ${iss.category}`);
      console.log(`   Policy No:   ${iss.policyNumber}`);
      console.log(`   Insured:     ${iss.insuredName}`);
      console.log(`   Premiums:    Net: ${iss.netPremium} | Gross: ${iss.totalPremium} | SumInsured: ${iss.sumInsured}`);
      iss.issues.forEach(err => console.log(`   -> ❌ ${err}`));
    });
  } else {
    console.log('\n>>> FLAWLESS! 100% OF ALL NON-MOTOR POLICIES EXTRACTED WITH ZERO ERRORS! <<<');
  }

  console.log('\n========================================================================');
}

runExhaustiveNonMotorAudit().catch(err => {
  console.error('Fatal error during exhaustive audit:', err);
  process.exit(1);
});
