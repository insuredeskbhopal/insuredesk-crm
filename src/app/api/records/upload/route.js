import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { normalizeRecord, parseCanonicalNumber, parseCanonicalDate } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/records/validation";
import {
  MAX_UPLOAD_BYTES,
  UploadValidationError,
  validatePdfFile,
  validateUploadList,
} from "@/lib/uploads/validation";
import { extractTextFromPdf } from "@/lib/policies/pdf/text";
import { extractPolicyDataFromTextResult } from "@/lib/policies/extraction-pipeline";
import { verifyJWT } from "@/lib/auth";
import { formatReviewValidationError, getReviewValidation } from "@/app/lib/dashboard-helpers";
import { getUploadFailureMessage, persistFailedUploadedFile } from "@/lib/uploads/failure";
import { UPLOAD_STATUS } from "@/lib/uploads/status";
import { uploadFile } from "@/lib/storage";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { buildPolicyCustomerNameFields } from "@/lib/renewals/customer-name";
import { sendPolicyUploadWelcomeMessage } from "@/lib/policies/welcome-message";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const files = formData.getAll("files").filter((file) => file && typeof file.arrayBuffer === "function");
    validateUploadList(files);

    const created = [];
    const failed = [];

    for (const file of files) {
      let buffer = null;
      let storageResult = null;

      try {
        buffer = await validatePdfFile(file);
        storageResult = await uploadFile(buffer, file.type || "application/pdf", file.name || "Untitled.pdf");

        const textResult = await extractTextFromPdf(buffer);
        const rawText = textResult.rawText;
        if (!rawText) {
          throw new Error(
            textResult.ocrAttempted
              ? "No text could be extracted."
              : "PDF text extraction returned no content.",
          );
        }

        const extraction = await extractPolicyDataFromTextResult({
          textResult,
          sourceFile: file.name || "",
        });
        const data = { ...sanitizeRecordPayload(extraction.data), clientId: "" };
        const validation = getReviewValidation({
          sourceFile: file.name || data.sourceFile,
          extractedData: data,
        });

        if (!validation.valid) {
          throw new Error(formatReviewValidationError(validation.missingRequired));
        }

        const incomingPolicyNumber = (data.policyNumber || data["Policy No."] || "").trim();
        if (incomingPolicyNumber) {
          const existingRecord = await prisma.policyRecord.findFirst({
            where: {
              deletedAt: null,
              organizationId: user.organizationId,
              OR: [
                { reviewedData: { path: ["policyNumber"], equals: incomingPolicyNumber } },
                { data: { path: ["policyNumber"], equals: incomingPolicyNumber } },
                { data: { path: ["Policy No."], equals: incomingPolicyNumber } },
              ],
            },
            select: { id: true, sourceFile: true, pdfFileName: true },
          });

          if (existingRecord) {
            throw new Error(
              `Policy number "${incomingPolicyNumber}" already exists in the system (File: "${existingRecord.pdfFileName || existingRecord.sourceFile || "existing record"}"). Duplicate upload skipped.`,
            );
          }
        }

        const customerNameFields = buildPolicyCustomerNameFields(data);
        const uploadedFile = await prisma.uploadedFile.create({
          data: {
            id: randomUUID(),
            sourceFile: file.name || data.sourceFile || "Untitled.pdf",
            mimeType: file.type || "application/pdf",
            sizeBytes: buffer.byteLength,
            rawText,
            extractionMethod: data.extractionMethod || textResult.extractionMethod || "pdf_text",
            status: UPLOAD_STATUS.APPROVED,
            detectedCompanyName: data.insuranceCompany || "",
            detectedServiceCategoryName: data.documentCategory || "",
            detectedPolicyTypeName: data.policyType || "",
            extractedData: data,
            extractionQuality: data.extractionQuality || {},
            extractionLog: textResult.extractionLog || {},
            schemaVersion: data.schemaExtraction?.schemaVersion || null,
            organizationId: user.organizationId,
            createdById: user.userId || user.id,
            storageProvider: storageResult.storageProvider,
            storagePath: storageResult.storagePath,
            fileHash: storageResult.fileHash,
            fileSize: storageResult.fileSize,
            storageMetadata: storageResult.storageMetadata || {},
          },
        });

        const compactReviewedData = { ...data };
        delete compactReviewedData.sourceText;
        delete compactReviewedData.policyUnderstanding;
        delete compactReviewedData.fieldConfidence;
        delete compactReviewedData.extractionLog;
        delete compactReviewedData.extractionQuality;

        const record = await prisma.policyRecord.create({
          data: {
            id: randomUUID(),
            savedAt: new Date(),
            data,
            pdfFileName: file.name || data.sourceFile || "Untitled.pdf",
            pdfMimeType: file.type || "application/pdf",
            sourceFile: file.name || data.sourceFile || "Untitled.pdf",
            rawText,
            detectedCompany: data.insuranceCompany || "",
            detectedServiceCategory: data.documentCategory || "",
            detectedPolicyType: data.policyType || "",
            selectedCompany: data.insuranceCompany || "",
            selectedServiceCategory: data.documentCategory || "",
            selectedPolicyType: data.policyType || "",
            confidenceScore: Number(data.confidenceScore || 0),
            extractedData: data,
            reviewedData: compactReviewedData,
            extractionMethod: data.extractionMethod || textResult.extractionMethod || "",
            extractionQuality: data.extractionQuality || {},
            extractionLog: textResult.extractionLog || {},
            schemaVersion: Number(data.schemaExtraction?.schemaVersion || 1),
            uploadedFileId: uploadedFile.id,
            organizationId: user.organizationId,
            createdById: user.userId || user.id,
            // Canonical Operational Fields
            policyNumber: data.policyNumber ? String(data.policyNumber).trim() : null,
            normalizedPolicyNumber: data.policyNumber ? String(data.policyNumber).trim().toLowerCase() : null,
            insuredName: data.insuredName || data.customerName || null,
            grossPremium: parseCanonicalNumber(data.grossPremium || data.totalPremium || data.premium),
            netPremium: parseCanonicalNumber(data.netPremium || data.basicPremium),
            totalPremium: parseCanonicalNumber(data.totalPremium || data.grossPremium || data.premium),
            policyStartDate: parseCanonicalDate(data.startDate || data.policyStartDate),
            policyExpiryDate: parseCanonicalDate(data.expiryDate || data.policyEndDate),
            vehicleRegistrationNumber: String(data.vehicleNumber || data.registrationNumber || "").trim() || null,
            makeModel: String(data.makeModel || data.vehicleMake || "").trim() || null,
            policyCategory: String(data.policyCategory || data.documentCategory || "").trim() || null,
            ...customerNameFields,
          },
        });

        // Trigger 1-time WhatsApp welcome message with clean PDF link to contact person
        sendPolicyUploadWelcomeMessage({
      initiatedByUserId: user.userId || user.id,
          recordId: record.id,
          data,
        }).catch((msgErr) => {
          console.warn("Background welcome message dispatch notice:", msgErr?.message || msgErr);
        });

        created.push(
          normalizeRecord({
            ...record,
            createdBy: { name: user.name, email: user.email },
          }),
        );
      } catch (error) {
        const failedUpload = await persistFailedUploadedFile({
          file,
          error,
          user,
          actorId: user.userId || user.id,
          buffer,
          storageResult,
        });
        const errorMessage = failedUpload?.errorMessage || getUploadFailureMessage(error);

        console.error(`PDF extraction failed for ${file.name}:`, error);
        failed.push({
          id: failedUpload?.id || randomUUID(),
          sourceFile: file.name || "Untitled.pdf",
          status: UPLOAD_STATUS.FAILED,
          error: errorMessage,
          errorMessage,
        });
      }
    }

    if (!created.length) {
      return Response.json(
        {
          records: [],
          failed,
          summary: {
            total: files.length,
            saved: 0,
            failed: failed.length,
          },
        },
        { status: 422 },
      );
    }

    return Response.json(
      {
        records: created,
        failed,
        summary: {
          total: files.length,
          saved: created.length,
          failed: failed.length,
        },
      },
      { status: failed.length ? 207 : 201 },
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return Response.json(
        {
          error: getUserFacingErrorMessage(error, "Upload could not be completed. Please check the file and try again."),
          limitBytes: MAX_UPLOAD_BYTES,
        },
        { status: error.status },
      );
    }

    console.error("PDF upload extraction failed:", error);
    return Response.json(
      { error: getUserFacingErrorMessage(error, "Upload could not be completed. Please try again.") },
      { status: 500 },
    );
  }
}
