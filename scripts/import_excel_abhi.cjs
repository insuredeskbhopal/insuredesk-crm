const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");
const { randomUUID } = require("crypto");
const path = require("path");

const prisma = new PrismaClient();

const excelPath = "c:\\Users\\Wim11\\Desktop\\bimaheadquarter\\storage\\samples\\Last month abhi.xlsx";
const RTO_FALLBACKS = {
  RJ09: "CHITTORGARH",
  RJ14: "JAIPUR",
  RJ19: "JODHPUR"
};

// Default IDs
const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_USER_ID = "8da47c4c-ee67-45dc-bcb3-af7758f31129";

// RTO Lookup
let rtoMaster = null;
function lookupRtoLocation(vehicleNumber) {
  if (!vehicleNumber) return null;
  const clean = vehicleNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const match = clean.match(/^([A-Z]{2})(\d{1,2})/);
  if (!match) return null;

  const state = match[1];
  const digits = match[2].padStart(2, "0");
  const rtoCode = state + digits;

  if (!rtoMaster) {
    try {
      rtoMaster = require("../rto-data/rto-master.json");
    } catch (e) {
      rtoMaster = {};
    }
  }

  const info = rtoMaster[rtoCode];
  if (info) {
    return (info.rtoOffice || info.district || info.jurisdiction || "").toUpperCase().trim();
  }
  return RTO_FALLBACKS[rtoCode] || null;
}

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

// Map spreadsheet headers (cleaned) to db properties
const headerMap = {
  'insured name': 'insuredName',
  'policy number': 'policyNumber',
  'policy type': 'policyType',
  'premium': 'premium',
  'sum insured': 'sumInsured',
  'start date': 'startDate',
  'expiry date': 'expiryDate',
  'duration': 'duration',
  'insurance company': 'insuranceCompany',
  'cover type': 'policyCoverType',
  'vehicle number': 'vehicleNumber',
  'registration number': 'registrationNumber',
  'make / model': 'makeModel',
  'variant': 'variant',
  'manufacturing year': 'manufacturingYear',
  'registration date': 'registrationDate',
  'engine number': 'engineNumber',
  'chassis number': 'chassisNumber',
  'fuel type': 'fuelType',
  'cubic capacity': 'cubicCapacity',
  'idv': 'idv',
  'ncb': 'ncb',
  'rto location': 'rtoLocation',
  'contact number': 'contactNumber',
  'contact person': 'contactPerson',
  'whatsapp group name': 'whatsappGroupName',
  'total premium': 'totalPremium',
  'net premium': 'netPremium',
  'od premium': 'odPremium',
  'tp+driver+owner': 'tpDriverOwner',
  'collected amount': 'collectedAmount',
  'mode of payment': 'modeOfPayment',
  'remark': 'remark'
};

async function main() {
  console.log("Loading Excel workbook...");
  const workbook = XLSX.readFile(excelPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Parse rows as raw JSON objects
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  console.log(`Loaded ${rawRows.length} raw rows from sheet "${firstSheetName}".`);

  // Dynamically import ESM helper from workspace
  console.log("Importing sanitizeRecordPayload ESM helper...");
  const validationModule = await import("../lib/record-validation.js");
  const sanitizeRecordPayload = validationModule.sanitizeRecordPayload;

  console.log("Importing buildCustomerId helper...");
  const recordsModule = await import("../lib/records.js");
  const buildCustomerId = recordsModule.buildCustomerId;

  // Make script idempotent
  console.log("Clearing previous imports from 'Last month abhi.xlsx'...");
  const deleteResult = await prisma.policyRecord.deleteMany({
    where: { sourceFile: "Last month abhi.xlsx" }
  });
  console.log(`Deleted ${deleteResult.count} existing records.`);

  let insertedCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const payload = {};

    // Map each cell using key mapping
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      const mappedKey = headerMap[cleanKey];
      if (mappedKey) {
        let cleanVal = val;
        if (typeof val === "string") {
          cleanVal = val.trim();
        }

        // Handle dates conversion
        if (["startDate", "expiryDate", "registrationDate"].includes(mappedKey)) {
          cleanVal = excelDateToString(val);
        }

        payload[mappedKey] = cleanVal;
      }
    }

    // Set sourceFile
    payload.sourceFile = "Last month abhi.xlsx";

    // Fallback financial fields if they are blank in the Excel sheet
    payload.premium = payload.premium || payload.totalPremium || payload.netPremium || "";
    payload.sumInsured = payload.sumInsured || payload.idv || "";

    // Auto-fill RTO location if blank
    const regNum = payload.vehicleNumber || payload.registrationNumber;
    if ((!payload.rtoLocation || payload.rtoLocation === "") && regNum) {
      const lookedUpLocation = lookupRtoLocation(regNum);
      if (lookedUpLocation) {
        payload.rtoLocation = lookedUpLocation;
        payload.rto = lookedUpLocation;
      }
    }

    // Generate customer ID according to the system logic, blank should be blank
    let customerIdVal = "";
    if (payload.insuredName && payload.insuredName.trim() !== "" && payload.contactNumber && payload.contactNumber.trim() !== "") {
      customerIdVal = buildCustomerId(payload.insuredName, payload.contactNumber);
    }
    payload.customerId = customerIdVal;

    // Sanitize the raw payload (converts missing keys to empty strings)
    const data = sanitizeRecordPayload(payload);

    // Set exact entry date as requested: 29-04-2026 11:00 AM local time (+05:30)
    const recordDate = new Date("2026-04-29T11:00:00+05:30");

    const policyRecordPayload = {
      id: randomUUID(),
      savedAt: recordDate,
      createdAt: recordDate,
      updatedAt: recordDate,
      data: data,
      pdfFileName: "Last month abhi.xlsx",
      pdfMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sourceFile: "Last month abhi.xlsx",
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

    console.log(`[${i + 1}/${rawRows.length}] Saving Policy Record for "${data.insuredName}"`);
    await prisma.policyRecord.create({
      data: policyRecordPayload
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
