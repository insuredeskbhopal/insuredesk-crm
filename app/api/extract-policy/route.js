import { extractFieldsForSchema } from "@/lib/policy-extractor";
import { getPolicySchema } from "@/lib/policy-field-setup";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";
import { UPLOAD_STATUS } from "@/lib/upload-status";

export const runtime = "nodejs";

export async function POST(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await verifyJWT(token);
  if (!user || user.role === "VIEWER") {
    return Response.json({ error: "Unauthorized." }, { status: 403 });
  }

  const payload = await request.json();
  const uploadedFileId = String(payload.uploadedFileId || "");
  const rawText = String(payload.rawText || "");

  const uploadedFile = uploadedFileId
    ? await prisma.uploadedFile.findFirst({
        where: {
          id: uploadedFileId,
          ...getTenantFilter(user, "write")
        }
      })
    : null;

  if (uploadedFileId && !uploadedFile) {
    return Response.json({ error: "Uploaded file was not found or access denied." }, { status: 404 });
  }

  const text = uploadedFile?.rawText || rawText;

  if (!text.trim()) {
    return Response.json({ error: "rawText or uploadedFileId is required." }, { status: 400 });
  }

  const schema = await getPolicySchema({
    bankSourceId: payload.bankSourceId || undefined,
    companyId: payload.companyId || undefined,
    categoryId: payload.categoryId || undefined,
    policyTypeId: payload.policyTypeId || undefined
  });

  if (!schema) {
    return Response.json({ error: "No active schema found for the selected policy type." }, { status: 404 });
  }

  const extractedData = extractFieldsForSchema(text, schema);

  if (uploadedFile) {
    await prisma.uploadedFile.update({
      where: { id: uploadedFile.id },
      data: {
        detectedCompanyId: payload.companyId || uploadedFile.detectedCompanyId,
        detectedBankSourceId: payload.bankSourceId || uploadedFile.detectedBankSourceId,
        detectedServiceCategoryId: payload.categoryId || uploadedFile.detectedServiceCategoryId,
        detectedPolicyTypeId: payload.policyTypeId || uploadedFile.detectedPolicyTypeId,
        extractedData,
        schemaVersion: schema.version,
        schemaFallbackLevel: schema.fallbackLevel,
        status: UPLOAD_STATUS.REVIEW_REQUIRED
      }
    });
  }

  return Response.json({ schema, extractedData, fallbackLevel: schema.fallbackLevel, fallbackUsed: schema.fallbackUsed });
}
