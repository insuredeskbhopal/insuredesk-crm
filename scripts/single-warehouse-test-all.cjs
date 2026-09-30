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

async function runExhaustiveWarehouseAudit() {
  console.log('========================================================================');
  console.log('      EXHAUSTIVE SINGLE-POLICY TEST FOR EVERY WAREHOUSE PDF IN CRM      ');
  console.log('========================================================================\n');

  const dirs = [
    path.join(__dirname, '..', 'storage'),
    path.join(__dirname, '..', 'tests', 'Warehouse'),
  ];

  let allFiles = [];
  for (const d of dirs) {
    if (fs.existsSync(d)) {
      allFiles = allFiles.concat(findPdfs(d));
    }
  }

  console.log(`Found ${allFiles.length} total PDF file paths.`);

  // Deduplicate by file content hash
  const fileMap = new Map();
  for (const f of allFiles) {
    try {
      const buf = fs.readFileSync(f);
      if (buf.length < 500) continue;
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      if (!fileMap.has(hash)) {
        fileMap.set(hash, f);
      }
    } catch (e) {}
  }

  const uniqueFiles = Array.from(fileMap.values());
  console.log(`Found ${uniqueFiles.length} distinct physical PDF documents to inspect.\n`);

  let scanned = 0;
  let skippedMotor = 0;
  let skippedNonWarehouse = 0;
  let audited = 0;
  let flawless = 0;
  let needsAttention = 0;

  const byInsurer = {};
  const byCategory = {};
  const failureReports = [];

  for (const filePath of uniqueFiles) {
    scanned++;
    let buf;
    try {
      buf = fs.readFileSync(filePath);
    } catch (e) {
      continue;
    }

    let parsed;
    try {
      parsed = await pdf(buf);
    } catch (e) {
      continue;
    }

    const text = parsed.text || '';
    if (text.trim().length < 30) {
      continue;
    }

    // Determine if this is a warehouse policy
    const isWarehousePath = filePath.includes('Warehouse') || /warehouse/i.test(path.basename(filePath));
    const isWarehouseText = 
      /MPWLC|MADHYA\s+PRADESH\s+WAREHOUSING/i.test(text) ||
      /MSME\s+Suraksha\s+Kavach/i.test(text) ||
      (/\bWAREHOUSE\b|\bWAREHOUSING\b/i.test(text) && !/Registration\s+No|Engine\s+No|Chassis\s+No/i.test(text)) ||
      (/Storage\s+of\s+Non-hazardous\s+goods|Storage\s+in\s+godown\s+or\s+warehouse/i.test(text));

    // Filter out motor policies
    const isMotor = 
      /PRIVATE\s+CAR|TWO\s+WHEELER|GOODS\s+CARRYING|PASSENGER\s+CARRYING|COMMERCIAL\s+VEHICLE|MOTOR\s+INSURANCE/i.test(text) &&
      /\b(?:Engine\s+No|Chassis\s+No|Vehicle\s+Make|Vehicle\s+Model)\b/i.test(text);

    if (isMotor && !isWarehousePath) {
      skippedMotor++;
      continue;
    }

    if (!isWarehousePath && !isWarehouseText) {
      skippedNonWarehouse++;
      continue;
    }

    let extracted;
    try {
      extracted = await extractPolicyFromText(text, filePath);
    } catch (e) {
      failureReports.push({
        filePath,
        error: `Crash during extraction: ${e.message}`
      });
      needsAttention++;
      continue;
    }

    // Secondary check: verify extracted category or document format is warehouse-related
    const docCat = String(extracted.documentCategory || '');
    const docFmt = String(extracted.documentFormat || '');
    const polType = String(extracted.policyType || '');
    const isWarehouseResult = 
      docCat === 'Warehouse Insurance' || 
      docFmt.includes('WAREHOUSE') || 
      isWarehousePath || 
      /WAREHOUSE/i.test(extracted.insuredName || extracted.customerName || '') ||
      /MPWLC/i.test(text) ||
      /MSME\s+Suraksha\s+Kavach/i.test(text);

    if (!isWarehouseResult) {
      skippedNonWarehouse++;
      continue;
    }

    audited++;

    // Strict validation
    const warnings = [];

    // 1. Insurance Company
    const company = String(extracted.insuranceCompany || extracted.companyName || '').trim();
    if (!company || company.toLowerCase().includes('unknown') || company.length < 5) {
      warnings.push(`Invalid insuranceCompany: "${company}"`);
    }

    // 2. Policy Number
    const polNum = String(extracted.policyNumber || '').trim();
    if (!polNum || polNum.length < 5 || /^(?:nil|na|none|unknown)$/i.test(polNum)) {
      warnings.push(`Invalid policyNumber: "${polNum}"`);
    }

    // 3. Customer / Insured Name
    const name = String(extracted.insuredName || extracted.customerName || '').trim();
    if (!name || name.length < 3) {
      warnings.push(`Missing or invalid insuredName/customerName`);
    } else {
      for (const pattern of JUNK_NAME_PATTERNS) {
        if (pattern.test(name)) {
          warnings.push(`Insured name contains junk label: "${name}"`);
          break;
        }
      }
    }

    // 4. Policy Dates
    const sDate = String(extracted.startDate || extracted.policyStartDate || '').trim();
    const eDate = String(extracted.expiryDate || extracted.policyEndDate || '').trim();
    if (!sDate) warnings.push('Missing startDate');
    if (!eDate) warnings.push('Missing expiryDate');

    if (sDate && eDate) {
      const d1 = parseDate(sDate);
      const d2 = parseDate(eDate);
      if (d1 && d2 && d1 >= d2) {
        warnings.push(`Date anomaly: startDate (${sDate}) is not before expiryDate (${eDate})`);
      }
    }

    // 5. Financial Validation
    const net = parseFloat(String(extracted.netPremium || extracted.basicPremium || '0').replace(/,/g, '')) || 0;
    const gst = parseFloat(String(extracted.gst || extracted.taxAmount || extracted.gstAmount || '0').replace(/,/g, '')) || 0;
    const gross = parseFloat(String(extracted.grossPremium || extracted.totalPremium || extracted.premiumIncludingGst || '0').replace(/,/g, '')) || 0;

    if (gross <= 0 && net <= 0) {
      warnings.push('Zero or missing grossPremium and netPremium');
    } else if (net > 0 && gst >= 0 && gross > 0) {
      const expectedGross = net + gst;
      const diff = Math.abs(expectedGross - gross);
      if (diff > 5 && Math.abs(gross - net) > 5) {
        warnings.push(`Financial mismatch: Net (${net}) + GST (${gst}) = ${expectedGross} != Gross (${gross})`);
      }
    }

    // 6. Sum Insured
    const sumIns = parseFloat(String(extracted.sumInsured || extracted.totalSumInsured || '0').replace(/,/g, '')) || 0;
    if (sumIns <= 0) {
      warnings.push('Zero or missing sumInsured');
    }

    // 7. Zero Motor Pollution
    const regNum = String(extracted.registrationNumber || extracted.vehicleNumber || '').trim();
    if (regNum && regNum !== 'N/A' && !/^[0-]+$/.test(regNum)) {
      warnings.push(`Motor pollution on warehouse policy: registrationNumber = "${regNum}"`);
    }

    // Track statistics
    byInsurer[company] = (byInsurer[company] || 0) + 1;
    const cat = docCat || 'Warehouse Insurance';
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    if (warnings.length === 0) {
      flawless++;
    } else {
      needsAttention++;
      failureReports.push({
        filePath,
        company,
        category: cat,
        policyNumber: polNum,
        insuredName: name,
        net,
        gst,
        gross,
        sumIns,
        startDate: sDate,
        expiryDate: eDate,
        trainingVersion: extracted.extractionTrainingVersion,
        warnings
      });
    }
  }

  console.log(`Scanned: ${scanned} PDFs | Motor skipped: ${skippedMotor} | Other Non-Warehouse skipped: ${skippedNonWarehouse}`);
  console.log(`Identified Warehouse Documents to Audit: ${audited}\n`);

  console.log('========================================================================');
  console.log('                  WAREHOUSE POLICY AUDIT RESULTS                        ');
  console.log('========================================================================');
  console.log(`Total Warehouse Policies Audited:   ${audited}`);
  console.log(`Perfect 100% Flawless Policies:     ${flawless} / ${audited} (${((flawless / audited) * 100).toFixed(1)}%)`);
  console.log(`Policies Requiring Attention:       ${needsAttention}\n`);

  console.log('--- BREAKDOWN BY CATEGORY ---');
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`  • ${(cat + ' ').padEnd(30, '.')}: ${count} policies`);
  }

  console.log('\n--- BREAKDOWN BY INSURER ---');
  for (const [ins, count] of Object.entries(byInsurer)) {
    console.log(`  • ${(ins + ' ').padEnd(50, '.')}: ${count} policies`);
  }

  if (failureReports.length > 0) {
    console.log('\n========================================================================');
    console.log('                   POLICIES REQUIRING ATTENTION                         ');
    console.log('========================================================================');
    failureReports.forEach((item, idx) => {
      console.log(`\n[#${idx + 1}] File: ${item.filePath}`);
      console.log(`     Company:   ${item.company}`);
      console.log(`     Category:  ${item.category}`);
      console.log(`     Policy No: ${item.policyNumber}`);
      console.log(`     Insured:   ${item.insuredName}`);
      console.log(`     Dates:     ${item.startDate} to ${item.expiryDate}`);
      console.log(`     SumIns:    ${item.sumIns}`);
      console.log(`     Finances:  Net ${item.net} | GST ${item.gst} | Gross ${item.gross}`);
      console.log(`     Training:  ${item.trainingVersion}`);
      item.warnings.forEach(w => console.log(`     WARNING:   ${w}`));
    });
  } else {
    console.log('\n>>> FLAWLESS! 100% OF ALL WAREHOUSE POLICIES EXTRACTED WITH ZERO ERRORS! <<<');
  }

  console.log('\n========================================================================\n');
}

runExhaustiveWarehouseAudit().catch(err => console.error(err));
