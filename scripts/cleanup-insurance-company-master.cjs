const { PrismaClient } = require("@prisma/client");
const {
  INSURANCE_COMPANY_MASTER,
  getInsuranceCompanyNames,
  normalizeCompanyToken,
  normalizeInsuranceCompanyName
} = require("../lib/master/insurance-companies.cjs");

const prisma = new PrismaClient();

function standardizePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const standardCompany = normalizeInsuranceCompanyName(
    payload.insuranceCompany || payload.companyName || payload.insurerName || payload.selectedCompany || payload.detectedCompany,
    payload.sourceText || ""
  );
  if (!standardCompany || standardCompany === (payload.insuranceCompany || payload.companyName)) return payload;
  return {
    ...payload,
    insuranceCompany: standardCompany,
    companyName: standardCompany
  };
}

function hasPayloadChanged(before, after) {
  return JSON.stringify(before || null) !== JSON.stringify(after || null);
}

async function moveCompanyReferences(fromId, toId) {
  await prisma.uploadedFile.updateMany({
    where: { detectedCompanyId: fromId },
    data: { detectedCompanyId: toId }
  });

  await prisma.policySchema.updateMany({
    where: { insuranceCompanyId: fromId },
    data: { insuranceCompanyId: toId }
  });

  const policyTypes = await prisma.policyType.findMany({
    where: { insuranceCompanyId: fromId }
  });

  for (const policyType of policyTypes) {
    const duplicate = await prisma.policyType.findFirst({
      where: {
        id: { not: policyType.id },
        name: policyType.name,
        serviceCategoryId: policyType.serviceCategoryId,
        insuranceCompanyId: toId
      }
    });

    if (duplicate) {
      await prisma.policySchema.updateMany({
        where: { policyTypeId: policyType.id },
        data: { policyTypeId: duplicate.id }
      });
      await prisma.uploadedFile.updateMany({
        where: { detectedPolicyTypeId: policyType.id },
        data: { detectedPolicyTypeId: duplicate.id }
      });
      await prisma.policyType.delete({ where: { id: policyType.id } });
    } else {
      await prisma.policyType.update({
        where: { id: policyType.id },
        data: { insuranceCompanyId: toId }
      });
    }
  }
}

async function cleanupMasterCompanies() {
  const canonicalNames = getInsuranceCompanyNames();
  const canonicalByName = new Map();

  for (const company of INSURANCE_COMPANY_MASTER) {
    const row = await prisma.insuranceCompany.upsert({
      where: { name: company.name },
      update: { aliases: company.aliases, active: company.active },
      create: { name: company.name, aliases: company.aliases, active: company.active }
    });
    canonicalByName.set(company.name, row);
  }

  const allRows = await prisma.insuranceCompany.findMany();
  let removed = 0;
  let deactivated = 0;

  for (const row of allRows) {
    if (canonicalNames.includes(row.name)) continue;
    const standardName = normalizeInsuranceCompanyName(row.name);
    const canonical = canonicalByName.get(standardName);

    if (canonical) {
      await moveCompanyReferences(row.id, canonical.id);
      await prisma.insuranceCompany.delete({ where: { id: row.id } });
      removed += 1;
    } else {
      await prisma.insuranceCompany.update({
        where: { id: row.id },
        data: { active: false }
      });
      deactivated += 1;
    }
  }

  return { removed, deactivated };
}

async function cleanupPolicyRecords() {
  const records = await prisma.policyRecord.findMany({
    select: {
      id: true,
      data: true,
      reviewedData: true,
      extractedData: true,
      selectedCompany: true,
      detectedCompany: true,
      rawText: true
    }
  });

  let updated = 0;
  for (const record of records) {
    const data = standardizePayload(record.data);
    const reviewedData = standardizePayload(record.reviewedData);
    const extractedData = standardizePayload(record.extractedData);
    const selectedCompany = normalizeInsuranceCompanyName(record.selectedCompany || data?.insuranceCompany || reviewedData?.insuranceCompany || extractedData?.insuranceCompany, record.rawText || "");
    const detectedCompany = normalizeInsuranceCompanyName(record.detectedCompany || extractedData?.insuranceCompany || data?.insuranceCompany, record.rawText || "");

    const update = {};
    if (hasPayloadChanged(record.data, data)) update.data = data;
    if (hasPayloadChanged(record.reviewedData, reviewedData)) update.reviewedData = reviewedData;
    if (hasPayloadChanged(record.extractedData, extractedData)) update.extractedData = extractedData;
    if (selectedCompany && selectedCompany !== record.selectedCompany) update.selectedCompany = selectedCompany;
    if (detectedCompany && detectedCompany !== record.detectedCompany) update.detectedCompany = detectedCompany;

    if (Object.keys(update).length) {
      await prisma.policyRecord.update({ where: { id: record.id }, data: update });
      updated += 1;
    }
  }

  return updated;
}

async function cleanupUploadedFiles() {
  const files = await prisma.uploadedFile.findMany({
    select: {
      id: true,
      extractedData: true,
      detectedCompanyName: true,
      rawText: true
    }
  });

  const companies = await prisma.insuranceCompany.findMany();
  const companyByToken = new Map(companies.map((company) => [normalizeCompanyToken(company.name), company]));

  let updated = 0;
  for (const file of files) {
    const extractedData = standardizePayload(file.extractedData);
    const standardCompany = normalizeInsuranceCompanyName(file.detectedCompanyName || extractedData?.insuranceCompany, file.rawText || "");
    const company = companyByToken.get(normalizeCompanyToken(standardCompany));
    const update = {};

    if (hasPayloadChanged(file.extractedData, extractedData)) update.extractedData = extractedData;
    if (standardCompany && standardCompany !== file.detectedCompanyName) update.detectedCompanyName = standardCompany;
    if (company) update.detectedCompanyId = company.id;

    if (Object.keys(update).length) {
      await prisma.uploadedFile.update({ where: { id: file.id }, data: update });
      updated += 1;
    }
  }

  return updated;
}

async function main() {
  const master = await cleanupMasterCompanies();
  const records = await cleanupPolicyRecords();
  const uploads = await cleanupUploadedFiles();

  console.log("Insurance company cleanup complete.");
  console.log(`Canonical companies: ${getInsuranceCompanyNames().length}`);
  console.log(`Duplicate master rows removed: ${master.removed}`);
  console.log(`Unknown master rows deactivated: ${master.deactivated}`);
  console.log(`Policy records standardized: ${records}`);
  console.log(`Uploaded files standardized: ${uploads}`);
}

main()
  .catch((error) => {
    console.error("Insurance company cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
