const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const { randomUUID } = require("crypto");
const path = require("path");

const prisma = new PrismaClient();

// Absolute path to the converted JSON file
const jsonPath = path.resolve("C:\\Users\\Wim11\\.gemini\\antigravity-ide\\brain\\c6e988e9-59b6-4897-86a7-abf20995200d\\scratch\\LAST_MONTH_DATA_MAPPED.json");

// Define defaults as discovered
const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_USER_ID = "8da47c4c-ee67-45dc-bcb3-af7758f31129";

async function main() {
  console.log("Loading converted JSON data...");
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const records = JSON.parse(rawData);
  console.log(`Loaded ${records.length} records.`);

  // Dynamically import the ES module sanitizer from within the workspace
  console.log("Importing sanitizeRecordPayload ESM helper...");
  const validationModule = await import("../lib/record-validation.js");
  const sanitizeRecordPayload = validationModule.sanitizeRecordPayload;

  // Make the script idempotent by clearing previous imports
  console.log("Deleting any existing policy records associated with 'LAST MONTH DATA.xlsx'...");
  const deleteResult = await prisma.policyRecord.deleteMany({
    where: { sourceFile: "LAST MONTH DATA.xlsx" }
  });
  console.log(`Deleted ${deleteResult.count} existing records.`);

  let insertedCount = 0;

  for (const record of records) {
    // Sanitize the raw payload
    const data = sanitizeRecordPayload(record);

    // Determine the timeline date based on sourcingDate / issuanceDate
    const recordDate = data.issuanceDate ? new Date(data.issuanceDate) : new Date();

    const policyRecordPayload = {
      id: randomUUID(),
      savedAt: recordDate,
      createdAt: recordDate,
      updatedAt: new Date(),
      data: data,
      pdfFileName: "LAST MONTH DATA.xlsx",
      pdfMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sourceFile: "LAST MONTH DATA.xlsx",
      rawText: "",
      detectedBankSource: "",
      detectedCompany: data.insuranceCompany || "",
      detectedServiceCategory: "",
      detectedPolicyType: data.policyType || "",
      selectedBankSource: "",
      selectedCompany: data.insuranceCompany || "",
      selectedServiceCategory: "",
      selectedPolicyType: data.policyType || "",
      confidenceScore: 1.0,
      extractedData: data,
      reviewedData: data,
      extractionMethod: "excel_import",
      extractionQuality: {},
      extractionLog: {},
      schemaVersion: 1,
      uploadedFileId: null,
      policySchemaId: null,
      organizationId: DEFAULT_ORG_ID,
      createdById: DEFAULT_USER_ID
    };

    console.log(`Inserting Policy Record: ${policyRecordPayload.id} for "${data.insuredName}"`);
    await prisma.policyRecord.create({
      data: policyRecordPayload
    });
    insertedCount++;
  }

  console.log(`\nImport Completed: Successfully inserted ${insertedCount} policy records into the database.`);
}

main()
  .catch((err) => {
    console.error("Error during import execution:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
