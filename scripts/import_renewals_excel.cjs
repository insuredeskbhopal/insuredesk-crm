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

const headerMap = {
  // General/Policy Fields
  "insured name": "insuredName",
  "insured/proposer name": "insuredName",
  "name": "insuredName",

  "policy number": "policyNumber",
  "policyno": "policyNumber",

  "policy type": "policyType",
  "product": "policyType",
  "lob": "policyType",

  "premium": "premium",
  "expiring policy premium": "premium",
  "total premium": "totalPremium",
  "net premium": "netPremium",
  "od premium": "odPremium",
  "premium including gst": "premiumIncludingGst",
  "premiumincludinggst": "premiumIncludingGst",

  "sum insured": "sumInsured",
  "expiring policy sum insured": "sumInsured",

  "start date": "startDate",
  "expiry date": "expiryDate",
  "end date": "expiryDate",
  "expirydate": "expiryDate",

  "duration": "duration",

  "insurance company": "insuranceCompany",
  "insurancecompany": "insuranceCompany",

  "cover type": "policyCoverType",
  "policy cover type": "policyCoverType",

  // Motor Fields
  "vehicle number": "vehicleNumber",
  "vehiclenumber": "vehicleNumber",
  "registration number": "registrationNumber",
  "registrationnumber": "registrationNumber",

  "make / model": "makeModel",
  "make": "vehicleMake",
  "model": "vehicleModel",
  "variant": "variant",
  "manufacturing year": "manufacturingYear",
  "registration date": "registrationDate",
  "engine number": "engineNumber",
  "chassis number": "chassisNumber",
  "fuel type": "fuelType",
  "cubic capacity": "cubicCapacity",
  "idv": "idv",
  "ncb": "ncb",
  "rto location": "rtoLocation",

  // Contact / Remark / Status / Non-Motor specific
  "contact number": "contactNumber",
  "mob": "contactNumber",
  "mob no": "contactNumber",
  "mobile": "contactNumber",
  "contact person": "contactPerson",
  "whatsapp group name": "whatsappGroupName",
  "remark": "remark",
  "status": "status",
  "risk location": "riskLocation",
  "business description": "businessDescription",
  "occupancy": "occupancy",
  "quote": "quote",
  "msg": "msg",
  "message": "msg",
  "whatsapp": "msg",
  "payment link": "paymentLink",
  "paymentlink": "paymentLink",
  "link": "paymentLink",
  "call": "call",
  "call status": "call",
};

async function main() {
  console.log("Loading Excel workbook...");
  const workbook = XLSX.readFile(excelPath);
  const sourceFileName = path.basename(excelPath);

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

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Parse rows as raw JSON objects
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    console.log(`Loaded ${rawRows.length} raw rows from sheet "${sheetName}".`);

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const payload = {};

      // Map each cell in the row using the dynamic headerMap
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

      // Set source file and manual flag
      payload.sourceFile = sourceFileName;
      payload.manualRenewalSource = true;

      // Standardize key fallbacks
      payload.premium = payload.premium || payload.totalPremium || payload.netPremium || "";
      payload.totalPremium = payload.totalPremium || payload.premium || "";
      payload.sumInsured = payload.sumInsured || payload.idv || "";
      payload.customerMobile = payload.customerMobile || payload.contactNumber || "";
      payload.contactNumber = payload.contactNumber || payload.customerMobile || "";
      payload.companyName = payload.companyName || payload.insuranceCompany || "";
      payload.insuranceCompany = payload.insuranceCompany || payload.companyName || "";

      const name = payload.insuredName || "";
      const policyNo = payload.policyNumber || "";
      const product = payload.policyType || "";
      const insuranceCompany = payload.insuranceCompany || "";
      const expiryDate = payload.expiryDate || "";
      const mob = payload.contactNumber || "";
      const status = payload.status || "";

      if (!name && !policyNo) {
        console.log(`[${sheetName}] [${i + 1}/${rawRows.length}] Skipping empty row`);
        continue;
      }

      // Build customer ID
      let customerId = "";
      if (name && mob) {
        customerId = buildCustomerId(name, mob);
      }
      payload.customerId = customerId;

      const sanitizedData = payload;

      // Map status column to DB properties
      const statusLower = String(status || "").trim().toLowerCase();
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
        detectedCompany: sanitizedData.insuranceCompany || insuranceCompany,
        detectedServiceCategory: "",
        detectedPolicyType: sanitizedData.policyType || product,
        selectedBankSource: "",
        selectedCompany: sanitizedData.insuranceCompany || insuranceCompany,
        selectedServiceCategory: "",
        selectedPolicyType: sanitizedData.policyType || product,
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
        `[${sheetName}] [${i + 1}/${rawRows.length}] Saving Policy Record for "${sanitizedData.insuredName}" (Status: ${renewalStatus})`,
      );
      await prisma.policyRecord.create({
        data: policyRecordPayload,
      });
      insertedCount++;
    }
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
