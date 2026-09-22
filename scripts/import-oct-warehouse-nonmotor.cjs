require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const {
  buildRenewalImportKey,
  excelDateToString,
  findRenewalImportMatch,
  mergeRenewalImportData,
} = require('../src/lib/renewals/import-identity.cjs');
const { normalizeRenewalInsuranceCompany } = require('../src/lib/renewals/companies');
const { normalizeCustomerName, resolvePolicyCustomerName } = require('../src/lib/renewals/customer-name');

const prisma = new PrismaClient();
const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";
const excelFileName = "warehouse and nonmotor oct 26.xlsx";
const excelPath = path.join(process.cwd(), "storage", excelFileName);

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
  console.log(`Starting October Warehouse & Non-Motor Renewal Import from: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0] || "Sheet1";
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  console.log(`Loaded ${rawRows.length} raw rows from sheet "${sheetName}".`);

  const dbOrg = await prisma.organization.findFirst();
  const organizationId = dbOrg ? dbOrg.id : null;
  console.log(`Organization ID: ${organizationId}`);

  // Preload existing renewal records for these source files to ensure idempotency
  const targetSourceFiles = ["OCT 2026 WAREHOUSE.xlsx", "OCT 2026 NON-MOTOR.xlsx"];
  const existingRecords = await prisma.policyRecord.findMany({
    where: {
      extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD,
      sourceFile: { in: targetSourceFiles },
      organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      data: true,
      reviewedData: true,
      extractedData: true,
      detectedCompany: true,
      detectedPolicyType: true,
      selectedCompany: true,
      selectedPolicyType: true,
      customerPortfolioId: true,
      contactPersonName: true,
      contactPersonMobile: true,
      renewalRecipientName: true,
      renewalRecipientMobile: true,
    },
  });

  console.log(`Found ${existingRecords.length} existing records for target source files.`);

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
          name: resolvePolicyCustomerName(payload) || payload.insuredName || "Unnamed Customer",
          phone: mobile,
          email: String(payload.email || payload.customerEmail || "").trim() || null,
          contactPersonName: resolvePolicyCustomerName(payload) || payload.contactPerson || null,
          organizationId,
          sourcePolicyId: policyId,
        },
        select: { id: true },
      });
    }

    portfolioCache.set(mobile, portfolio.id);
    return portfolio.id;
  };

  let warehouseCount = 0;
  let nonMotorCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const cat = String(row.Cat || "").trim();
    const isWarehouse = /^warehouse$/i.test(cat);
    const isNonMotor = /non\s*motor/i.test(cat);

    if (!isWarehouse && !isNonMotor) {
      console.warn(`[Row ${i + 1}] Unknown category "${cat}", skipping.`);
      continue;
    }

    if (isWarehouse) warehouseCount++;
    if (isNonMotor) nonMotorCount++;

    const sourceFileName = isWarehouse ? "OCT 2026 WAREHOUSE.xlsx" : "OCT 2026 NON-MOTOR.xlsx";
    const categoryName = isWarehouse ? "Warehouse Policy" : "Non-Motor Policy";

    let rawProduct = String(row.Product || "").trim();
    let policyType = rawProduct;
    if (isWarehouse && /^warehouse$/i.test(rawProduct)) {
      policyType = "Warehouse Policy";
    }

    let policyNumber = String(row['Policy Number'] || '').replace(/:+$/, '').trim();
    const rawCompany = String(row['Lost Type'] || '').trim();
    const normalizedCompany = normalizeRenewalInsuranceCompany(rawCompany);
    const expiryDate = excelDateToString(row['End Date']);
    const insuredName = String(row['Insured/Proposer Name'] || '').trim().replace(/\s+/g, ' ');

    const rawMob = String(row['MOBILE NO.'] || '').trim();
    const mobParts = rawMob.split(/[/,]/);
    const primaryDigits = mobParts[0].replace(/\D/g, '');
    const primaryMobile = primaryDigits.length >= 10 ? primaryDigits.slice(-10) : primaryDigits;
    const secondaryDigits = mobParts[1] ? mobParts[1].replace(/\D/g, '') : '';
    const secondaryMobile = secondaryDigits.length >= 10 ? secondaryDigits.slice(-10) : secondaryDigits;

    const contactPerson = String(row['CONTACT NAME'] || '').trim();
    const sumInsured = row['Sum Insured'] !== undefined && row['Sum Insured'] !== '' ? String(row['Sum Insured']).trim() : '';
    const premium = row['Premium'] !== undefined && row['Premium'] !== '' ? String(row['Premium']).trim() : '';

    const payload = {
      sNo: row.SNo || (i + 1),
      insuredName,
      policyNumber,
      policyType,
      product: policyType,
      policyCategory: categoryName,
      documentCategory: categoryName,
      expiryDate,
      insuranceCompany: normalizedCompany,
      companyName: normalizedCompany,
      contactPerson,
      contactPersonName: contactPerson,
      contactNumber: primaryMobile,
      customerMobile: primaryMobile,
      ...(secondaryMobile ? { alternateMobile: secondaryMobile } : {}),
      sumInsured,
      premium,
      totalPremium: premium,
      sourceFile: sourceFileName,
      manualRenewalSource: true,
      customerId: buildCustomerId(insuredName, primaryMobile),
    };

    const match = findRenewalImportMatch(payload, existingRecords);

    if (match.status === "matched") {
      const record = match.record;
      const contactName = normalizeCustomerName(record.contactPersonName) || contactPerson || resolvePolicyCustomerName(payload);
      const contactMob = String(record.contactPersonMobile || primaryMobile).trim();
      const portfolioId = record.customerPortfolioId || (await resolvePortfolio({ ...payload, contactNumber: contactMob }, record.id));
      const dataMerge = mergeRenewalImportData(record.data || {}, payload);
      const reviewedMerge = mergeRenewalImportData(record.reviewedData || record.data || {}, payload);
      const extractedMerge = mergeRenewalImportData(record.extractedData || record.data || {}, payload);

      const updateData = {
        customerPortfolioId: portfolioId,
        contactPersonName: contactName || null,
        contactPersonMobile: contactMob || null,
        renewalRecipientName: normalizeCustomerName(record.renewalRecipientName) || contactName || null,
        renewalRecipientMobile: record.renewalRecipientMobile || contactMob || null,
        detectedCompany: normalizedCompany,
        selectedCompany: normalizedCompany,
        detectedPolicyType: policyType,
        selectedPolicyType: policyType,
        renewalStatus: "ACTIVE",
        isActivePolicy: true,
      };

      if (dataMerge.changedFields.length) updateData.data = dataMerge.data;
      if (reviewedMerge.changedFields.length) updateData.reviewedData = reviewedMerge.data;
      if (extractedMerge.changedFields.length) updateData.extractedData = extractedMerge.data;

      await prisma.policyRecord.update({
        where: { id: record.id },
        data: updateData,
      });
      Object.assign(record, updateData);
      updatedCount++;
    } else {
      const recordDate = new Date();
      const recordId = randomUUID();
      const portfolioId = await resolvePortfolio(payload, recordId);
      const contactName = contactPerson || resolvePolicyCustomerName(payload) || insuredName;

      const created = await prisma.policyRecord.create({
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
          detectedPolicyType: policyType,
          selectedBankSource: "",
          selectedCompany: normalizedCompany,
          selectedServiceCategory: "",
          selectedPolicyType: policyType,
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
          contactPersonMobile: primaryMobile || null,
          renewalRecipientName: contactName || null,
          renewalRecipientMobile: primaryMobile || null,
        },
      });
      existingRecords.push(created);
      insertedCount++;
    }

    if ((i + 1) % 25 === 0 || i + 1 === rawRows.length) {
      console.log(`Processed ${i + 1}/${rawRows.length} rows...`);
    }
  }

  console.log(`\nImport Summary:`);
  console.log(`- Total Rows Processed: ${rawRows.length}`);
  console.log(`- Warehouse Policies: ${warehouseCount}`);
  console.log(`- Non-Motor Policies: ${nonMotorCount}`);
  console.log(`- Inserted: ${insertedCount}`);
  console.log(`- Updated: ${updatedCount}`);
}

run()
  .catch((err) => {
    console.error("Error during October Warehouse & Non-Motor import:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
