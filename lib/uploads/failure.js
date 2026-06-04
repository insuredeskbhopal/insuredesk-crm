import { prisma } from "@/lib/db/prisma";
import { deleteFile } from "@/lib/storage";
import { UPLOAD_STATUS } from "@/lib/uploads/status";

export function getUploadFailureMessage(error) {
  return error instanceof Error ? error.message : "Unknown extraction error.";
}

export async function persistFailedUploadedFile({
  file,
  error,
  user,
  actorId,
  buffer = null,
  storageResult = null,
  rawText = "",
  extractionMethod = "failed",
  extractionLog = null
}) {
  const errorMessage = getUploadFailureMessage(error);
  const sourceFile = file?.name || "Untitled.pdf";
  const failedAt = new Date();
  const sizeBytes = buffer?.byteLength || file?.size || storageResult?.fileSize || null;

  try {
    return await prisma.uploadedFile.create({
      data: {
        sourceFile,
        mimeType: file?.type || "application/pdf",
        sizeBytes,
        rawText: rawText || null,
        extractionMethod,
        status: UPLOAD_STATUS.FAILED,
        errorMessage,
        extractedData: {},
        extractionQuality: {},
        extractionLog: {
          ...(extractionLog && typeof extractionLog === "object" ? extractionLog : {}),
          error: errorMessage,
          failedAt: failedAt.toISOString()
        },
        createdAt: failedAt,
        organizationId: user.organizationId,
        createdById: actorId,
        storageProvider: storageResult?.storageProvider || null,
        storagePath: storageResult?.storagePath || null,
        fileHash: storageResult?.fileHash || null,
        fileSize: storageResult?.fileSize || sizeBytes,
        storageMetadata: {
          ...(storageResult?.storageMetadata && typeof storageResult.storageMetadata === "object" ? storageResult.storageMetadata : {}),
          originalFilename: sourceFile,
          failedAt: failedAt.toISOString(),
          storageProvider: storageResult?.storageProvider || null,
          storagePath: storageResult?.storagePath || null,
          fileHash: storageResult?.fileHash || null,
          fileSize: storageResult?.fileSize || sizeBytes
        }
      }
    });
  } catch (persistenceError) {
    console.error(`Failed to persist failed upload record for ${sourceFile}:`, persistenceError);
    if (storageResult?.storagePath) {
      await deleteFile(storageResult.storagePath);
    }
    return null;
  }
}
