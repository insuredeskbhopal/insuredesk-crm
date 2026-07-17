import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import renewalImportIdentity from "@/lib/renewals/import-identity.cjs";
import * as XLSX from "xlsx";

const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";
const { buildRenewalImportKey, excelDateToString } = renewalImportIdentity;

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

  // Contact / Remark / Status / Non-Motor
  "contact number": "contactNumber",
  "mob": "contactNumber",
  "mob no": "contactNumber",
  "mobile": "contactNumber",
  "contact person": "contactPerson",
  "contactperson": "contactPerson",
  "contact person name": "contactPerson",
  "contactpersonname": "contactPerson",
  "contact name": "contactPerson",
  "person name": "contactPerson",
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

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user || user.role === "VIEWER") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "No Excel file was uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sourceFileName = file.name || "imported_renewals.xlsx";

    const organizationId = user.organizationId || null;
    const existingRecords = await prisma.policyRecord.findMany({
      where: {
        extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD,
        organizationId,
        deletedAt: null,
      },
      select: { data: true, reviewedData: true },
    });
    const renewalKeys = new Set(
      existingRecords.map((record) => buildRenewalImportKey(record.reviewedData || record.data || {})),
    );

    let insertedCount = 0;
    let skippedDuplicateCount = 0;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      for (const row of rawRows) {
        const payload = {};

        for (const [key, val] of Object.entries(row)) {
          const cleanKey = key.trim().toLowerCase();
          const mappedKey = headerMap[cleanKey];
          if (mappedKey) {
            let cleanVal = val;
            if (typeof val === "string") {
              cleanVal = val.trim();
            }

            if (["startDate", "expiryDate", "registrationDate"].includes(mappedKey)) {
              cleanVal = excelDateToString(val);
            }

            payload[mappedKey] = cleanVal;
          }
        }

        payload.sourceFile = sourceFileName;
        payload.manualRenewalSource = true;

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
        const mob = payload.contactNumber || "";
        const status = payload.status || "";

        if (!name && !policyNo) {
          continue;
        }

        const renewalKey = buildRenewalImportKey(payload);
        if (renewalKeys.has(renewalKey)) {
          skippedDuplicateCount++;
          continue;
        }

        let customerId = "";
        if (name && mob) {
          customerId = buildCustomerId(name, mob);
        }
        payload.customerId = customerId;

        const sanitizedData = payload;

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

        await prisma.policyRecord.create({
          data: {
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
            createdById: user.userId || user.id || null,
            updatedById: null,
            renewalStatus: renewalStatus,
            isActivePolicy: isActivePolicy,
          },
        });
        renewalKeys.add(renewalKey);
        insertedCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Imported ${insertedCount} new renewal policies and kept all existing renewal data.`,
      insertedCount,
      skippedDuplicateCount,
      existingCount: existingRecords.length,
    });
  } catch (error) {
    console.error("Failed to import renewals Excel:", error);
    return Response.json({ error: "Failed to process and import the Excel file." }, { status: 500 });
  }
}
