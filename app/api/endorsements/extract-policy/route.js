import { createRequire } from "node:module";
import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { extractTextFromPdf } from "@/lib/policies/pdf/text";
import { validatePdfFile, UploadValidationError } from "@/lib/uploads/validation";

const require = createRequire(import.meta.url);
const { extractPolicyFromText } = require("../../../../lib/policies/pdf/extractor.cjs");

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const user = await verifyJWT(token);
    if (!user || user.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Upload a policy PDF." }, { status: 400 });
    }

    const buffer = await validatePdfFile(file);
    const textResult = await extractTextFromPdf(buffer);
    if (!textResult.rawText) {
      return NextResponse.json(
        { error: "No policy text could be extracted from this PDF." },
        { status: 422 },
      );
    }

    const extractedData = extractPolicyFromText(textResult.rawText, file.name || "policy.pdf");

    return NextResponse.json({
      extractedData,
      sourceFile: file.name || "policy.pdf",
      extractionMethod: textResult.extractionMethod,
      extractionLog: textResult.extractionLog,
      ocrAttempted: Boolean(textResult.ocrAttempted),
    });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Policy extraction failed.",
      },
      { status: 500 },
    );
  }
}
