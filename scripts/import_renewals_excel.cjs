const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");
const { randomUUID } = require("crypto");
const path = require("path");

const prisma = new PrismaClient();
const excelPath = process.argv[2] || path.join(process.cwd(), "storage", "Non_Motor_July_2026_Renewal_Data (1).xlsx");
const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";

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

function buildCustomerId(name, mobile) {
  const namePart = String(name || "")
    .replace(/^(m\/s|mr|mrs|ms)\.?\s+/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase();
  const digits = String(mobile || "").replace(/\D/g, "");
  return `${namePart}${digits.slice(-4)}`;
}

async function main() {
  console.log("Loading Excel workbook...");
  const workbook = XLSX.readFile(excelPath);
  const sourceFileName = path.basename(excelPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Parse rows as raw JSON objects
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  console.log(`Loaded ${rawRows.length} raw rows from sheet "${firstSheetName}".`);

  // Manual renewal data is not a user-created policy entry.
  const dbOrg = await prisma.organization.findFirst();
  const organizationId = dbOrg ? dbOrg.id : null;

  console.log(`Using Organization ID: ${organizationId}`);

  // Clear previous imports to remain idempotent
  console.log(`Clearing previous imports from '${sourceFileName}'...`);
  const deleteResult = await prisma.policyRecord.deleteMany({
    where: { sourceFile: sourceFileName },
  });
  console.log(`Deleted ${deleteResult.count} existing records.`);

  let insertedCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    // Map Excel columns to our database and schema properties
    // Headers: Product, Insured/Proposer Name, Policy Number, End Date, Status, Expiring Policy Sum Insured, Expiring Policy Premium, MOB, REMARK
    const product = String(row["Product"] || row["LOB"] || "").trim();
    const name = String(row["Insured/Proposer Name"] || row["Name"] || "").trim();
    const policyNo = String(row["Policy Number"] || row["PolicyNo"] || "").trim();
    const endDateRaw = row["End Date"] || row["ExpiryDate"];
    const status = String(row["Status"] || "").trim();
    const sumInsuredRaw = row["Expiring Policy Sum Insured"] || row["SUM INSURED"];
    const premiumRaw = row["Expiring Policy Premium"] || row["PREMIUM"];
    const mob = String(row["MOB"] || row["MOB NO"] || "").trim();
    const remark = String(row["REMARK"] || "").trim();
    const insuranceCompany = String(row["Insurance company"] || row["Insurance Company"] || "").trim();

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
      insuranceCompany,
      companyName: insuranceCompany,
      sourceFile: sourceFileName,
      manualRenewalSource: true,
    };

    // Build customer ID
    let customerId = "";
    if (name && mob) {
      customerId = buildCustomerId(name, mob);
    }
    payload.customerId = customerId;

    const sanitizedData = payload;

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
      pdfFileName: sourceFileName,
      pdfMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sourceFile: sourceFileName,
      rawText: "",
      detectedBankSource: "",
      detectedCompany: insuranceCompany,
      detectedServiceCategory: "",
      detectedPolicyType: product,
      selectedBankSource: "",
      selectedCompany: insuranceCompany,
      selectedServiceCategory: "",
      selectedPolicyType: product,
      confidenceScore: 1.0,
      extractedData: sanitizedData,
      reviewedData: sanitizedData,
      extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD,
      extractionQuality: {},
      extractionLog: {},
      schemaVersion: 1,
      organizationId,
      createdById: null,
      updatedById: null,

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
