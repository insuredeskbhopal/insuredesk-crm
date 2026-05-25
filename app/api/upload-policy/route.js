import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { extractTextFromPdf } from "@/lib/pdf-text";
import { extractPolicyFromText } from "@/lib/pdf-extractor.cjs";
import { sanitizeRecordPayload } from "@/lib/record-validation";
import { MAX_UPLOAD_BYTES, UploadValidationError, validatePdfFile, validateUploadList } from "@/lib/upload-validation";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((file) => file && typeof file.arrayBuffer === "function");
    validateUploadList(files);

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      try {
        const buffer = await validatePdfFile(file);
        const { rawText, extractionMethod, ocrAttempted, extractionLog } = await extractTextFromPdf(buffer);

        if (!rawText) {
          throw new Error(ocrAttempted ? "No text could be extracted from this PDF using text extraction or OCR." : "PDF text extraction returned no content.");
        }

        const extractedData = sanitizeRecordPayload(extractPolicyFromText(rawText, file.name || ""));

        const uploadedFile = await prisma.uploadedFile.create({
          data: {
            id: randomUUID(),
            sourceFile: file.name || "Untitled.pdf",
            mimeType: file.type || "application/pdf",
            sizeBytes: buffer.byteLength,
            pdfBytes: buffer,
            rawText,
            extractionMethod,
            status: "ready_for_review",
            detectedBankSourceName: "",
            detectedCompanyName: extractedData.insuranceCompany || "",
            detectedServiceCategoryName: "",
            detectedPolicyTypeName: extractedData.policyType || "",
            confidenceScore: 0,
            extractedData,
            extractionLog,
            schemaFallbackLevel: null,
            schemaVersion: null
          }
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
        failed.push({
          id: randomUUID(),
          sourceFile: file.name || "Untitled.pdf",
          status: "failed",
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
