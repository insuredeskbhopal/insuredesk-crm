import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { extractTextFromPdf } from "@/lib/pdf-text";
import { extractPolicyFromText } from "@/lib/pdf-extractor.cjs";
import { sanitizeRecordPayload } from "@/lib/record-validation";
import { MAX_UPLOAD_BYTES, UploadValidationError, validatePdfFile, validateUploadList } from "@/lib/upload-validation";
import { verifyJWT } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { logAudit, getAuditMetadata } from "@/lib/audit";

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

    const formData = await request.formData();
    const files = formData.getAll("files").filter((file) => file && typeof file.arrayBuffer === "function");
    validateUploadList(files);

    const uploaded = [];
    const failed = [];
    const { ipAddress, userAgent } = getAuditMetadata(request);

    for (const file of files) {
      try {
        const buffer = await validatePdfFile(file);
        
        // 1. Upload to storage layer (Local/S3) and get metadata
        const storageResult = await uploadFile(
          buffer,
          file.type || "application/pdf",
          file.name || "Untitled.pdf"
        );

        // 2. Perform PDF text extraction
        const { rawText, extractionMethod, ocrAttempted, extractionLog } = await extractTextFromPdf(buffer);

        if (!rawText) {
          throw new Error(ocrAttempted ? "No text could be extracted from this PDF using text extraction or OCR." : "PDF text extraction returned no content.");
        }

        const extractedData = sanitizeRecordPayload(extractPolicyFromText(rawText, file.name || ""));

        // 3. Save UploadedFile record to database, referencing storage path and excluding binary bytes
        const uploadedFile = await prisma.uploadedFile.create({
          data: {
            id: randomUUID(),
            sourceFile: file.name || "Untitled.pdf",
            mimeType: file.type || "application/pdf",
            sizeBytes: buffer.byteLength,
            rawText,
            extractionMethod,
            status: "REVIEW_REQUIRED", // Enterprise status enum
            detectedBankSourceName: "",
            detectedCompanyName: extractedData.insuranceCompany || "",
            detectedServiceCategoryName: "",
            detectedPolicyTypeName: extractedData.policyType || "",
            confidenceScore: 0,
            extractedData,
            extractionLog,
            schemaFallbackLevel: null,
            schemaVersion: null,
            
            // SaaS scoping and tracking
            organizationId: user.organizationId,
            createdById: user.id,
            
            // Storage references
            storageProvider: storageResult.storageProvider,
            storagePath: storageResult.storagePath,
            fileHash: storageResult.fileHash,
            fileSize: storageResult.fileSize
          }
        });

        // 4. Audit successful file upload
        await logAudit({
          action: "FILE_UPLOAD",
          entityType: "UploadedFile",
          entityId: uploadedFile.id,
          severity: "INFO",
          source: "API",
          ipAddress,
          userAgent,
          userId: user.id,
          organizationId: user.organizationId,
          metadata: { filename: file.name, fileHash: storageResult.fileHash, fileSize: storageResult.fileSize }
        });

        uploaded.push({
          id: uploadedFile.id,
          sourceFile: uploadedFile.sourceFile,
          status: uploadedFile.status,
          rawText,
          detection: null,
          selected: {},
          extractedData,
          extractionMethod,
          extractionLog
        });
      } catch (error) {
        // Audit failed upload attempt
        await logAudit({
          action: "FILE_UPLOAD_FAILED",
          entityType: "UploadedFile",
          severity: "WARNING",
          source: "API",
          ipAddress,
          userAgent,
          userId: user.id,
          organizationId: user.organizationId,
          metadata: { filename: file.name || "Untitled.pdf", error: error instanceof Error ? error.message : "Extraction failed" }
        });

        failed.push({
          id: randomUUID(),
          sourceFile: file.name || "Untitled.pdf",
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown extraction error."
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
          failed: failed.length
        }
      },
      { status: uploaded.length ? (failed.length ? 207 : 201) : 422 }
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return Response.json({ error: error.message, limitBytes: MAX_UPLOAD_BYTES }, { status: error.status });
    }

    return Response.json({ error: error instanceof Error ? error.message : "Unknown upload error." }, { status: 500 });
  }
}

