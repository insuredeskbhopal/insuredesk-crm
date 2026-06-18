import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { extractTextFromPdf } from "@/lib/policies/pdf/text";
import { extractPolicyDataFromTextResult } from "@/lib/policies/extraction-pipeline";
import { sanitizeRecordPayload } from "@/lib/records/validation";
import {
  MAX_UPLOAD_BYTES,
  UploadValidationError,
  validatePdfFile,
  validateUploadList,
} from "@/lib/uploads/validation";
import { verifyJWT } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";
import { getUploadFailureMessage, persistFailedUploadedFile } from "@/lib/uploads/failure";
import { buildUploadDetection } from "@/lib/uploads/detection";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    // Authenticate user session
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user || user.role === "VIEWER") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    const actorId = user.userId || user.id;

    const formData = await request.formData();
    const files = formData.getAll("files").filter((file) => file && typeof file.arrayBuffer === "function");
    validateUploadList(files);

    const uploaded = [];
    const failed = [];
    const { ipAddress, userAgent } = getAuditMetadata(request);

    for (const file of files) {
      let buffer = null;
      let storageResult = null;
      let rawText = "";
      let extractionMethod = "failed";
      let extractionLog = null;

      try {
        buffer = await validatePdfFile(file);

        // 1. Upload to storage layer (Local/S3) and get metadata
        storageResult = await uploadFile(buffer, file.type || "application/pdf", file.name || "Untitled.pdf");

        // 2. Perform PDF text extraction
        const textResult = await extractTextFromPdf(buffer);
        rawText = textResult.rawText;
        extractionMethod = textResult.extractionMethod || extractionMethod;
        extractionLog = textResult.extractionLog || null;

        if (!rawText) {
          throw new Error(
            textResult.ocrAttempted
              ? "No text could be extracted from this PDF using text extraction or OCR."
              : "PDF text extraction returned no content.",
          );
        }

        const extraction = await extractPolicyDataFromTextResult({
          textResult,
          sourceFile: file.name || "",
        });
        const extractedData = sanitizeRecordPayload(extraction.data);
        const detection = buildUploadDetection(extractedData);

        // 3. Save UploadedFile record to database, referencing storage path and excluding binary bytes
        const uploadedFile = await prisma.uploadedFile.create({
          data: {
            id: randomUUID(),
            sourceFile: file.name || "Untitled.pdf",
            mimeType: file.type || "application/pdf",
            sizeBytes: buffer.byteLength,
            rawText,
            extractionMethod: extractedData.extractionMethod || extractionMethod,
            status: UPLOAD_STATUS.REVIEW_REQUIRED,
            detectedBankSourceName: detection.bankSource?.name || "",
            detectedCompanyName: extractedData.insuranceCompany || "",
            detectedServiceCategoryName: extractedData.documentCategory || "",
            detectedPolicyTypeName: extractedData.policyType || "",
            confidenceScore: detection.confidenceScore,
            extractedData,
            extractionQuality: extractedData.extractionQuality || {},
            extractionLog: {
              ...extractionLog,
              policyUnderstanding: extractedData.policyUnderstanding || null,
              schemaExtraction: extractedData.schemaExtraction || null,
            },
            schemaFallbackLevel: null,
            schemaVersion: extractedData.schemaExtraction?.schemaVersion || null,

            // SaaS scoping and tracking
            organizationId: user.organizationId,
            createdById: actorId,

            // Storage references
            storageProvider: storageResult.storageProvider,
            storagePath: storageResult.storagePath,
            fileHash: storageResult.fileHash,
            fileSize: storageResult.fileSize,
            storageMetadata: storageResult.storageMetadata || {},
          },
        });

        // 4. Audit successful file upload
        try {
          await logAudit({
            action: "FILE_UPLOAD",
            entityType: "UploadedFile",
            entityId: uploadedFile.id,
            severity: "INFO",
            source: "API",
            ipAddress,
            userAgent,
            userId: actorId,
            organizationId: user.organizationId,
            metadata: {
              filename: file.name,
              fileHash: storageResult.fileHash,
              fileSize: storageResult.fileSize,
            },
          });
        } catch (auditError) {
          console.warn("Upload audit log failed:", auditError);
        }

        uploaded.push({
          id: uploadedFile.id,
          sourceFile: uploadedFile.sourceFile,
          status: normalizeUploadStatus(uploadedFile.status),
          rawText,
          detection,
          selected: {
            bankSourceName: detection.bankSource?.name || "",
            companyName: detection.company?.name || "",
            serviceCategoryName: detection.serviceCategory?.name || "",
            policyTypeName: detection.policyType?.name || "",
          },
          extractedData,
          extractionMethod: extractedData.extractionMethod || extractionMethod,
          extractionLog: {
            ...extractionLog,
            policyUnderstanding: extractedData.policyUnderstanding || null,
            schemaExtraction: extractedData.schemaExtraction || null,
          },
          storageProvider: uploadedFile.storageProvider,
          storagePath: uploadedFile.storagePath,
          storageMetadata: uploadedFile.storageMetadata || null,
        });
      } catch (error) {
        const failedUpload = await persistFailedUploadedFile({
          file,
          error,
          user,
          actorId,
          buffer,
          storageResult,
          rawText,
          extractionMethod,
          extractionLog,
        });
        const errorMessage = failedUpload?.errorMessage || getUploadFailureMessage(error);

        // Audit failed upload attempt
        try {
          await logAudit({
            action: "FILE_UPLOAD_FAILED",
            entityType: "UploadedFile",
            entityId: failedUpload?.id,
            severity: "WARNING",
            source: "API",
            ipAddress,
            userAgent,
            userId: actorId,
            organizationId: user.organizationId,
            metadata: {
              filename: file.name || "Untitled.pdf",
              error: errorMessage,
              uploadedFileId: failedUpload?.id || null,
              storagePath: failedUpload?.storagePath || storageResult?.storagePath || null,
              fileHash: failedUpload?.fileHash || storageResult?.fileHash || null,
            },
          });
        } catch (auditError) {
          console.warn("Failed upload audit log failed:", auditError);
        }

        failed.push({
          id: failedUpload?.id || randomUUID(),
          sourceFile: file.name || "Untitled.pdf",
          status: UPLOAD_STATUS.FAILED,
          error: errorMessage,
          errorMessage,
          storagePath: failedUpload?.storagePath || null,
        });
      }
    }

    return Response.json(
      {
        files: uploaded,
        failed,
        summary: {
          total: files.length,
          ready: uploaded.length,
          failed: failed.length,
        },
      },
      { status: uploaded.length ? (failed.length ? 207 : 201) : 422 },
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return Response.json({ error: error.message, limitBytes: MAX_UPLOAD_BYTES }, { status: error.status });
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown upload error." },
      { status: 500 },
    );
  }
}
