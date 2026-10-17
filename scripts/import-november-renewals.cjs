require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const { buildRenewalImportKey, excelDateToString } = require('../src/lib/renewals/import-identity.cjs');
const { normalizeRenewalInsuranceCompany } = require('../src/lib/renewals/companies');
const { resolvePolicyCustomerName } = require('../src/lib/renewals/customer-name');

const prisma = new PrismaClient();
const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";
const sourceFileName = "November_2026_Renewals.xlsx";
const excelPath = path.join(process.cwd(), sourceFileName);

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
  console.log(`Starting November 2026 Renewal Import from: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0] || "Sheet1";
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  console.log(`Loaded ${rawRows.length} raw rows from sheet "${sheetName}".`);

  // Ensure organizationId: null to match Manager/Payal and existing renewal imports
  const organizationId = null;

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
          name: resolvePolicyCustomerName(payload) || "Unnamed Customer",
          phone: mobile,
          email: String(payload.email || payload.customerEmail || "").trim() || null,
          contactPersonName: resolvePolicyCustomerName(payload) || null,
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

    let rawPolicyNo = String(row['Policy Number'] || '').trim();
    rawPolicyNo = rawPolicyNo.replace(/:+$/, '').trim();

    const rawCompany = String(row['Insurance Company'] || '').trim();
    const normalizedCompany = normalizeRenewalInsuranceCompany(rawCompany) || rawCompany;

    const rawType = String(row['Policy Type'] || '').trim();
    const expiryDate = String(row['Expiry Date'] || '').trim();

    const rawName = String(row['Insured Name'] || '').trim().replace(/\s+/g, ' ');
    const rawMobile = String(row['Contact Number'] || row['MOB NO'] || row['Mobile'] || '').replace(/\D/g, '').trim();

    const rawPremium = row['Gross Premium'] !== undefined && row['Gross Premium'] !== '' ? String(row['Gross Premium']).replace(/,/g, '').trim() : '';
    const rawRegNo = String(row['Registration Number'] || row['Registration No'] || '').trim().toUpperCase();
    const rawMakeModel = String(row['Make / Model'] || row['Make/Model'] || '').trim();
    const rawRemark = String(row['Remark'] || '').trim();
    const rawQuote = String(row['Quote'] || '').trim();

    if (!rawName && !rawPolicyNo && !rawRegNo) {
      console.log(`[Row ${i + 1}] Skipping empty row`);
      continue;
    }

    const payload = {
      sNo: row['S.No'] || (i + 1),
      insuredName: rawName,
      policyNumber: rawPolicyNo,
      policyType: rawType,
      product: rawType,
      expiryDate: expiryDate,
      insuranceCompany: normalizedCompany,
      companyName: normalizedCompany,
      contactNumber: rawMobile,
      customerMobile: rawMobile,
      premium: rawPremium,
      totalPremium: rawPremium,
      grossPremium: rawPremium,
      vehicleNumber: rawRegNo,
      registrationNumber: rawRegNo,
      makeModel: rawMakeModel,
      remark: rawRemark,
      quote: rawQuote,
      status: "ACTIVE",
      sourceFile: sourceFileName,
      manualRenewalSource: true,
      policyCategory: "Motor Policy",
    };

    payload.customerId = buildCustomerId(rawName, rawMobile);

    const renewalKey = buildRenewalImportKey(payload);
    if (renewalKeys.has(renewalKey)) {
      console.log(`[Row ${i + 1}] Skipping already imported renewal: ${renewalKey}`);
      skippedCount++;
      continue;
    }

    const recordDate = new Date();
    const recordId = randomUUID();
    const portfolioId = await resolvePortfolio(payload, recordId);
    const contactName = resolvePolicyCustomerName(payload) || rawName;

    const grossPremNum = parseCanonicalNumber(rawPremium);
    const parsedExpDate = parseCanonicalDate(expiryDate);
    const normPolNo = rawPolicyNo ? rawPolicyNo.toLowerCase().replace(/[^a-z0-9]/g, '') : null;

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
        detectedCompany: normalizedCompany,
        detectedServiceCategory: "",
        detectedPolicyType: rawType,
        selectedBankSource: "",
        selectedCompany: normalizedCompany,
        selectedServiceCategory: "",
        selectedPolicyType: rawType,
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
        contactPersonMobile: rawMobile || null,
        contactPersonEmail: null,
        renewalRecipientName: contactName || null,
        renewalRecipientMobile: rawMobile || null,
        renewalRecipientEmail: null,

        // Canonical fields
        policyNumber: rawPolicyNo || null,
        normalizedPolicyNumber: normPolNo,
        insuredName: rawName || null,
        grossPremium: grossPremNum,
        totalPremium: grossPremNum,
        netPremium: null,
        policyExpiryDate: parsedExpDate,
        vehicleRegistrationNumber: rawRegNo || null,
        makeModel: rawMakeModel || null,
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
  console.log(`November Renewal Import Complete!`);
  console.log(`- Inserted: ${insertedCount}`);
  console.log(`- Skipped: ${skippedCount}`);
  console.log(`- Total processed: ${rawRows.length}`);
  console.log(`========================================`);
}

run()
  .catch((err) => {
    console.error("Error during November renewal import:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
