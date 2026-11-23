require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const { buildRenewalImportKey } = require('../src/lib/renewals/import-identity.cjs');
const { normalizeRenewalInsuranceCompany } = require('../src/lib/renewals/companies');
const { resolvePolicyCustomerName } = require('../src/lib/renewals/customer-name');

const prisma = new PrismaClient();
const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";
const sourceFileName = "December_2026_Renewals.xlsx";
const excelPath = path.join(process.cwd(), sourceFileName);
const rawTsvPath = path.join(process.cwd(), 'scripts', 'december_renewals_raw.tsv');

function excelDateToString(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const year = date_info.getUTCFullYear();
  const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date_info.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseExpiryDate(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  
  if (/^\d{5}$/.test(s)) {
    return excelDateToString(Number(s));
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  
  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const m = s.match(/^(\d{1,2})-([a-zA-Z]{3})-(\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const mon = monthMap[m[2].toLowerCase()] || '12';
    const year = m[3];
    return `${year}-${mon}-${day}`;
  }
  
  return s;
}

function buildCustomerId(name, mobile) {
  const namePart = String(name || "")
    .replace(/^(m\/s|mr|mrs|ms)\.?\s+/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase();
  const digits = String(mobile || "").replace(/\D/g, "");
  return `${namePart}${digits.slice(-4)}`;
}

function parseCanonicalNumber(val) {
  if (val === null || val === undefined || val === "") return null;
  const cleaned = String(val).replace(/[^0-9.]/g, "");
  if (!cleaned || isNaN(Number(cleaned))) return null;
  return Number(cleaned);
}

function parseCanonicalDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T00:00:00Z");
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function run() {
  console.log(`Starting December 2026 Renewal Import...`);

  // Read raw TSV
  const tsvSource = fs.existsSync(rawTsvPath) 
    ? rawTsvPath 
    : 'C:/Users/abhis/.gemini/antigravity/brain/0b2fcb1c-a945-458e-a561-bf322db8c621/scratch/december_renewals_raw.tsv';
  
  const lines = fs.readFileSync(tsvSource, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  console.log(`Loaded ${lines.length} lines from raw TSV.`);

  const rawRows = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split('\t').map(p => p.trim());
    if (i === 0 && parts[0].toLowerCase().includes('s.no')) continue;
    if (parts.length < 5) continue;

    const sNo = parts[0];
    const rawPolicyNo = parts[1] ? parts[1].replace(/:+$/, '').trim() : '';
    const rawExpiry = parts[2];
    const expiryDate = parseExpiryDate(rawExpiry);
    const rawName = parts[3] ? parts[3].replace(/\s+/g, ' ').trim() : '';
    let rawMobile = parts[4] ? parts[4].replace(/\D/g, '').trim() : '';
    if (rawMobile.length > 10) rawMobile = rawMobile.slice(-10);
    const rawPremium = parts[5] && parts[5] !== '—' ? parts[5].replace(/,/g, '').trim() : '';
    const rawServiceTax = parts[6] && parts[6] !== '—' ? parts[6].replace(/,/g, '').trim() : '';
    const rawRegNo = parts[7] && parts[7] !== '—' ? parts[7].toUpperCase().trim() : '';
    const rawMake = parts[8] && parts[8] !== '—' ? parts[8].trim() : '';
    const rawModel = parts[9] && parts[9] !== '—' ? parts[9].trim() : '';
    const rawMakeModel = [rawMake, rawModel].filter(Boolean).join(' ');
    const rawType = parts[10] && parts[10] !== '—' ? parts[10].trim() : 'Motor Policy';
    const rawCompany = parts[11] && parts[11] !== '—' ? parts[11].trim() : '';
    const normalizedCompany = normalizeRenewalInsuranceCompany(rawCompany) || rawCompany;

    rawRows.push({
      sNo,
      rawPolicyNo,
      rawExpiry,
      expiryDate,
      rawName,
      rawMobile,
      rawPremium,
      rawServiceTax,
      rawRegNo,
      rawMake,
      rawModel,
      rawMakeModel,
      rawType,
      rawCompany,
      normalizedCompany
    });
  }

  console.log(`Parsed ${rawRows.length} valid renewal rows.`);

  // Write Excel file for auditing and record-keeping
  const excelData = rawRows.map((r, idx) => ({
    "S.No": idx + 1,
    "Policy Number": r.rawPolicyNo,
    "Expiry Date": r.expiryDate,
    "Insured Name": r.rawName,
    "Contact Number": r.rawMobile,
    "Gross Premium": r.rawPremium ? Number(r.rawPremium) : "",
    "Service Tax": r.rawServiceTax ? Number(r.rawServiceTax) : "",
    "Registration Number": r.rawRegNo,
    "Make / Model": r.rawMakeModel,
    "Policy Type": r.rawType,
    "Insurance Company": r.normalizedCompany,
  }));
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "December 2026 Renewals");
  XLSX.writeFile(wb, excelPath);
  console.log(`Generated Excel audit workbook at: ${excelPath}`);

  // Fetch existing records for duplicate avoidance
  const existingRecords = await prisma.policyRecord.findMany({
    where: {
      extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD,
      sourceFile: sourceFileName,
      deletedAt: null,
    },
    select: { id: true, data: true, reviewedData: true },
  });

  const renewalKeys = new Set(
    existingRecords.map((r) => buildRenewalImportKey(r.reviewedData || r.data || {})),
  );
  console.log(`Found ${existingRecords.length} existing renewal records for "${sourceFileName}".`);

  // Customer portfolio cache
  const portfolioCache = new Map();
  const resolvePortfolio = async (payload, policyId) => {
    const digits = String(payload.contactNumber || payload.customerMobile || "").replace(/\D/g, "");
    const mobile = digits.length >= 10 ? digits.slice(-10) : `NO-MOBILE-${policyId}`;
    if (portfolioCache.has(mobile)) return portfolioCache.get(mobile);

    let portfolio = await prisma.customerProfile.findFirst({
      where: {
        phone: { contains: mobile },
        deletedAt: null,
        organizationId: null,
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (!portfolio) {
      portfolio = await prisma.customerProfile.create({
        data: {
          name: resolvePolicyCustomerName(payload) || payload.insuredName || "Unnamed Customer",
          phone: mobile,
          email: String(payload.email || payload.customerEmail || "").trim() || null,
          contactPersonName: resolvePolicyCustomerName(payload) || payload.insuredName || null,
          organizationId: null,
          sourcePolicyId: policyId,
        },
        select: { id: true },
      });
    }

    portfolioCache.set(mobile, portfolio.id);
    return portfolio.id;
  };

  let insertedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    const payload = {
      sNo: row.sNo || (i + 1),
      insuredName: row.rawName,
      policyNumber: row.rawPolicyNo,
      policyType: row.rawType,
      product: row.rawType,
      expiryDate: row.expiryDate,
      policyEndDate: row.expiryDate,
      insuranceCompany: row.normalizedCompany,
      companyName: row.normalizedCompany,
      contactNumber: row.rawMobile,
      customerMobile: row.rawMobile,
      premium: row.rawPremium,
      totalPremium: row.rawPremium,
      grossPremium: row.rawPremium,
      serviceTax: row.rawServiceTax,
      vehicleNumber: row.rawRegNo,
      registrationNumber: row.rawRegNo,
      make: row.rawMake,
      model: row.rawModel,
      makeModel: row.rawMakeModel,
      status: "ACTIVE",
      renewalStatus: "ACTIVE",
      sourceFile: sourceFileName,
      manualRenewalSource: true,
      policyCategory: "Motor Policy",
    };

    payload.customerId = buildCustomerId(row.rawName, row.rawMobile);

    const renewalKey = buildRenewalImportKey(payload);
    if (renewalKeys.has(renewalKey)) {
      console.log(`[Row ${i + 1}] Skipping duplicate renewal: ${renewalKey}`);
      skippedCount++;
      continue;
    }

    const recordDate = new Date();
    const recordId = randomUUID();
    const portfolioId = await resolvePortfolio(payload, recordId);
    const contactName = resolvePolicyCustomerName(payload) || row.rawName;

    const grossPremNum = parseCanonicalNumber(row.rawPremium);
    const parsedExpDate = parseCanonicalDate(row.expiryDate);
    const normPolNo = row.rawPolicyNo ? row.rawPolicyNo.toLowerCase().replace(/[^a-z0-9]/g, '') : null;

    await prisma.policyRecord.create({
      data: {
        id: recordId,
        savedAt: recordDate,
        createdAt: recordDate,
        updatedAt: recordDate,
        data: payload,
        pdfFileName: sourceFileName,
        pdfMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sourceFile: sourceFileName,
        rawText: "",
        detectedBankSource: "",
        detectedCompany: row.normalizedCompany,
        detectedServiceCategory: "",
        detectedPolicyType: row.rawType,
        selectedBankSource: "",
        selectedCompany: row.normalizedCompany,
        selectedServiceCategory: "",
        selectedPolicyType: row.rawType,
        confidenceScore: 1.0,
        extractedData: payload,
        reviewedData: payload,
        extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD,
        extractionQuality: {},
        extractionLog: {},
        schemaVersion: 1,
        organizationId: null,
        createdById: null,
        updatedById: null,
        renewalStatus: "ACTIVE",
        isActivePolicy: true,
        customerPortfolioId: portfolioId,
        contactPersonName: contactName || null,
        contactPersonMobile: row.rawMobile || null,
        contactPersonEmail: null,
        renewalRecipientName: contactName || null,
        renewalRecipientMobile: row.rawMobile || null,
        renewalRecipientEmail: null,

        // Canonical fields
        policyNumber: row.rawPolicyNo || null,
        normalizedPolicyNumber: normPolNo,
        insuredName: row.rawName || null,
        grossPremium: grossPremNum,
        totalPremium: grossPremNum,
        netPremium: null,
        policyExpiryDate: parsedExpDate,
        vehicleRegistrationNumber: row.rawRegNo || null,
        makeModel: row.rawMakeModel || null,
        policyCategory: "Motor Policy",
      },
    });

    renewalKeys.add(renewalKey);
    insertedCount++;

    if (insertedCount % 25 === 0 || insertedCount === rawRows.length) {
      console.log(`Imported ${insertedCount}/${rawRows.length} records...`);
    }
  }

  console.log(`\n========================================`);
  console.log(`December 2026 Renewal Import Complete!`);
  console.log(`- Inserted: ${insertedCount}`);
  console.log(`- Skipped: ${skippedCount}`);
  console.log(`- Total processed: ${rawRows.length}`);
  console.log(`========================================`);
}

run()
  .catch((err) => {
    console.error("Error during December renewal import:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
