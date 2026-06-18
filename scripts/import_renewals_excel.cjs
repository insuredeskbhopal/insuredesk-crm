const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();
const excelPath = "c:\\Users\\Wim11\\Desktop\\bimaheadquarter\\storage\\samples\\Renewal Page data.xlsx";

// Default fallback IDs
const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_USER_ID = "8da47c4c-ee67-45dc-bcb3-af7758f31129";

// Convert Excel serial date to YYYY-MM-DD
function excelDateToString(excelDate) {
  if (excelDate === null || excelDate === undefined || excelDate === "") return "";
  if (excelDate instanceof Date) {
    try {
      return excelDate.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  }

  const num = Number(excelDate);
  if (isNaN(num)) {
    // Attempt to parse text date
    const parsed = Date.parse(excelDate);
    if (!isNaN(parsed)) {
      try {
        return new Date(parsed).toISOString().split("T")[0];
      } catch (e) {
        return "";
      }
    }
    return String(excelDate).trim();
  }

  try {
    // Excel base date: Dec 30, 1899
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);

    const yyyy = date_info.getFullYear();
    const mm = String(date_info.getMonth() + 1).padStart(2, "0");
    const dd = String(date_info.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return String(excelDate).trim();
  }
}

async function main() {
  console.log("Loading Excel workbook...");
  const workbook = XLSX.readFile(excelPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Parse rows as raw JSON objects
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  console.log(`Loaded ${rawRows.length} raw rows from sheet "${firstSheetName}".`);

  // Dynamically import ESM helpers from workspace
  console.log("Importing sanitizeRecordPayload ESM helper...");
  const validationModule = await import("../lib/records/validation.js");
  const sanitizeRecordPayload = validationModule.sanitizeRecordPayload;

  console.log("Importing buildCustomerId helper...");
  const recordsModule = await import("../lib/records/index.js");
  const buildCustomerId = recordsModule.buildCustomerId;

  // Retrieve default Organization and User to avoid hardcoded fallbacks failing constraints
  const dbOrg = await prisma.organization.findFirst();
  const dbUser = await prisma.user.findFirst();
  const organizationId = dbOrg ? dbOrg.id : DEFAULT_ORG_ID;
  const createdById = dbUser ? dbUser.id : DEFAULT_USER_ID;

  console.log(`Using Organization ID: ${organizationId}`);
  console.log(`Using User ID: ${createdById}`);

  // Clear previous imports to remain idempotent
  console.log("Clearing previous imports from 'Renewal Page data.xlsx'...");
  const deleteResult = await prisma.policyRecord.deleteMany({
    where: { sourceFile: "Renewal Page data.xlsx" },
  });
  console.log(`Deleted ${deleteResult.count} existing records.`);

  let insertedCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    // Map Excel columns to our database and schema properties
    // Headers: Product, Insured/Proposer Name, Policy Number, End Date, Status, Expiring Policy Sum Insured, Expiring Policy Premium, MOB, REMARK
    const product = String(row["Product"] || "").trim();
    const name = String(row["Insured/Proposer Name"] || "").trim();
    const policyNo = String(row["Policy Number"] || "").trim();
    const endDateRaw = row["End Date"];
    const status = String(row["Status"] || "").trim();
    const sumInsuredRaw = row["Expiring Policy Sum Insured"];
    const premiumRaw = row["Expiring Policy Premium"];
    const mob = String(row["MOB"] || "").trim();
    const remark = String(row["REMARK"] || "").trim();

    if (!name && !policyNo) {
      console.log(`[${i + 1}/${rawRows.length}] Skipping empty row`);
      continue;
    }

    const expiryDate = excelDateToString(endDateRaw);

    // Build payload to feed into sanitizeRecordPayload
    const payload = {
      insuredName: name,
      policyNumber: policyNo,
      policyType: product,
      expiryDate: expiryDate,
      sumInsured: sumInsuredRaw ? String(sumInsuredRaw).trim() : "",
      premium: premiumRaw ? String(premiumRaw).trim() : "",
      totalPremium: premiumRaw ? String(premiumRaw).trim() : "",
      contactNumber: mob,
      customerMobile: mob,
      remark: remark,
      sourceFile: "Renewal Page data.xlsx",
    };

    // Build customer ID
    let customerId = "";
    if (name && mob) {
      customerId = buildCustomerId(name, mob);
    }
    payload.customerId = customerId;

    const sanitizedData = sanitizeRecordPayload(payload);

    // Map the Status column to renewalStatus and isActivePolicy
    const statusLower = status.toLowerCase();
    let renewalStatus = "ACTIVE";
    let isActivePolicy = true;

    if (statusLower === "renewed") {
      renewalStatus = "RENEWED";
      isActivePolicy = false;
    } else if (statusLower === "lost") {
      renewalStatus = "LOST";
      isActivePolicy = false;
    }

    const recordDate = new Date();

    const policyRecordPayload = {
      id: randomUUID(),
      savedAt: recordDate,
      createdAt: recordDate,
      updatedAt: recordDate,
      data: sanitizedData,
      pdfFileName: "Renewal Page data.xlsx",
      pdfMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sourceFile: "Renewal Page data.xlsx",
      rawText: "",
      detectedBankSource: "",
      detectedCompany: "",
      detectedServiceCategory: "",
      detectedPolicyType: product,
      selectedBankSource: "",
      selectedCompany: "",
      selectedServiceCategory: "",
      selectedPolicyType: product,
      confidenceScore: 1.0,
      extractedData: sanitizedData,
      reviewedData: sanitizedData,
      extractionMethod: "excel_import",
      extractionQuality: {},
      extractionLog: {},
      schemaVersion: 1,
      organization: organizationId ? { connect: { id: organizationId } } : undefined,
      createdBy: createdById ? { connect: { id: createdById } } : undefined,

      // Renewal specific fields
      renewalStatus: renewalStatus,
      isActivePolicy: isActivePolicy,
    };

    console.log(
      `[${i + 1}/${rawRows.length}] Saving Policy Record for "${sanitizedData.insuredName}" (Status: ${renewalStatus})`,
    );
    await prisma.policyRecord.create({
      data: policyRecordPayload,
    });
    insertedCount++;
  }

  console.log(`\nImport Completed: Successfully inserted ${insertedCount} policy records.`);
}

main()
  .catch((err) => {
    console.error("Error during import execution:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
