import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { normalizeRecord } from "@/lib/records";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { withRenewalCompanyDisplay } from "@/lib/renewals/companies";
import { logActivity } from "@/lib/activities/activity-service";
import { validatePdfFile } from "@/lib/uploads/validation";
import { uploadFile } from "@/lib/storage";
import { extractTextFromPdf } from "@/lib/policies/pdf/text";
import { extractPolicyDataFromTextResult } from "@/lib/policies/extraction-pipeline";
import { sanitizeRecordPayload } from "@/lib/records/validation";
import { formatReviewValidationError, getReviewValidation } from "@/app/lib/dashboard-helpers";
import { buildPolicyCustomerNameFields } from "@/lib/renewals/customer-name";
import { sendPolicyUploadWelcomeMessage } from "@/lib/policies/welcome-message";
import { UPLOAD_STATUS } from "@/lib/uploads/status";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    // Parse payload (support both multipart/form-data and application/json)
    const contentType = request.headers.get("content-type") || "";
    let previousPolicyId = null;
    let renewedData = {};
    let file = null;
    let idempotencyKey = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      previousPolicyId = formData.get("previousPolicyId");
      idempotencyKey = formData.get("idempotencyKey");
      file = formData.get("file") || formData.get("files");
      const rawRenewedData = formData.get("renewedData");
      if (rawRenewedData) {
        renewedData = typeof rawRenewedData === "string" ? JSON.parse(rawRenewedData) : rawRenewedData;
      }
    } else {
      const body = await request.json();
      previousPolicyId = body.previousPolicyId;
      idempotencyKey = body.idempotencyKey;
      renewedData = body.renewedData || {};
    }

    if (!previousPolicyId) {
      return Response.json({ error: "Missing previousPolicyId parameter" }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "write");

    // 1. Retrieve previous policy and verify ownership/tenant authorization
    const oldPolicy = await prisma.policyRecord.findFirst({
      where: {
        id: previousPolicyId,
        ...tenantFilter,
      },
    });

    if (!oldPolicy) {
      return Response.json({ error: "Previous policy not found or access denied" }, { status: 403 });
    }

    // 2. Idempotency Check: prevent duplicate renewal creation on double-click, browser retry, slow network
    if (oldPolicy.renewalStatus === "RENEWED") {
      if (oldPolicy.renewedPolicyId) {
        const existingRenewedPolicy = await prisma.policyRecord.findFirst({
          where: {
            id: oldPolicy.renewedPolicyId,
            ...tenantFilter,
          },
        });
        if (existingRenewedPolicy) {
          return Response.json(withRenewalCompanyDisplay(normalizeRecord(existingRenewedPolicy)), { status: 200 });
        }
      }
      // If renewed without issued policy copy, return existing closed record idempotently
      return Response.json(withRenewalCompanyDisplay(normalizeRecord(oldPolicy)), { status: 200 });
    }

    // Concurrency check before heavy processing
    const expectedUpdatedAt = renewedData?.expectedUpdatedAt;
    const expectedTime = expectedUpdatedAt ? new Date(expectedUpdatedAt).getTime() : null;
    if (expectedTime && oldPolicy.updatedAt && new Date(oldPolicy.updatedAt).getTime() > expectedTime) {
      return Response.json(
        {
          error: "Conflict: This record was modified by another session. Please refresh to view the latest state.",
          conflict: true,
        },
        { status: 409 }
      );
    }

    // Prepare remark data
    const oldPolicyData = { ...(oldPolicy.data || {}) };
    const oldPolicyReviewedData = { ...(oldPolicy.reviewedData || {}) };
    if (renewedData?.remark) {
      const renewedRemark = {
        id: randomUUID(),
        text: String(renewedData.remark).trim(),
        createdAt: new Date().toISOString(),
        createdBy: user.name || user.email || "User",
        createdById: actorId || null,
        type: "RENEWED",
        oldStatus: oldPolicy.renewalStatus || "ACTIVE",
        newStatus: "RENEWED",
      };
      oldPolicyData.remark = renewedRemark.text;
      oldPolicyReviewedData.remark = renewedRemark.text;
      oldPolicyData.renewalRemarks = [
        renewedRemark,
        ...(Array.isArray(oldPolicyData.renewalRemarks) ? oldPolicyData.renewalRemarks : []),
      ];
      oldPolicyReviewedData.renewalRemarks = [
        renewedRemark,
        ...(Array.isArray(oldPolicyReviewedData.renewalRemarks) ? oldPolicyReviewedData.renewalRemarks : []),
      ];
    }

    // 3. If file is attached, validate, extract, and stage in-memory BEFORE opening the DB transaction
    let stagedUpload = null;
    if (file && typeof file.arrayBuffer === "function") {
      const buffer = await validatePdfFile(file);
      const storageResult = await uploadFile(buffer, file.type || "application/pdf", file.name || "Untitled.pdf");

      const textResult = await extractTextFromPdf(buffer);
      const rawText = textResult.rawText;
      if (!rawText) {
        throw new Error(
          textResult.ocrAttempted
            ? "No text could be extracted from the uploaded renewal policy document."
            : "PDF text extraction returned no content."
        );
      }

      const extraction = await extractPolicyDataFromTextResult({
        textResult,
        sourceFile: file.name || "",
      });
      const resolvedClientId =
        renewedData?.clientId ||
        oldPolicy.data?.clientId ||
        oldPolicy.reviewedData?.clientId ||
        oldPolicy.customerPortfolioId ||
        "CLIENT-RENEWAL";
      const resolvedContactPerson =
        renewedData?.contactPerson ||
        extraction.data?.contactPerson ||
        oldPolicy.data?.contactPerson ||
        oldPolicy.contactPersonName ||
        oldPolicy.data?.insuredName ||
        "Valued Customer";
      const resolvedContactNumber =
        renewedData?.contactNumber ||
        extraction.data?.contactNumber ||
        oldPolicy.data?.contactNumber ||
        oldPolicy.contactPersonMobile ||
        oldPolicy.renewalRecipientMobile ||
        "9999999999";

      const extractedPayload = {
        ...sanitizeRecordPayload(extraction.data),
        clientId: resolvedClientId,
        contactPerson: resolvedContactPerson,
        contactNumber: resolvedContactNumber,
      };
      const validation = getReviewValidation({
        sourceFile: file.name || extractedPayload.sourceFile,
        extractedData: extractedPayload,
      });

      if (!validation.valid) {
        throw new Error(formatReviewValidationError(validation.missingRequired));
      }

      // Check for duplicate policy number if different from old policy
      const incomingPolicyNumber = (extractedPayload.policyNumber || extractedPayload["Policy No."] || "").trim();
      if (incomingPolicyNumber) {
        const existingRecord = await prisma.policyRecord.findFirst({
          where: {
            deletedAt: null,
            organizationId: user.organizationId,
            id: { not: previousPolicyId },
            OR: [
              { reviewedData: { path: ["policyNumber"], equals: incomingPolicyNumber } },
              { data: { path: ["policyNumber"], equals: incomingPolicyNumber } },
              { data: { path: ["Policy No."], equals: incomingPolicyNumber } },
            ],
          },
          select: { id: true, sourceFile: true, pdfFileName: true },
        });

        if (existingRecord) {
          throw new Error(
            `Policy number "${incomingPolicyNumber}" already exists in the system (File: "${existingRecord.pdfFileName || existingRecord.sourceFile || "existing record"}"). Duplicate renewal skipped.`
          );
        }
      }

      const customerNameFields = buildPolicyCustomerNameFields(extractedPayload);

      stagedUpload = {
        buffer,
        storageResult,
        textResult,
        rawText,
        extractedPayload,
        customerNameFields,
      };
    }

    // 4. Execute atomic database transaction (OCC version check inside mutation + link creation)
    const result = await prisma.$transaction(async (tx) => {
      // Atomic conditional update on old policy matching ID, tenant filter, and expected updatedAt
      const updateResult = await tx.policyRecord.updateMany({
        where: {
          id: previousPolicyId,
          ...tenantFilter,
          ...(expectedTime ? { updatedAt: new Date(expectedUpdatedAt) } : {}),
          renewalStatus: { not: "RENEWED" },
        },
        data: {
          renewalStatus: "RENEWED",
          isActivePolicy: false,
          renewalDate: new Date(),
          data: oldPolicyData,
          reviewedData: oldPolicyReviewedData,
          updatedById: actorId,
        },
      });

      if (updateResult.count === 0) {
        // Concurrency conflict or concurrent double-submit
        const currentPolicy = await tx.policyRecord.findFirst({
          where: { id: previousPolicyId, ...tenantFilter },
          select: { renewalStatus: true, renewedPolicyId: true, updatedAt: true },
        });

        if (currentPolicy?.renewalStatus === "RENEWED") {
          if (currentPolicy.renewedPolicyId) {
            const existing = await tx.policyRecord.findFirst({ where: { id: currentPolicy.renewedPolicyId } });
            if (existing) return { policy: existing, stagedData: null };
          }
          return { policy: oldPolicy, stagedData: null };
        }

        const conflictErr = new Error("OCC_CONFLICT");
        conflictErr.code = "OCC_CONFLICT";
        throw conflictErr;
      }

      // If policy document was staged, create UploadedFile + PolicyRecord atomically
      if (stagedUpload) {
        const { buffer, storageResult, textResult, rawText, extractedPayload, customerNameFields } = stagedUpload;

        const uploadedFile = await tx.uploadedFile.create({
          data: {
            id: randomUUID(),
            sourceFile: file.name || extractedPayload.sourceFile || "Untitled.pdf",
            mimeType: file.type || "application/pdf",
            sizeBytes: buffer.byteLength,
            rawText,
            extractionMethod: extractedPayload.extractionMethod || textResult.extractionMethod || "pdf_text",
            status: UPLOAD_STATUS.APPROVED,
            detectedCompanyName: extractedPayload.insuranceCompany || "",
            detectedServiceCategoryName: extractedPayload.documentCategory || "",
            detectedPolicyTypeName: extractedPayload.policyType || "",
            extractedData: extractedPayload,
            extractionQuality: extractedPayload.extractionQuality || {},
            extractionLog: textResult.extractionLog || {},
            schemaVersion: extractedPayload.schemaExtraction?.schemaVersion || null,
            organizationId: user.organizationId,
            createdById: actorId,
            storageProvider: storageResult.storageProvider,
            storagePath: storageResult.storagePath,
            fileHash: storageResult.fileHash,
            fileSize: storageResult.fileSize,
            storageMetadata: storageResult.storageMetadata || {},
          },
        });

        const newPolicyRecord = await tx.policyRecord.create({
          data: {
            id: randomUUID(),
            savedAt: new Date(),
            data: extractedPayload,
            pdfFileName: file.name || extractedPayload.sourceFile || "Untitled.pdf",
            pdfMimeType: file.type || "application/pdf",
            sourceFile: file.name || extractedPayload.sourceFile || "Untitled.pdf",
            rawText,
            detectedCompany: extractedPayload.insuranceCompany || "",
            detectedServiceCategory: extractedPayload.documentCategory || "",
            detectedPolicyType: extractedPayload.policyType || "",
            selectedCompany: extractedPayload.insuranceCompany || "",
            selectedServiceCategory: extractedPayload.documentCategory || "",
            selectedPolicyType: extractedPayload.policyType || "",
            confidenceScore: Number(extractedPayload.confidenceScore || 0),
            extractedData: extractedPayload,
            reviewedData: extractedPayload,
            extractionMethod: extractedPayload.extractionMethod || textResult.extractionMethod || "",
            extractionQuality: extractedPayload.extractionQuality || {},
            extractionLog: textResult.extractionLog || {},
            schemaVersion: Number(extractedPayload.schemaExtraction?.schemaVersion || 1),
            uploadedFileId: uploadedFile.id,
            organizationId: user.organizationId,
            createdById: actorId,
            previousPolicyId: oldPolicy.id,
            isActivePolicy: true,
            renewalStatus: "ACTIVE",
            customerPortfolioId: oldPolicy.customerPortfolioId || null,
            ...customerNameFields,
          },
        });

        // Explicit link: point original renewal to the new issued policy
        await tx.policyRecord.update({
          where: { id: previousPolicyId },
          data: { renewedPolicyId: newPolicyRecord.id },
        });

        // Log unified activity referencing both original renewal and new issued policy
        await logActivity({
          tx,
          organizationId: user.organizationId,
          userId: actorId,
          userRole: user.role,
          module: "RENEWAL",
          customerId: oldPolicy.customerPortfolioId || null,
          customerName: oldPolicy.insuredName || oldPolicy.data?.insuredName,
          policyIds: [previousPolicyId, newPolicyRecord.id],
          activityType: "RENEWAL",
          outcome: "RENEWED",
          remark: renewedData?.remark || "Policy renewed through Bima Headquarter",
          metadata: {
            renewalType: renewedData?.renewalType || "BHQ",
            newPolicyNo: newPolicyRecord.reviewedData?.policyNumber || renewedData?.policyNumber,
            newInsurer: newPolicyRecord.selectedCompany || renewedData?.insuranceCompany,
            newPolicyId: newPolicyRecord.id,
            uploadedFileId: uploadedFile.id,
            idempotencyKey: idempotencyKey || undefined,
          },
        });

        return { policy: newPolicyRecord, stagedData: extractedPayload };
      }

      // No document uploaded (e.g. Renewed Elsewhere)
      await logActivity({
        tx,
        organizationId: user.organizationId,
        userId: actorId,
        userRole: user.role,
        module: "RENEWAL",
        customerId: oldPolicy.customerPortfolioId || null,
        customerName: oldPolicy.insuredName || oldPolicy.data?.insuredName,
        policyIds: [previousPolicyId],
        activityType: "RENEWAL",
        outcome: "RENEWED",
        remark: renewedData?.remark || "Policy marked as renewed",
        metadata: {
          renewalType: renewedData?.renewalType || "BHQ",
          newPolicyNo: renewedData?.policyNumber,
          newInsurer: renewedData?.insuranceCompany,
          idempotencyKey: idempotencyKey || undefined,
        },
      });

      const updatedOldPolicy = await tx.policyRecord.findUnique({
        where: { id: previousPolicyId },
      });

      return { policy: updatedOldPolicy, stagedData: null };
    });

    // 5. Trigger welcome message asynchronously if a new policy document was created
    if (result?.stagedData && result?.policy?.id) {
      sendPolicyUploadWelcomeMessage({
        recordId: result.policy.id,
        data: result.stagedData,
      }).catch((msgErr) => {
        console.warn("Background welcome message dispatch notice:", msgErr?.message || msgErr);
      });
    }

    // Audit log
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
      metadata: {
        hasDocument: Boolean(stagedUpload),
        issuedPolicyId: stagedUpload ? result.policy.id : null,
      },
    });

    return Response.json(withRenewalCompanyDisplay(normalizeRecord(result.policy)), { status: 201 });
  } catch (error) {
    if (error.code === "OCC_CONFLICT") {
      return Response.json(
        {
          error: "Conflict: This record was modified by another session. Please refresh to view the latest state.",
          conflict: true,
        },
        { status: 409 }
      );
    }
    console.error("Policy renewal failed:", error);
    return Response.json(
      { error: error.message || "Policy renewal failed. Please try again." },
      { status: 500 }
    );
  }
}
