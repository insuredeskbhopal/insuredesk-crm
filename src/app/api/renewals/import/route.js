import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import renewalImportIdentity from "@/lib/renewals/import-identity.cjs";
import { normalizeRenewalInsuranceCompany } from "@/lib/renewals/companies";
import { normalizeCustomerName, resolvePolicyCustomerName } from "@/lib/renewals/customer-name";
import { buildCanonicalFields, sanitizeReviewedData } from "@/lib/records";
import * as XLSX from "xlsx";

const MANUAL_RENEWAL_IMPORT_METHOD = "renewal_excel_import";
const { excelDateToString, findRenewalImportMatch, mergeRenewalImportData } = renewalImportIdentity;

function buildCustomerId(name, mobile) {
  const namePart = String(name || "")
    .replace(/^(m\/s|mr|mrs|ms)\.?\s+/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase();
  const digits = String(mobile || "").replace(/\D/g, "");
  return `${namePart}${digits.slice(-4)}`;
}

function cleanNumericValue(val) {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number") return Number.isFinite(val) ? val : "";
  const cleaned = String(val).replace(/[^0-9.-]/g, "").trim();
  return cleaned;
}

const headerMap = {
  // General / Insured
  "insured name": "insuredName",
  "insured/proposer name": "insuredName",
  "insured / proposer name": "insuredName",
  "proposer name": "insuredName",
  "customer name": "insuredName",
  "client name": "insuredName",
  "holder name": "insuredName",
  name: "insuredName",

  // Policy details
  "policy number": "policyNumber",
  "policy no": "policyNumber",
  "policy no.": "policyNumber",
  "policy_no": "policyNumber",
  "policy#": "policyNumber",
  "policy #": "policyNumber",
  policyno: "policyNumber",
  "pol no": "policyNumber",
  "pol no.": "policyNumber",

  // Type / Product / Line of business
  "policy type": "policyType",
  "policy category": "policyCategory",
  category: "policyCategory",
  product: "policyType",
  "product name": "policyType",
  lob: "policyType",
  "line of business": "policyType",

  // Premium fields
  premium: "premium",
  "gross premium": "premium",
  "expiring policy premium": "premium",
  "total premium": "totalPremium",
  "net premium": "netPremium",
  "od premium": "odPremium",
  "premium including gst": "premiumIncludingGst",
  premiumincludinggst: "premiumIncludingGst",

  // Sum Insured / IDV
  "sum insured": "sumInsured",
  "expiring policy sum insured": "sumInsured",
  idv: "idv",

  // Dates
  "start date": "startDate",
  "policy start date": "startDate",
  "risk start date": "startDate",
  "inception date": "startDate",
  "expiry date": "expiryDate",
  "policy expiry date": "expiryDate",
  "end date": "expiryDate",
  "risk end date": "expiryDate",
  "renewal date": "expiryDate",
  expirydate: "expiryDate",
  duration: "duration",

  // Insurance company
  "insurance company": "insuranceCompany",
  "insurance company name": "insuranceCompany",
  insurancecompany: "insuranceCompany",
  company: "insuranceCompany",
  "company name": "insuranceCompany",
  insurer: "insuranceCompany",

  // Cover
  "cover type": "policyCoverType",
  "policy cover type": "policyCoverType",

  // Motor specific fields
  "vehicle number": "vehicleNumber",
  vehiclenumber: "vehicleNumber",
  "vehicle no": "vehicleNumber",
  "vehicle no.": "vehicleNumber",
  "registration number": "registrationNumber",
  registrationnumber: "registrationNumber",
  "registration no": "registrationNumber",
  "registration no.": "registrationNumber",
  "reg no": "registrationNumber",
  "reg no.": "registrationNumber",
  "reg. no.": "registrationNumber",
  "reg. no": "registrationNumber",

  "make / model": "makeModel",
  "make/model": "makeModel",
  "make model": "makeModel",
  make: "vehicleMake",
  model: "vehicleModel",
  variant: "variant",
  "manufacturing year": "manufacturingYear",
  "registration date": "registrationDate",
  "engine number": "engineNumber",
  "chassis number": "chassisNumber",
  "fuel type": "fuelType",
  "cubic capacity": "cubicCapacity",
  ncb: "ncb",
  "rto location": "rtoLocation",
  rto: "rtoLocation",

  // Contact / Remark / Workflow / Status
  "contact number": "contactNumber",
  "contact no": "contactNumber",
  "contact no.": "contactNumber",
  mob: "contactNumber",
  "mob no": "contactNumber",
  "mob no.": "contactNumber",
  mobile: "contactNumber",
  "mobile no": "contactNumber",
  "mobile no.": "contactNumber",
  "mobile number": "contactNumber",
  "moblie no": "contactNumber",
  moblie: "contactNumber",
  phone: "contactNumber",
  "phone number": "contactNumber",
  "phone no": "contactNumber",
  "phone no.": "contactNumber",
  "customer mobile": "contactNumber",
  "contact person": "contactPerson",
  contactperson: "contactPerson",
  "contact person name": "contactPerson",
  contactpersonname: "contactPerson",
  "contact name": "contactPerson",
  "person name": "contactPerson",
  "whatsapp group name": "whatsappGroupName",
  whatsapp: "contactNumber",
  remark: "remark",
  remarks: "remark",
  status: "status",
  "risk location": "riskLocation",
  "business description": "businessDescription",
  occupancy: "occupancy",
  quote: "quote",
  "quote amount": "quote",
  msg: "msg",
  message: "msg",
  "payment link": "paymentLink",
  paymentlink: "paymentLink",
  link: "paymentLink",
  call: "call",
  "call status": "call",
  "s.no": "sNo",
  sno: "sNo",
  "sr no": "sNo",
  "sr. no.": "sNo",
};

const KNOWN_PAYLOAD_FIELDS = new Set([
  "policyNumber", "insuredName", "contactNumber", "customerMobile",
  "insuranceCompany", "companyName", "policyType", "policyCategory",
  "startDate", "expiryDate", "registrationDate", "premium", "totalPremium",
  "netPremium", "odPremium", "sumInsured", "idv", "quote", "vehicleNumber",
  "registrationNumber", "makeModel", "vehicleMake", "vehicleModel", "variant",
  "manufacturingYear", "engineNumber", "chassisNumber", "fuelType", "cubicCapacity",
  "ncb", "rtoLocation", "remark", "status", "contactPerson", "whatsappGroupName",
  "riskLocation", "businessDescription", "occupancy", "paymentLink", "call", "sNo"
]);

/**
 * GET /api/renewals/import?template=true&format=xlsx|csv
 * Allows any authenticated user to download the official Excel or CSV template for renewal bulk imports.
 */
export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const url = request.url ? new URL(request.url) : null;
    const format = (url?.searchParams.get("format") || "xlsx").toLowerCase();
    const category = (url?.searchParams.get("category") || "all").toLowerCase().trim();
    const monthParam = url?.searchParams.get("month") || "";
    const targetMonthNum = parseInt(monthParam, 10);
    const hasSpecificMonth = Number.isInteger(targetMonthNum) && targetMonthNum >= 1 && targetMonthNum <= 12;
    const padMonth = hasSpecificMonth ? String(targetMonthNum).padStart(2, "0") : null;

    let sampleRows = [];
    let filenamePrefix = "renewal_import_template";

    if (category === "motor") {
      filenamePrefix = "renewal_import_template_motor";
      sampleRows = [
        {
          "Policy Number": "45140031250100007692",
          "Insured Name": "VIJAY KUMAR MISHRA CONST PVT LTD",
          "Contact Number": "9685717917",
          "Insurance Company": "The New India Assurance Company Limited",
          "Policy Type": "Commercial Vehicle",
          "Expiry Date": "2026-11-02",
          "Gross Premium": 45531,
          "Registration Number": "MP17HH4323",
          "Make / Model": "Tata Signa 2823",
          Quote: "",
          Remark: "Requested NCB confirmation",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "2311200045612345",
          "Insured Name": "AMITABH VARMA",
          "Contact Number": "9893011223",
          "Insurance Company": "ICICI Lombard General Insurance",
          "Policy Type": "Private Car",
          "Expiry Date": "2026-11-20",
          "Gross Premium": 14250,
          "Registration Number": "MP04CB1234",
          "Make / Model": "Hyundai Creta SX",
          Quote: "13800",
          Remark: "Comprehensive package with Zero Dep",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "OG-25-1901-1802-00001234",
          "Insured Name": "SURESH PATIDAR",
          "Contact Number": "9425123456",
          "Insurance Company": "Bajaj Allianz General Insurance",
          "Policy Type": "Two Wheeler",
          "Expiry Date": "2026-11-25",
          "Gross Premium": 1850,
          "Registration Number": "MP09AB5678",
          "Make / Model": "Honda Activa 6G",
          Quote: "",
          Remark: "Renewal notice sent on WhatsApp",
          Status: "ACTIVE",
        },
      ];
    } else if (category === "health") {
      filenamePrefix = "renewal_import_template_health";
      sampleRows = [
        {
          "Policy Number": "10003/28/25/123456",
          "Insured Name": "RAJESH SHARMA",
          "Contact Number": "9425098765",
          "Insurance Company": "Star Health and Allied Insurance",
          "Policy Type": "Family Health Optima",
          "Expiry Date": "2026-11-28",
          "Gross Premium": 24500,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "23500",
          Remark: "Sum Insured: 10 Lakhs (2A + 2C)",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "HDF-HLTH-2026-987123",
          "Insured Name": "SUNIL MEHTA",
          "Contact Number": "9826033445",
          "Insurance Company": "HDFC ERGO General Insurance",
          "Policy Type": "Optima Secure",
          "Expiry Date": "2026-12-05",
          "Gross Premium": 16800,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "",
          Remark: "Individual Cover 5 Lakhs",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "CARE-GRP-88990011",
          "Insured Name": "APEX TECH SOLUTIONS LLP",
          "Contact Number": "9981022334",
          "Insurance Company": "Care Health Insurance Limited",
          "Policy Type": "Group Health Policy",
          "Expiry Date": "2026-12-15",
          "Gross Premium": 145000,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "140000",
          Remark: "35 Employees Covered",
          Status: "ACTIVE",
        },
      ];
    } else if (category === "warehouse" || category === "fire") {
      filenamePrefix = "renewal_import_template_warehouse";
      sampleRows = [
        {
          "Policy Number": "OG-24-1234-1801-00005678",
          "Insured Name": "ANAND ELECTRONICS & TRADERS",
          "Contact Number": "9826012345",
          "Insurance Company": "Bajaj Allianz General Insurance",
          "Policy Type": "Warehouse Policy",
          "Expiry Date": "2026-11-15",
          "Gross Premium": 38250,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "36000",
          Remark: "Plot 12 Mandideep Ind Area - Stock & Building SI: 3 Cr",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "11040011240100009876",
          "Insured Name": "SHREE KRISHNA LOGISTICS GODOWN",
          "Contact Number": "9755011223",
          "Insurance Company": "The New India Assurance Company Limited",
          "Policy Type": "Standard Fire & Special Perils",
          "Expiry Date": "2026-11-30",
          "Gross Premium": 52400,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "",
          Remark: "Godown No 4, Transport Nagar SI: 5 Cr",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "TATA-BURG-2026-443322",
          "Insured Name": "MAHESH TEXTILES DEPOT",
          "Contact Number": "9424077889",
          "Insurance Company": "Tata AIG General Insurance Company Limited",
          "Policy Type": "Burglary & Housebreaking",
          "Expiry Date": "2026-12-10",
          "Gross Premium": 12500,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "11800",
          Remark: "First Loss Basis 25%",
          Status: "ACTIVE",
        },
      ];
    } else if (category === "nonmotor") {
      filenamePrefix = "renewal_import_template_nonmotor";
      sampleRows = [
        {
          "Policy Number": "MAR-2026-998877",
          "Insured Name": "CENTRAL EXPORTS CORP",
          "Contact Number": "9827011998",
          "Insurance Company": "United India Insurance Company Limited",
          "Policy Type": "Marine Cargo",
          "Expiry Date": "2026-11-22",
          "Gross Premium": 28600,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "",
          Remark: "Annual Open Marine Declaration",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "WC-2026-334455",
          "Insured Name": "BHARAT INFRASTRUCTURE BUILDERS",
          "Contact Number": "9179044556",
          "Insurance Company": "National Insurance Company Limited",
          "Policy Type": "Workmen Compensation",
          "Expiry Date": "2026-12-01",
          "Gross Premium": 42000,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "39500",
          Remark: "60 Construction Workers Covered",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "PL-2026-778899",
          "Insured Name": "ROYAL PALACE HOTEL & RESORTS",
          "Contact Number": "9893088776",
          "Insurance Company": "The Oriental Insurance Company Limited",
          "Policy Type": "Public Liability",
          "Expiry Date": "2026-12-20",
          "Gross Premium": 19500,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "",
          Remark: "AOA / AOY Ratio 1:1",
          Status: "ACTIVE",
        },
      ];
    } else {
      // Universal Master Template
      sampleRows = [
        {
          "Policy Number": "45140031250100007692",
          "Insured Name": "VIJAY KUMAR MISHRA CONST PVT LTD",
          "Contact Number": "9685717917",
          "Insurance Company": "The New India Assurance Company Limited",
          "Policy Type": "Commercial Vehicle",
          "Expiry Date": "2026-11-02",
          "Gross Premium": 45531,
          "Registration Number": "MP17HH4323",
          "Make / Model": "Tata Signa",
          Quote: "",
          Remark: "Requested revised quotation",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "OG-24-1234-1801-00005678",
          "Insured Name": "ANAND ELECTRONICS & TRADERS",
          "Contact Number": "9826012345",
          "Insurance Company": "Bajaj Allianz General Insurance",
          "Policy Type": "Standard Fire & Special Perils",
          "Expiry Date": "2026-11-15",
          "Gross Premium": 18250,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "17500",
          Remark: "Stock valuation submitted",
          Status: "ACTIVE",
        },
        {
          "Policy Number": "10003/28/25/123456",
          "Insured Name": "RAJESH SHARMA",
          "Contact Number": "9425098765",
          "Insurance Company": "ICICI Lombard General Insurance",
          "Policy Type": "Family Health Optima",
          "Expiry Date": "2026-11-28",
          "Gross Premium": 24500,
          "Registration Number": "",
          "Make / Model": "",
          Quote: "",
          Remark: "Customer will pay online via link",
          Status: "ACTIVE",
        },
      ];
    }

    if (padMonth) {
      sampleRows = sampleRows.map((r, i) => {
        const day = String(((i * 10 + 5) % 27) + 1).padStart(2, "0");
        return {
          ...r,
          "Expiry Date": `2026-${padMonth}-${day}`,
        };
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet["!cols"] = [
      { wch: 28 }, // Policy Number
      { wch: 34 }, // Insured Name
      { wch: 18 }, // Contact Number
      { wch: 38 }, // Insurance Company
      { wch: 28 }, // Policy Type
      { wch: 16 }, // Expiry Date (YYYY-MM-DD or DD/MM/YYYY)
      { wch: 16 }, // Gross Premium
      { wch: 22 }, // Registration Number
      { wch: 22 }, // Make / Model
      { wch: 14 }, // Quote
      { wch: 34 }, // Remark
      { wch: 12 }, // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Renewal Template");

    if (format === "csv") {
      const csvBuffer = XLSX.write(workbook, { type: "buffer", bookType: "csv" });
      return new Response(csvBuffer, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenamePrefix}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenamePrefix}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate renewal template:", error);
    return Response.json({ error: "Failed to generate renewal template" }, { status: 500 });
  }
}

/**
 * POST /api/renewals/import
 * Accessible to any authenticated user.
 * Imports renewal data (JSON records array from Spreadsheet Studio OR uploaded Excel/CSV file).
 * Isolates all records under extractionMethod: "renewal_excel_import" & manualRenewalSource: true
 * so they never pollute financial production reports or standard policy registers.
 */
export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let rawRows = [];
    let sourceFileName = "imported_renewals.xlsx";
    let targetMonth = null;

    if (contentType.includes("application/json")) {
      const jsonBody = await request.json();
      if (!Array.isArray(jsonBody?.records) || jsonBody.records.length === 0) {
        return Response.json({ error: "No renewal records provided in import payload." }, { status: 400 });
      }
      rawRows = jsonBody.records;
      sourceFileName = jsonBody.sourceFileName || "spreadsheet_studio_renewals.xlsx";
      targetMonth = jsonBody.targetMonth || null;
    } else {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || typeof file.arrayBuffer !== "function") {
        return Response.json({ error: "No Excel or CSV file was uploaded." }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
      sourceFileName = file.name || "imported_renewals.xlsx";

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        rawRows.push(...sheetRows);
      }
    }

    const organizationId = user.organizationId || null;
    const existingRecords = await prisma.policyRecord.findMany({
      where: {
        extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD,
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
      },
      select: {
        id: true,
        data: true,
        extractedData: true,
        reviewedData: true,
        detectedCompany: true,
        detectedPolicyType: true,
        selectedCompany: true,
        selectedPolicyType: true,
        customerPortfolioId: true,
        contactPersonName: true,
        contactPersonMobile: true,
        contactPersonEmail: true,
        renewalRecipientName: true,
        renewalRecipientMobile: true,
        renewalRecipientEmail: true,
      },
    });

    const portfolioCache = new Map();
    const resolvePortfolio = async (payload, policyId) => {
      const digits = String(payload.contactNumber || payload.customerMobile || "").replace(/\D/g, "");
      // Keep customer profiles clean: only create/link when a valid 10-digit mobile exists
      if (digits.length < 10) {
        return null;
      }
      const mobile = digits.slice(-10);
      if (portfolioCache.has(mobile)) return portfolioCache.get(mobile);

      let portfolio = await prisma.customerProfile.findFirst({
        where: {
          phone: { contains: mobile },
          deletedAt: null,
          ...(organizationId ? { organizationId } : {}),
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
            createdById: user.userId || user.id || null,
            updatedById: user.userId || user.id || null,
            sourcePolicyId: policyId,
          },
          select: { id: true },
        });
      }

      portfolioCache.set(mobile, portfolio.id);
      return portfolio.id;
    };

    let totalRows = 0;
    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let ambiguousCount = 0;
    let skippedEmptyCount = 0;

    for (const row of rawRows) {
      totalRows++;
      const payload = {};

      for (const [key, val] of Object.entries(row)) {
        if (key === "id") continue; // UI state key
        const cleanKey = key.trim().toLowerCase().replace(/[\s_]+/g, " ");
        const compactKey = cleanKey.replace(/\s+/g, "");
        const mappedKey = headerMap[cleanKey] || headerMap[compactKey] || (KNOWN_PAYLOAD_FIELDS.has(key) ? key : null);
        if (mappedKey) {
          let cleanVal = val;
          if (typeof val === "string") {
            cleanVal = val.trim();
          }

          if (["startDate", "expiryDate", "registrationDate"].includes(mappedKey)) {
            cleanVal = excelDateToString(val);
          }

          if (["premium", "totalPremium", "netPremium", "odPremium", "sumInsured", "idv", "quote"].includes(mappedKey)) {
            cleanVal = cleanNumericValue(cleanVal);
          }

          payload[mappedKey] = cleanVal;
        }
      }

      // Clean policy number (remove trailing colons or noise)
        if (payload.policyNumber && typeof payload.policyNumber === "string") {
          payload.policyNumber = payload.policyNumber.replace(/:+$/, "").trim();
        }

        // Clean mobile number
        if (payload.contactNumber) {
          const rawMob = String(payload.contactNumber).replace(/\D/g, "");
          if (rawMob.length >= 10) {
            payload.contactNumber = rawMob.slice(-10);
            payload.customerMobile = payload.contactNumber;
          }
        }

        // Isolation guarantees: this is a manual renewal workflow record
        payload.manualRenewalSource = true;
        delete payload.clientId;

        payload.premium = payload.premium || payload.totalPremium || payload.netPremium || "";
        payload.totalPremium = payload.totalPremium || payload.premium || "";
        payload.sumInsured = payload.sumInsured || payload.idv || "";
        payload.customerMobile = payload.customerMobile || payload.contactNumber || "";
        payload.contactNumber = payload.contactNumber || payload.customerMobile || "";
        payload.insuranceCompany = normalizeRenewalInsuranceCompany(
          payload.insuranceCompany || payload.companyName,
        );
        payload.companyName = payload.insuranceCompany;

        if (targetMonth) {
          payload.targetRenewalMonth = String(targetMonth);
          if (!payload.expiryDate) {
            const pad = String(targetMonth).padStart(2, "0");
            payload.expiryDate = `2026-${pad}-28`;
          }
        }

        const name = payload.insuredName || "";
        const policyNo = payload.policyNumber || "";
        const vehicleNo = payload.vehicleNumber || payload.registrationNumber || "";
        const product = payload.policyType || "";
        const insuranceCompany = payload.insuranceCompany || "";
        const mob = payload.contactNumber || "";
        const status = payload.status || "";

        // Row must have at least an insured name, a policy number, or a vehicle registration number
        if (!name && !policyNo && !vehicleNo) {
          skippedEmptyCount++;
          continue;
        }

        let customerId = "";
        if (name && mob) {
          customerId = buildCustomerId(name, mob);
        }
        payload.customerId = customerId;

        const match = findRenewalImportMatch(payload, existingRecords);
        if (match.status === "ambiguous") {
          ambiguousCount++;
          continue;
        }

        if (match.status === "matched") {
          const record = match.record;
          const contactName = normalizeCustomerName(record.contactPersonName) || resolvePolicyCustomerName(payload);
          const contactMobile = String(record.contactPersonMobile || payload.contactNumber || payload.customerMobile || "").trim();
          const contactEmail = String(record.contactPersonEmail || payload.email || payload.customerEmail || "").trim();
          const portfolioId = record.customerPortfolioId || await resolvePortfolio({ ...payload, contactNumber: contactMobile }, record.id);
          const dataMerge = mergeRenewalImportData(record.data || {}, payload);
          const reviewedMerge = mergeRenewalImportData(record.reviewedData || record.data || {}, payload);
          const extractedMerge = mergeRenewalImportData(record.extractedData || record.data || {}, payload);

          const updateData = {};
          if (portfolioId && record.customerPortfolioId !== portfolioId) {
            updateData.customerPortfolioId = portfolioId;
          }
          if (contactName && record.contactPersonName !== contactName) {
            updateData.contactPersonName = contactName;
          }
          if (contactMobile && record.contactPersonMobile !== contactMobile) {
            updateData.contactPersonMobile = contactMobile;
          }
          if (contactEmail && record.contactPersonEmail !== contactEmail) {
            updateData.contactPersonEmail = contactEmail;
          }
          if (contactName && record.renewalRecipientName !== contactName) {
            updateData.renewalRecipientName = contactName;
          }
          if (contactMobile && record.renewalRecipientMobile !== contactMobile) {
            updateData.renewalRecipientMobile = contactMobile;
          }
          if (contactEmail && record.renewalRecipientEmail !== contactEmail) {
            updateData.renewalRecipientEmail = contactEmail;
          }

          if (dataMerge.changedFields.length) updateData.data = dataMerge.data;
          if (reviewedMerge.changedFields.length) updateData.reviewedData = sanitizeReviewedData(reviewedMerge.data);
          if (extractedMerge.changedFields.length) updateData.extractedData = extractedMerge.data;

          const updatedCanonical = buildCanonicalFields(reviewedMerge.data || dataMerge.data || payload);
          Object.assign(updateData, updatedCanonical);

          if (insuranceCompany && record.detectedCompany !== insuranceCompany) {
            updateData.detectedCompany = insuranceCompany;
          }
          if (insuranceCompany && record.selectedCompany !== insuranceCompany) {
            updateData.selectedCompany = insuranceCompany;
          }
          if (product && record.detectedPolicyType !== product) {
            updateData.detectedPolicyType = product;
          }
          if (product && record.selectedPolicyType !== product) {
            updateData.selectedPolicyType = product;
          }

          if (status) {
            const statusLower = String(status).trim().toLowerCase();
            if (statusLower === "renewed") {
              updateData.renewalStatus = "RENEWED";
              updateData.isActivePolicy = false;
            } else if (statusLower === "lost") {
              updateData.renewalStatus = "LOST";
              updateData.isActivePolicy = false;
            } else if (statusLower === "active") {
              updateData.renewalStatus = "ACTIVE";
              updateData.isActivePolicy = true;
            }
          }

          if (!Object.keys(updateData).length) {
            unchangedCount++;
            continue;
          }

          updateData.updatedById = user.userId || user.id || null;
          await prisma.policyRecord.update({ where: { id: record.id }, data: updateData });
          Object.assign(record, updateData);
          updatedCount++;
          continue;
        }

        const sanitizedData = { ...payload, clientId: "", sourceFile: sourceFileName };

        const statusLower = String(status || "")
          .trim()
          .toLowerCase();
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
        const recordId = randomUUID();
        const portfolioId = await resolvePortfolio(sanitizedData, recordId);
        const contactName = resolvePolicyCustomerName(sanitizedData);
        const contactMobile = String(sanitizedData.contactNumber || sanitizedData.customerMobile || "").trim();
        const contactEmail = String(sanitizedData.email || sanitizedData.customerEmail || "").trim();

        const canonicalFields = buildCanonicalFields(sanitizedData);
        const safeReviewedData = sanitizeReviewedData(sanitizedData);

        await prisma.policyRecord.create({
          data: {
            id: recordId,
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
            reviewedData: safeReviewedData,
            extractionMethod: MANUAL_RENEWAL_IMPORT_METHOD,
            extractionQuality: {},
            extractionLog: {},
            schemaVersion: 1,
            organizationId,
            createdById: user.userId || user.id || null,
            updatedById: null,
            renewalStatus: renewalStatus,
            isActivePolicy: isActivePolicy,
            customerPortfolioId: portfolioId,
            contactPersonName: contactName || null,
            contactPersonMobile: contactMobile || null,
            contactPersonEmail: contactEmail || null,
            renewalRecipientName: contactName || null,
            renewalRecipientMobile: contactMobile || null,
            renewalRecipientEmail: contactEmail || null,
            ...canonicalFields,
          },
        });

        existingRecords.push({
          id: recordId,
          data: sanitizedData,
          extractedData: sanitizedData,
          reviewedData: sanitizedData,
          detectedCompany: sanitizedData.insuranceCompany || insuranceCompany,
          detectedPolicyType: sanitizedData.policyType || product,
          selectedCompany: sanitizedData.insuranceCompany || insuranceCompany,
          selectedPolicyType: sanitizedData.policyType || product,
        });
        insertedCount++;
      }

    // Record audit trail entry for accountability
    try {
      await prisma.auditLog.create({
        data: {
          action: "RENEWAL_DATA_IMPORTED",
          entityType: "RenewalImport",
          severity: "INFO",
          source: "USER_ACTION",
          userId: user.userId || user.id || null,
          organizationId,
          metadata: {
            sourceFileName,
            totalRows,
            insertedCount,
            updatedCount,
            unchangedCount,
            ambiguousCount,
            skippedEmptyCount,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Could not write renewal import audit log:", auditErr.message);
    }

    return Response.json({
      success: true,
      message: `Successfully processed ${totalRows} rows: ${insertedCount} new renewals imported, ${updatedCount} existing records updated, ${unchangedCount} unchanged.`,
      totalRows,
      insertedCount,
      updatedCount,
      unchangedCount,
      ambiguousCount,
      skippedDuplicateCount: unchangedCount,
      skippedEmptyCount,
      existingCount: existingRecords.length,
    });
  } catch (error) {
    console.error("Failed to import renewals Excel:", error);
    return Response.json({ error: "Failed to process and import the Excel file: " + (error.message || "") }, { status: 500 });
  }
}
