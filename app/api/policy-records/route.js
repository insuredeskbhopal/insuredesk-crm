import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/record-validation";

export const runtime = "nodejs";

export async function GET() {
  const records = await prisma.policyRecord.findMany({
    orderBy: { savedAt: "desc" },
    select: {
      id: true,
      savedAt: true,
      data: true,
      reviewedData: true,
      extractedData: true,
      extractionMethod: true,
      extractionQuality: true,
      extractionLog: true,
      confidenceScore: true,
      pdfFileName: true,
      pdfMimeType: true
    }
  });

  return Response.json(records.map(normalizeRecord));
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const uploadedFile = payload.uploadedFileId
      ? await prisma.uploadedFile.findUnique({ where: { id: payload.uploadedFileId } })
      : null;

    if (payload.uploadedFileId && !uploadedFile) {
      return Response.json({ error: "Uploaded file was not found. Re-upload the PDF before saving." }, { status: 404 });
    }

    const extractedData = payload.extractedData || {};
    if (!Object.keys(extractedData).length) {
      return Response.json({ error: "No reviewed policy data was provided." }, { status: 400 });
    }
    const reviewedData = payload.reviewedData || extractedData;
    const legacyPayload = sanitizeRecordPayload(toLegacyPayload({
      ...reviewedData,
      sourceFile: payload.sourceFile || uploadedFile?.sourceFile,
      detectedCompany: payload.detectedCompany,
      detectedPolicyType: payload.detectedPolicyType,
      selectedCompany: payload.selectedCompany,
      selectedPolicyType: payload.selectedPolicyType
    }));

    const record = await prisma.policyRecord.create({
      data: {
        id: randomUUID(),
        savedAt: new Date(),
        data: legacyPayload,
        pdfFileName: uploadedFile?.sourceFile || payload.sourceFile || legacyPayload.sourceFile,
        pdfMimeType: uploadedFile?.mimeType || "application/pdf",
        pdfBytes: uploadedFile?.pdfBytes || undefined,
        sourceFile: uploadedFile?.sourceFile || payload.sourceFile || legacyPayload.sourceFile,
        rawText: uploadedFile?.rawText || payload.rawText || "",
        detectedBankSource: payload.detectedBankSource || uploadedFile?.detectedBankSourceName || "",
        detectedCompany: payload.detectedCompany || uploadedFile?.detectedCompanyName || "",
        detectedServiceCategory: payload.detectedServiceCategory || uploadedFile?.detectedServiceCategoryName || "",
        detectedPolicyType: payload.detectedPolicyType || uploadedFile?.detectedPolicyTypeName || "",
        selectedBankSource: payload.selectedBankSource || "",
        selectedCompany: payload.selectedCompany || "",
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
        policySchemaId: payload.policySchemaId || undefined
      }
    });

    if (uploadedFile) {
      await prisma.uploadedFile.update({
        where: { id: uploadedFile.id },
        data: { status: "saved" }
      });
    }

    return Response.json(normalizeRecord(record), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Policy record could not be saved." }, { status: 400 });
  }
}

function toLegacyPayload(data) {
  return {
    sourceFile: data.sourceFile,
    status: "saved",
    insuredName: data.insuredName,
    policyNumber: data.policyNumber,
    contactNumber: data.contactNumber || data.mobileNumber,
    contactPerson: data.contactPerson,
    groupName: data.groupName,
    policyType: data.selectedPolicyType || data.detectedPolicyType || data.policyType,
    premium: data.premium,
    sumInsured: data.sumInsured || data.idv,
    startDate: data.policyStartDate || data.startDate,
    expiryDate: data.policyEndDate || data.expiryDate,
    duration: data.duration,
    riskLocation: data.riskLocation || data.propertyAddress,
    district: data.district,
    tehsil: data.tehsil,
    insuranceCompany: data.selectedCompany || data.detectedCompany || data.insurerName,
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
    idv: data.idv || data.sumInsured,
    ncb: data.ncb,
    policyCoverType: data.policyCoverType,
    rtoLocation: data.rtoLocation,
    nomineeName: data.nomineeName,
    financerName: data.financerName
  };
}
