import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/record-validation";
import { MAX_UPLOAD_BYTES, UploadValidationError, validatePdfFile, validateUploadList } from "@/lib/upload-validation";
import { extractPolicyFromPdf } from "@/lib/pdf-extractor.cjs";
import { verifyJWT } from "@/lib/auth";
import { formatReviewValidationError, getReviewValidation } from "@/app/lib/dashboard-helpers";
import { getUploadFailureMessage, persistFailedUploadedFile } from "@/lib/upload-failure";
import { UPLOAD_STATUS } from "@/lib/upload-status";

export const runtime = "nodejs";

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

      try {
        buffer = await validatePdfFile(file);

        const extracted = await extractPolicyFromPdf(buffer, file.name);
        const data = sanitizeRecordPayload(extracted);
        const validation = getReviewValidation({
          sourceFile: file.name || data.sourceFile,
          extractedData: data
        });

        if (!validation.valid) {
          throw new Error(formatReviewValidationError(validation.missingRequired));
        }

        const record = await prisma.policyRecord.create({
          data: {
            id: randomUUID(),
            savedAt: new Date(),
            data,
            pdfFileName: file.name || data.sourceFile || "Untitled.pdf",
            pdfMimeType: file.type || "application/pdf",
            pdfBytes: buffer,
            organizationId: user.organizationId,
            createdById: user.userId || user.id
          }
        });

        created.push(normalizeRecord({
          ...record,
          createdBy: { name: user.name, email: user.email }
        }));
      } catch (error) {
        const failedUpload = await persistFailedUploadedFile({
          file,
          error,
          user,
          actorId: user.userId || user.id,
          buffer
        });
        const errorMessage = failedUpload?.errorMessage || getUploadFailureMessage(error);

        console.error(`PDF extraction failed for ${file.name}:`, error);
        failed.push({
          id: failedUpload?.id || randomUUID(),
          sourceFile: file.name || "Untitled.pdf",
          status: UPLOAD_STATUS.FAILED,
          error: errorMessage,
          errorMessage
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
            failed: failed.length
          }
        },
        { status: 422 }
      );
    }

    return Response.json(
      {
        records: created,
        failed,
        summary: {
          total: files.length,
          saved: created.length,
          failed: failed.length
        }
      },
      { status: failed.length ? 207 : 201 }
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return Response.json({ error: error.message, limitBytes: MAX_UPLOAD_BYTES }, { status: error.status });
    }

    console.error("PDF upload extraction failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown upload error." },
      { status: 500 }
    );
  }
}
