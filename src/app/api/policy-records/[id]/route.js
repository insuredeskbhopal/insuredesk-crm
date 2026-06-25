import { prisma } from "@/lib/db/prisma";
import { normalizeRecord } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/records/validation";
import { verifyJWT } from "@/lib/auth";
import { canAccessSharedResource, getTenantFilter, UserRole } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { formatReviewValidationError, getReviewValidation } from "@/app/lib/dashboard-helpers";
import insuranceCompanyMaster from "@/lib/master/insurance-companies.cjs";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";

export const runtime = "nodejs";
const { normalizeInsuranceCompanyName } = insuranceCompanyMaster;

export async function PUT(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role === UserRole.VIEWER) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json();
    const actorId = session.userId || session.id || null;
    const existing = await prisma.policyRecord.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
      },
    });

    if (!existing || existing.deletedAt) {
      return Response.json({ error: "Policy record not found." }, { status: 404 });
    }

    // Verify tenant and role permissions
    const isAuthorized = canAccessSharedResource(session, "write", existing.organizationId);

    if (!isAuthorized) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    const incomingReviewedData = payload.reviewedData || payload.extractedData || {};
    if (!Object.keys(incomingReviewedData).length) {
      return Response.json({ error: "No policy edits were provided." }, { status: 400 });
    }
    const sourceFile =
      payload.sourceFile ||
      existing.sourceFile ||
      existing.pdfFileName ||
      existing.data?.sourceFile ||
      "Untitled.pdf";
    const reviewedData = sanitizeRecordPayload({
      ...(existing.reviewedData || existing.extractedData || existing.data || {}),
      ...incomingReviewedData,
      sourceFile,
    });
    const mergedData = sanitizeRecordPayload({
      ...(existing.data || {}),
      ...reviewedData,
      sourceFile,
    });
    const extractedData = payload.extractedData
      ? sanitizeRecordPayload({
          ...(existing.extractedData || {}),
          ...payload.extractedData,
          sourceFile,
        })
      : existing.extractedData;
    const selectedCompany = normalizeInsuranceCompanyName(
      payload.selectedCompany ?? reviewedData.insuranceCompany ?? existing.selectedCompany,
      existing.rawText || "",
    );
    const validation = getReviewValidation({
      sourceFile,
      extractedData: mergedData,
    });

    if (validation.contactErrors.length) {
      return Response.json({ error: validation.contactErrors.join(" ") }, { status: 400 });
    }

    if (!validation.valid) {
      return Response.json(
        {
          error: formatReviewValidationError(validation.missingRequired, validation.contactErrors),
          missingRequired: validation.missingRequired,
        },
        { status: 422 },
      );
    }

    const record = await prisma.policyRecord.update({
      where: { id },
      data: {
        reviewedData,
        extractedData,
        selectedBankSource: payload.selectedBankSource ?? existing.selectedBankSource,
        selectedCompany,
        selectedServiceCategory: payload.selectedServiceCategory ?? existing.selectedServiceCategory,
        selectedPolicyType: payload.selectedPolicyType ?? existing.selectedPolicyType,
        data: mergedData,
        updatedById: actorId,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        uploadedFile: {
          select: {
            createdAt: true,
            createdBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Audit log update event
    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "POLICY_RECORD_UPDATE",
      entityType: "PolicyRecord",
      entityId: record.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { sourceFile: record.sourceFile },
    });

    return Response.json(normalizeRecord(record));
  } catch (error) {
    return Response.json(
      { error: getUserFacingErrorMessage(error, "Policy record could not be updated.") },
      { status: 400 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== UserRole.SUPER_ADMIN) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const actorId = session.userId || session.id || null;
    const existing = await prisma.policyRecord.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
      },
    });

    if (!existing || existing.deletedAt) {
      return Response.json({ error: "Policy record not found." }, { status: 404 });
    }

    // Verify tenant and role permissions
    const isAuthorized = canAccessSharedResource(session, "delete", existing.organizationId);

    if (!isAuthorized) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    let payload = {};
    try {
      payload = await request.json();
    } catch {}
    const policyNumber =
      existing.reviewedData?.policyNumber ||
      existing.data?.policyNumber ||
      existing.extractedData?.policyNumber ||
      "";
    const deleteLabel = policyNumber || id;
    const expectedConfirmation = `DELETE ${deleteLabel}`;

    if (String(payload.confirmation || "").trim() !== expectedConfirmation) {
      return Response.json(
        {
          error: `Type "${expectedConfirmation}" to delete this policy record.`,
          expectedConfirmation,
        },
        { status: 428 },
      );
    }

    // Perform enterprise Soft Delete
    await prisma.policyRecord.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
      },
    });

    // Audit log delete event
    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "POLICY_RECORD_DELETE",
      entityType: "PolicyRecord",
      entityId: id,
      severity: "WARNING",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { sourceFile: existing.sourceFile, policyNumber },
    });

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Policy record could not be deleted." }, { status: 500 });
  }
}
