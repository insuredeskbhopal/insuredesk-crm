import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";
import { normalizeRecord } from "@/lib/records";
import { logAudit, getAuditMetadata } from "@/lib/audit";

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
    const actorId = user.userId || user.id;

    const { previousPolicyId, renewedData, pdfInfo } = await request.json();
    if (!previousPolicyId || !renewedData) {
      return Response.json({ error: "Missing previousPolicyId or renewedData" }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");

    // Retrieve previous policy to verify ownership
    const oldPolicy = await prisma.policyRecord.findFirst({
      where: {
        id: previousPolicyId,
        ...tenantFilter
      }
    });

    if (!oldPolicy) {
      return Response.json({ error: "Previous policy not found or access denied" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create UploadedFile if PDF info is provided
      let uploadedFileId = null;
      if (pdfInfo && pdfInfo.storageResult) {
        const uploadedFile = await tx.uploadedFile.create({
          data: {
            id: randomUUID(),
            sourceFile: pdfInfo.fileName || "Untitled.pdf",
            mimeType: pdfInfo.fileType || "application/pdf",
            sizeBytes: pdfInfo.fileSize || 0,
            rawText: pdfInfo.rawText || "",
            extractionMethod: "pdf_text",
            status: "APPROVED",
            organizationId: user.organizationId,
            createdById: actorId,
            storageProvider: pdfInfo.storageResult.storageProvider,
            storagePath: pdfInfo.storageResult.storagePath,
            fileHash: pdfInfo.storageResult.fileHash,
            fileSize: pdfInfo.storageResult.fileSize,
            storageMetadata: pdfInfo.storageResult.storageMetadata || {}
          }
        });
        uploadedFileId = uploadedFile.id;
      }

      // 2. Create the new PolicyRecord
      const newPolicyId = randomUUID();
      const newPolicy = await tx.policyRecord.create({
        data: {
          id: newPolicyId,
          savedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          data: renewedData,
          pdfFileName: pdfInfo?.fileName || "",
          pdfMimeType: pdfInfo?.fileType || "application/pdf",
          sourceFile: pdfInfo?.fileName || "Manual Renewal",
          rawText: pdfInfo?.rawText || "",
          detectedCompany: renewedData.insuranceCompany || "",
          detectedPolicyType: renewedData.policyType || "",
          selectedCompany: renewedData.insuranceCompany || "",
          selectedPolicyType: renewedData.policyType || "",
          confidenceScore: 1.0,
          extractedData: renewedData,
          reviewedData: renewedData,
          extractionMethod: pdfInfo ? "pdf_text" : "manual_entry",
          uploadedFileId: uploadedFileId,
          organizationId: user.organizationId,
          createdById: actorId,
          
          // Renewal fields
          renewalStatus: "ACTIVE",
          previousPolicyId: previousPolicyId,
          isActivePolicy: true
        }
      });

      // 3. Update the old PolicyRecord
      await tx.policyRecord.update({
        where: { id: previousPolicyId },
        data: {
          renewalStatus: "RENEWED",
          isActivePolicy: false,
          renewedPolicyId: newPolicyId,
          renewalDate: new Date()
        }
      });

      return newPolicy;
    });

    // Audit logs
    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "POLICY_RENEWED",
      entityType: "PolicyRecord",
      entityId: previousPolicyId,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { newPolicyId: result.id }
    });

    return Response.json(normalizeRecord(result), { status: 201 });
  } catch (error) {
    console.error("Policy renewal failed:", error);
    return Response.json({ error: "Policy renewal failed. Please try again." }, { status: 500 });
  }
}
