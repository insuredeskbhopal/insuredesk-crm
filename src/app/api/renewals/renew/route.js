import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { normalizeRecord } from "@/lib/records";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { sanitizeRecordPayload } from "@/lib/records/validation";

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
    if (!String(renewedData.policyNumber || "").trim()) {
      return Response.json({ error: "New policy number is required." }, { status: 400 });
    }
    const startDate = parseInputDate(renewedData.startDate || renewedData.policyStartDate);
    const expiryDate = parseInputDate(renewedData.expiryDate || renewedData.policyEndDate);
    if (!startDate || !expiryDate) {
      return Response.json({ error: "Valid start date and expiry date are required." }, { status: 400 });
    }
    if (expiryDate <= startDate) {
      return Response.json({ error: "Expiry date must be after start date." }, { status: 400 });
    }
    if (!String(renewedData.premium || renewedData.totalPremium || "").trim()) {
      return Response.json({ error: "Premium is required." }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");

    // Retrieve previous policy to verify ownership
    const oldPolicy = await prisma.policyRecord.findFirst({
      where: {
        id: previousPolicyId,
        ...tenantFilter,
      },
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
            storageMetadata: pdfInfo.storageResult.storageMetadata || {},
          },
        });
        uploadedFileId = uploadedFile.id;
      }

      // 2. Create the new PolicyRecord
      const newPolicyId = randomUUID();
      const standardizedRenewedData = sanitizeRecordPayload(renewedData);
      const previousData = oldPolicy.reviewedData || oldPolicy.data || {};
      const previousRemarks = Array.isArray(previousData.renewalRemarks) ? previousData.renewalRemarks : [];
      if (renewedData.remark) {
        standardizedRenewedData.renewalRemarks = [
          {
            id: randomUUID(),
            text: String(renewedData.remark).trim(),
            createdAt: new Date().toISOString(),
            createdBy: user.name || user.email || "User",
            createdById: actorId || null,
            type: "RENEWED",
          },
          ...previousRemarks,
        ];
      } else if (previousRemarks.length) {
        standardizedRenewedData.renewalRemarks = previousRemarks;
      }
      const newPolicy = await tx.policyRecord.create({
        data: {
          id: newPolicyId,
          savedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          data: standardizedRenewedData,
          pdfFileName: pdfInfo?.fileName || "",
          pdfMimeType: pdfInfo?.fileType || "application/pdf",
          sourceFile: pdfInfo?.fileName || "Manual Renewal",
          rawText: pdfInfo?.rawText || "",
          detectedCompany: standardizedRenewedData.insuranceCompany || "",
          detectedPolicyType: standardizedRenewedData.policyType || "",
          selectedCompany: standardizedRenewedData.insuranceCompany || "",
          selectedPolicyType: standardizedRenewedData.policyType || "",
          confidenceScore: 1.0,
          extractedData: standardizedRenewedData,
          reviewedData: standardizedRenewedData,
          extractionMethod: pdfInfo ? "pdf_text" : "manual_entry",
          uploadedFileId: uploadedFileId,
          organizationId: user.organizationId,
          createdById: actorId,
          updatedById: actorId,

          // Renewal fields
          renewalStatus: "ACTIVE",
          previousPolicyId: previousPolicyId,
          isActivePolicy: true,
        },
      });

      // 3. Update the old PolicyRecord
      const oldPolicyData = oldPolicy.data || {};
      const oldPolicyReviewedData = oldPolicy.reviewedData || {};
      if (renewedData.remark) {
        const renewedRemark = {
          ...standardizedRenewedData.renewalRemarks[0],
          oldStatus: oldPolicy.renewalStatus || "ACTIVE",
          newStatus: "RENEWED",
        };
        standardizedRenewedData.renewalRemarks[0] = renewedRemark;
        oldPolicyData.remark = renewedRemark.text;
        oldPolicyReviewedData.remark = renewedRemark.text;
        oldPolicyData.renewalRemarks = [
          renewedRemark,
          ...(Array.isArray(oldPolicyData.renewalRemarks) ? oldPolicyData.renewalRemarks : []),
        ];
        oldPolicyReviewedData.renewalRemarks = [
          renewedRemark,
          ...(Array.isArray(oldPolicyReviewedData.renewalRemarks)
            ? oldPolicyReviewedData.renewalRemarks
            : []),
        ];
      }

      await tx.policyRecord.update({
        where: { id: previousPolicyId },
        data: {
          renewalStatus: "RENEWED",
          isActivePolicy: false,
          renewedPolicyId: newPolicyId,
          renewalDate: new Date(),
          data: oldPolicyData,
          reviewedData: oldPolicyReviewedData,
          updatedById: actorId,
        },
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
      metadata: { newPolicyId: result.id },
    });

    return Response.json(normalizeRecord(result), { status: 201 });
  } catch (error) {
    console.error("Policy renewal failed:", error);
    return Response.json({ error: "Policy renewal failed. Please try again." }, { status: 500 });
  }
}

function parseInputDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}
