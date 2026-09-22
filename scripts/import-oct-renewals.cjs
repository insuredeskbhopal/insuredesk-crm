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
const sourceFileName = "oct renewal.xlsx";
const excelPath = path.join(process.cwd(), "storage", sourceFileName);

function buildCustomerId(name, mobile) {
  const namePart = String(name || "")
    .replace(/^(m\/s|mr|mrs|ms)\.?\s+/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase();
  const digits = String(mobile || "").replace(/\D/g, "");
  return `${namePart}${digits.slice(-4)}`;
}

async function run() {
  console.log(`Starting October Renewal Import from: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0] || "Sheet1";
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  console.log(`Loaded ${rawRows.length} raw rows from sheet "${sheetName}".`);

  const dbOrg = await prisma.organization.findFirst();
  const organizationId = dbOrg ? dbOrg.id : null;
  console.log(`Organization ID: ${organizationId}`);

  // Fetch only existing records from this sourceFile to ensure idempotency without touching policy records
  const existingRecords = await prisma.policyRecord.findMany({
    where: {
      extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD,
      sourceFile: sourceFileName,
      organizationId,
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
        organizationId,
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
          organizationId,
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
    const normalizedCompany = normalizeRenewalInsuranceCompany(rawCompany);

    let rawType = String(row['Policy Type'] || '').trim();
    if (/^commercial$/i.test(rawType)) {
      rawType = "Commercial Vehicle";
    }
    const rawExpiry = row['Expiry Date'];
    let expiryDate = excelDateToString(rawExpiry);
    if (rawExpiry === 46032) expiryDate = "2026-10-01";
    if (rawExpiry === 46063) expiryDate = "2026-10-02";
    if (rawExpiry === 46122) expiryDate = "2026-10-04";

    const rawName = String(row['Insured Name'] || '').trim().replace(/\s+/g, ' ');
    const rawMobile = String(row['MOBLIE NO'] || row['MOBILE NO'] || row['Mobile'] || '').replace(/\D/g, '').trim();

    const rawSumInsured = row['Sum Insured'] !== undefined && row['Sum Insured'] !== '' ? String(row['Sum Insured']).trim() : '';
    const rawPremium = row['Gross Premium'] !== undefined && row['Gross Premium'] !== '' ? String(row['Gross Premium']).trim() : '';
    const rawRegNo = String(row['Registration No'] || row['Registration Number'] || '').trim().toUpperCase();
    const rawMake = String(row['Make '] || row['Make'] || '').trim();
    const rawModel = String(row['Model'] || '').trim();

    if (!rawName && !rawPolicyNo && !rawRegNo) {
      console.log(`[Row ${i + 1}] Skipping empty row`);
      continue;
    }

    const payload = {
      sNo: row['S.no'] || (i + 1),
      insuredName: rawName,
      policyNumber: rawPolicyNo,
      policyType: rawType,
      product: rawType,
      expiryDate: expiryDate,
      insuranceCompany: normalizedCompany,
      companyName: normalizedCompany,
      contactNumber: rawMobile,
      customerMobile: rawMobile,
      sumInsured: rawSumInsured,
      premium: rawPremium,
      totalPremium: rawPremium,
      vehicleNumber: rawRegNo,
      registrationNumber: rawRegNo,
      vehicleMake: rawMake,
      vehicleModel: rawModel,
      makeModel: [rawMake, rawModel].filter(Boolean).join(" "),
      sourceFile: sourceFileName,
      manualRenewalSource: true,
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
        organizationId,
        renewalStatus: "ACTIVE",
        isActivePolicy: true,
        customerPortfolioId: portfolioId,
        contactPersonName: contactName || null,
        contactPersonMobile: rawMobile || null,
        renewalRecipientName: contactName || null,
        renewalRecipientMobile: rawMobile || null,
      },
    });

    renewalKeys.add(renewalKey);
    insertedCount++;

    if (insertedCount % 20 === 0 || insertedCount === rawRows.length) {
      console.log(`Imported ${insertedCount}/${rawRows.length} records...`);
    }
  }

  console.log(`\nImport Complete!`);
  console.log(`- Inserted: ${insertedCount}`);
  console.log(`- Skipped: ${skippedCount}`);
  console.log(`- Total in file: ${rawRows.length}`);
}

run()
  .catch((err) => {
    console.error("Error during October renewal import:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
