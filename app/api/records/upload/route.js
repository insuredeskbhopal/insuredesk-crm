import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/record-validation";
import { MAX_UPLOAD_BYTES, UploadValidationError, validatePdfFile, validateUploadList } from "@/lib/upload-validation";

export const runtime = "nodejs";
const require = createRequire(import.meta.url);
const { extractPolicyFromPdf } = require("../../../../lib/pdf-extractor.cjs");

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((file) => file && typeof file.arrayBuffer === "function");
    validateUploadList(files);

    const created = [];
    const failed = [];

    for (const file of files) {
      try {
        const buffer = await validatePdfFile(file);

        const extracted = await extractPolicyFromPdf(buffer, file.name);
        const data = sanitizeRecordPayload(extracted);
        const record = await prisma.policyRecord.create({
          data: {
            id: randomUUID(),
            savedAt: new Date(),
            data,
            pdfFileName: file.name || data.sourceFile || "Untitled.pdf",
            pdfMimeType: file.type || "application/pdf",
            pdfBytes: buffer
          }
        });

        created.push(normalizeRecord(record));
      } catch (error) {
        console.error(`PDF extraction failed for ${file.name}:`, error);
        failed.push({
          sourceFile: file.name || "Untitled.pdf",
          error: error instanceof Error ? error.message : "Unknown extraction error."
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
