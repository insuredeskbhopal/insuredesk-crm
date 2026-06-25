import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { prisma } from "@/lib/db/prisma";
import { normalizeRecord } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/records/validation";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { UPLOAD_STATUS } from "@/lib/uploads/status";
import { formatReviewValidationError, getReviewValidation } from "@/app/lib/dashboard-helpers";
import insuranceCompanyMaster from "@/lib/master/insurance-companies.cjs";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const { saveCorrection } = require("../../../lib/policies/intelligence/trainingMemory.js");
const { normalizeInsuranceCompanyName } = insuranceCompanyMaster;

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";
    const company = searchParams.get("company") || "";
    const policyType = searchParams.get("policyType") || "";
    const assignedTo = searchParams.get("assignedTo") || "";
    const filterField = searchParams.get("filterField") || "";
    const filterValue = searchParams.get("filterValue") || "";
    const pdfFilter = searchParams.get("pdfFilter") || "all";
    const viewCategory = searchParams.get("viewCategory") || "all";

    // Fetch tenant-scoped and RBAC-authorized filter
    const tenantFilter = getTenantFilter(user, "read");

    const where = {
      ...tenantFilter,
      deletedAt: null,
    };
    const andFilters = [];

    if (q.trim()) {
      const searchTerms = q.trim().toLowerCase();
      const searchKeys = [
        "insuredName",
        "policyNumber",
        "contactNumber",
        "contactPerson",
        "whatsappGroupName",
        "groupName",
        "policyType",
        "vehicleNumber",
        "registrationNumber",
        "engineNumber",
        "chassisNumber",
        "makeModel",
        "rtoLocation",
        "district",
        "tehsil",
        "insuranceCompany",
      ];
      const searchOrs = [];
      for (const key of searchKeys) {
        searchOrs.push({ reviewedData: { path: [key], string_contains: searchTerms, mode: "insensitive" } });
        searchOrs.push({ data: { path: [key], string_contains: searchTerms, mode: "insensitive" } });
      }
      andFilters.push({ OR: searchOrs });
    }

    if (status) {
      andFilters.push({
        OR: [
          { reviewedData: { path: ["status"], equals: status, mode: "insensitive" } },
          { data: { path: ["status"], equals: status, mode: "insensitive" } },
        ],
      });
    }

    if (company) {
      andFilters.push({
        OR: [
          { selectedCompany: { equals: company, mode: "insensitive" } },
          { reviewedData: { path: ["insuranceCompany"], equals: company, mode: "insensitive" } },
          { data: { path: ["insuranceCompany"], equals: company, mode: "insensitive" } },
        ],
      });
    }

    if (policyType) {
      andFilters.push({
        OR: [
          { selectedPolicyType: { equals: policyType, mode: "insensitive" } },
          { reviewedData: { path: ["policyType"], equals: policyType, mode: "insensitive" } },
          { data: { path: ["policyType"], equals: policyType, mode: "insensitive" } },
        ],
      });
    }

    if (assignedTo) {
      andFilters.push({
        OR: [
          { createdBy: { name: { contains: assignedTo, mode: "insensitive" } } },
          { createdBy: { email: { contains: assignedTo, mode: "insensitive" } } },
        ],
      });
    }

    if (filterField && filterValue.trim()) {
      const val = filterValue.trim().toLowerCase();
      andFilters.push({
        OR: [
          { reviewedData: { path: [filterField], string_contains: val, mode: "insensitive" } },
          { data: { path: [filterField], string_contains: val, mode: "insensitive" } },
        ],
      });
    }

    if (pdfFilter === "with") {
      andFilters.push({
        OR: [{ pdfFileName: { not: null } }, { pdfBytes: { not: null } }],
      });
    } else if (pdfFilter === "missing") {
      andFilters.push({ pdfFileName: null, pdfBytes: null });
    }

    if (viewCategory !== "all" && viewCategory !== "duplicates") {
      const group = viewCategory.toLowerCase();
      const categoryTerms = {
        motor: [
          "motor",
          "vehicle",
          "car",
          "two wheeler",
          "bike",
          "scooter",
          "commercial vehicle",
          "taxi",
          "cab",
          "bus",
        ],
        health: ["health", "mediclaim", "hospital", "family floater"],
        fire: ["fire", "sfsp", "burglary", "msme", "warehouse", "stock", "property"],
        life: ["life assured", "life policy", "term life", "endowment"],
        home: ["home building", "home contents", "home policy"],
        cyber: ["cyber", "ransomware", "data breach"],
      };
      const terms = categoryTerms[group] || [];
      if (terms.length > 0) {
        andFilters.push({
          OR: terms.flatMap((term) => [
            { selectedPolicyType: { contains: term, mode: "insensitive" } },
            { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
            { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
          ]),
        });
      }
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const selectOptions = {
      id: true,
      savedAt: true,
      createdAt: true,
      data: true,
      reviewedData: true,
      extractedData: true,
      extractionMethod: true,
      extractionQuality: true,
      extractionLog: true,
      confidenceScore: true,
      pdfFileName: true,
      pdfMimeType: true,
      organizationId: true,
      createdById: true,
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      uploadedFile: {
        select: {
          createdAt: true,
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    };

    const [records, totalCount] = await Promise.all([
      prisma.policyRecord.findMany({
        where,
        orderBy: { savedAt: "desc" },
        select: selectOptions,
        skip,
        take: limit,
      }),
      prisma.policyRecord.count({ where }),
    ]);

    const normalized = records.map(normalizeRecord);

    return Response.json({
      records: normalized,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (error) {
    return Response.json(
      { error: getUserFacingErrorMessage(error, "Failed to retrieve policy records.") },
      { status: 500 },
    );
  }
}

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
    const actorId = user.userId || user.id;

    const payload = await request.json();

    // Find the uploaded file enforcing tenant scope boundary
    const uploadedFile = payload.uploadedFileId
      ? await prisma.uploadedFile.findFirst({
          where: {
            id: payload.uploadedFileId,
            ...getTenantFilter(user, "write"),
          },
          include: {
            createdBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })
      : null;

    if (payload.uploadedFileId && !uploadedFile) {
      return Response.json({ error: "Uploaded file was not found or access denied." }, { status: 404 });
    }

    const extractedData = standardizePolicyCompany(payload.extractedData || {});
    if (!Object.keys(extractedData).length) {
      return Response.json({ error: "No reviewed policy data was provided." }, { status: 400 });
    }
    const reviewedData = standardizePolicyCompany(payload.reviewedData || extractedData);
    const detectedCompany = normalizeInsuranceCompanyName(
      payload.detectedCompany ||
        uploadedFile?.detectedCompanyName ||
        extractedData.insuranceCompany ||
        extractedData.companyName,
      uploadedFile?.rawText || payload.rawText || "",
    );
    const selectedCompany = normalizeInsuranceCompanyName(
      payload.selectedCompany || reviewedData.insuranceCompany || detectedCompany,
      uploadedFile?.rawText || payload.rawText || "",
    );
    const legacyPayload = sanitizeRecordPayload(
      toLegacyPayload({
        ...reviewedData,
        sourceFile: payload.sourceFile || uploadedFile?.sourceFile,
        detectedCompany,
        detectedPolicyType: payload.detectedPolicyType,
        selectedCompany,
        selectedPolicyType: payload.selectedPolicyType,
      }),
    );
    const validation = getReviewValidation({
      sourceFile: payload.sourceFile || uploadedFile?.sourceFile || legacyPayload.sourceFile,
      extractedData: legacyPayload,
    });

    if (validation.contactErrors.length) {
      return Response.json({ error: validation.contactErrors.join(" ") }, { status: 400 });
    }

    if (!validation.valid) {
      return Response.json(
        {
          error: formatReviewValidationError(validation.missingRequired, validation.contactErrors),
          missingRequired: validation.missingRequired,
          schema: validation.resolvedSchema
            ? {
                groupId: validation.resolvedSchema.groupId,
                policyId: validation.resolvedSchema.policyId,
                policyName: validation.resolvedSchema.policyName,
              }
            : null,
        },
        { status: 422 },
      );
    }

    const record = await prisma.policyRecord.create({
      data: {
        id: randomUUID(),
        savedAt: new Date(),
        data: legacyPayload,
        pdfFileName: uploadedFile?.sourceFile || payload.sourceFile || legacyPayload.sourceFile,
        pdfMimeType: uploadedFile?.mimeType || "application/pdf",
        sourceFile: uploadedFile?.sourceFile || payload.sourceFile || legacyPayload.sourceFile,
        rawText: uploadedFile?.rawText || payload.rawText || "",
        detectedBankSource: payload.detectedBankSource || uploadedFile?.detectedBankSourceName || "",
        detectedCompany,
        detectedServiceCategory:
          payload.detectedServiceCategory || uploadedFile?.detectedServiceCategoryName || "",
        detectedPolicyType: payload.detectedPolicyType || uploadedFile?.detectedPolicyTypeName || "",
        selectedBankSource: payload.selectedBankSource || "",
        selectedCompany,
        selectedServiceCategory: payload.selectedServiceCategory || "",
        selectedPolicyType: payload.selectedPolicyType || "",
        confidenceScore: Number(payload.confidenceScore ?? uploadedFile?.confidenceScore ?? 0),
        extractedData,
        reviewedData,
        extractionMethod: payload.extractionMethod || uploadedFile?.extractionMethod || "",
        extractionQuality: payload.extractionQuality || uploadedFile?.extractionQuality || {},
        extractionLog: payload.extractionLog || uploadedFile?.extractionLog || {},
        schemaVersion: Number(payload.schemaVersion || uploadedFile?.schemaVersion || 1),
        uploadedFileId: uploadedFile?.id,
        policySchemaId: payload.policySchemaId || undefined,
        organizationId: user.organizationId,
        createdById: actorId,
      },
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await saveHumanCorrections({
      uploadedFile,
      reviewedData,
      userId: actorId,
      organizationId: user.organizationId,
    });

    if (uploadedFile) {
      await prisma.uploadedFile.update({
        where: { id: uploadedFile.id },
        data: { status: UPLOAD_STATUS.APPROVED },
      });

      // Audit log the status transition
      await logAudit({
        action: "FILE_STATUS_TRANSITION",
        entityType: "UploadedFile",
        entityId: uploadedFile.id,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: actorId,
        organizationId: user.organizationId,
        metadata: { oldStatus: uploadedFile.status, newStatus: UPLOAD_STATUS.APPROVED },
      });
    }

    // Audit log policy record creation
    await logAudit({
      action: "POLICY_RECORD_CREATE",
      entityType: "PolicyRecord",
      entityId: record.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { sourceFile: record.sourceFile },
    });

    return Response.json(
      normalizeRecord({
        ...record,
        createdBy: { name: user.name, email: user.email },
        uploadedFile: uploadedFile
          ? {
              ...uploadedFile,
              createdBy: uploadedFile.createdBy || { name: user.name, email: user.email },
            }
          : null,
      }),
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { error: getUserFacingErrorMessage(error, "Policy record could not be saved.") },
      { status: 400 },
    );
  }
}

async function saveHumanCorrections({ uploadedFile, reviewedData, userId, organizationId }) {
  if (!uploadedFile?.extractedData || !reviewedData) return;
  const originalData = uploadedFile.extractedData || {};
  const understanding = originalData.policyUnderstanding || {};
  const fieldConfidence = originalData.fieldConfidence || {};
  const keys = new Set([...Object.keys(originalData), ...Object.keys(reviewedData)]);

  for (const key of keys) {
    if (
      [
        "sourceText",
        "policyUnderstanding",
        "schemaExtraction",
        "fieldConfidence",
        "extractionQuality",
      ].includes(key)
    )
      continue;
    const originalValue = normalizeCompareValue(originalData[key]);
    const correctedValue = normalizeCompareValue(reviewedData[key]);
    if (!correctedValue || originalValue === correctedValue) continue;

    try {
      await saveCorrection({
        field: key,
        originalValue: originalData[key] ?? null,
        correctedValue: reviewedData[key] ?? null,
        layoutFingerprint: understanding.layout?.layoutHash || understanding.layoutVersion || "",
        company: understanding.company || originalData.insuranceCompany || "",
        policyType: understanding.policyType || originalData.policyType || "",
        aliases: [],
        sourceFieldLabel: fieldConfidence[key]?.sourceLabel || "",
        sourceText: fieldConfidence[key]?.sourceText || "",
        userId,
        organizationId,
      });
    } catch (error) {
      console.warn("Training memory save failed:", error);
    }
  }
}

function normalizeCompareValue(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function standardizePolicyCompany(data = {}) {
  if (!data || typeof data !== "object") return {};
  const standardCompany = normalizeInsuranceCompanyName(
    data.insuranceCompany ||
      data.companyName ||
      data.insurerName ||
      data.selectedCompany ||
      data.detectedCompany,
    data.sourceText || "",
  );
  if (!standardCompany) return data;
  return {
    ...data,
    insuranceCompany: standardCompany,
    companyName: standardCompany,
  };
}

function toLegacyPayload(data) {
  return {
    sourceFile: data.sourceFile,
    status: "saved",
    insuredName: data.insuredName,
    policyNumber: data.policyNumber,
    contactNumber: data.contactNumber || data.mobileNumber,
    contactPerson: data.contactPerson,
    whatsappGroupName: data.whatsappGroupName,
    groupName: data.groupName,
    sourceDocumentType: data.sourceDocumentType,
    productName: data.productName,
    mailingAddress: data.mailingAddress,
    premisesAddress: data.premisesAddress || data.riskLocation,
    businessDescription: data.businessDescription,
    issuedAt: data.issuedAt,
    policyType: data.selectedPolicyType || data.detectedPolicyType || data.policyType,
    premium: data.premium,
    premiumIncludingGst: data.premiumIncludingGst || data.totalPremium || data.premium,
    totalPremium: data.totalPremium || data.premium,
    netPremium: data.netPremium,
    gstAmount: data.gstAmount,
    cgst: data.cgst,
    sgst: data.sgst,
    igst: data.igst,
    invoiceNumber: data.invoiceNumber,
    invoiceDate: data.invoiceDate,
    gstin: data.gstin,
    placeOfSupply: data.placeOfSupply,
    hypothecationDetails: data.hypothecationDetails,
    bankChargeType: data.bankChargeType,
    brokerCode: data.brokerCode,
    brokerName: data.brokerName,
    brokerMobile: data.brokerMobile,
    brokerEmail: data.brokerEmail,
    contentsSumInsured: data.contentsSumInsured,
    burglarySumInsured: data.burglarySumInsured,
    fidelitySumInsured: data.fidelitySumInsured,
    coverages: data.coverages,
    clauses: data.clauses,
    specialConditions: data.specialConditions,
    extractionConfidence: data.extractionConfidence,
    needsManualReview: data.needsManualReview,
    tpDriverOwner: data.tpDriverOwner,
    odPremium: data.odPremium,
    dueCollection: data.dueCollection,
    collectedAmount: data.collectedAmount,
    modeOfPayment: data.modeOfPayment,
    remark: data.remark,
    sumInsured: data.sumInsured || data.idv,
    startDate: data.policyStartDate || data.startDate,
    expiryDate: data.policyEndDate || data.expiryDate,
    duration: data.duration,
    riskLocation: data.riskLocation || data.propertyAddress,
    district: data.district,
    tehsil: data.tehsil,
    insuranceCompany:
      data.insuranceCompany ||
      data.selectedCompany ||
      data.detectedCompany ||
      data.insurerName ||
      data.companyName,
    description: data.description || data.occupancy,
    pptMpwlc: data.pptMpwlc,
    occupancy: data.occupancy,
    validIn: data.validIn,
    vehicleNumber: data.vehicleNumber,
    registrationNumber: data.registrationNumber,
    makeModel: data.makeModel,
    variant: data.variant,
    manufacturingYear: data.manufacturingYear,
    registrationDate: data.registrationDate,
    engineNumber: data.engineNumber,
    chassisNumber: data.chassisNumber,
    fuelType: data.fuelType,
    cubicCapacity: data.cubicCapacity,
    seatingCapacity: data.seatingCapacity,
    grossVehicleWeight: data.grossVehicleWeight,
    idv: data.idv || (hasMotorPayloadSignals(data) ? data.sumInsured : ""),
    ncb: data.ncb,
    policyCoverType: data.policyCoverType,
    rtoLocation: data.rtoLocation,
    nomineeName: data.nomineeName,
    financerName: data.financerName,
  };
}

function hasMotorPayloadSignals(data) {
  return Boolean(
    data.vehicleNumber ||
    data.registrationNumber ||
    data.engineNumber ||
    data.chassisNumber ||
    data.makeModel ||
    data.cubicCapacity ||
    data.seatingCapacity ||
    /\b(motor|private\s+car|two\s+wheeler|commercial\s+vehicle)\b/i.test(data.policyType || ""),
  );
}
