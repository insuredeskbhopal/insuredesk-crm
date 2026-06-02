import { verifyJWT } from "@/lib/auth";
import { validatePdfFile } from "@/lib/upload-validation";
import { extractTextFromPdf } from "@/lib/pdf-text";
import { extractPolicyDataFromTextResult } from "@/lib/policy-extraction-pipeline";
import { sanitizeRecordPayload } from "@/lib/record-validation";
import { uploadFile } from "@/lib/storage";

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
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "Missing file parameter" }, { status: 400 });
    }

    const buffer = await validatePdfFile(file);

    const storageResult = await uploadFile(
      buffer,
      file.type || "application/pdf",
      file.name || "Untitled.pdf"
    );

    const textResult = await extractTextFromPdf(buffer);
    const rawText = textResult.rawText;

    if (!rawText) {
      throw new Error(textResult.ocrAttempted ? "No text could be extracted." : "PDF text extraction returned no content.");
    }

    const extraction = await extractPolicyDataFromTextResult({
      textResult,
      sourceFile: file.name || ""
    });
    const extractedData = sanitizeRecordPayload(extraction.data);

    return Response.json({
      success: true,
      extractedData,
      storageResult,
      rawText,
      fileName: file.name,
      fileType: file.type,
      fileSize: buffer.byteLength
    });
  } catch (error) {
    console.error("PDF extraction for renewal failed:", error);
    return Response.json({ error: "PDF extraction failed. Please try again." }, { status: 500 });
  }
}
