import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import { verifyJWT } from "@/lib/auth";
import { canAccessResource, getTenantFilter, UserRole } from "@/lib/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { formatReviewValidationError, getReviewValidation } from "@/app/lib/dashboard-helpers";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER].includes(session.role)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json();
    const existing = await prisma.policyRecord.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "write")
      }
    });

    if (!existing || existing.deletedAt) {
      return Response.json({ error: "Policy record not found." }, { status: 404 });
    }

    // Verify tenant and role permissions
    const isAuthorized = canAccessResource(
      session,
      "write",
      existing.createdById,
      existing.organizationId
    );

    if (!isAuthorized) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    const reviewedData = payload.reviewedData || payload.extractedData || existing.reviewedData || existing.extractedData || {};
    const mergedData = { ...(existing.data || {}), ...reviewedData };
    const validation = getReviewValidation({
      sourceFile: existing.sourceFile || existing.pdfFileName || mergedData.sourceFile,
      extractedData: mergedData
    });

    if (!validation.valid) {
      return Response.json({
        error: formatReviewValidationError(validation.missingRequired),
        missingRequired: validation.missingRequired,
        schema: validation.resolvedSchema
          ? {
              groupId: validation.resolvedSchema.groupId,
              policyId: validation.resolvedSchema.policyId,
              policyName: validation.resolvedSchema.policyName
            }
          : null
      }, { status: 422 });
    }

    const record = await prisma.policyRecord.update({
      where: { id },
      data: {
        reviewedData,
        extractedData: payload.extractedData || existing.extractedData,
        selectedBankSource: payload.selectedBankSource ?? existing.selectedBankSource,
        selectedCompany: payload.selectedCompany ?? existing.selectedCompany,
        selectedServiceCategory: payload.selectedServiceCategory ?? existing.selectedServiceCategory,
        selectedPolicyType: payload.selectedPolicyType ?? existing.selectedPolicyType,
        data: mergedData,
        updatedById: session.userId
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true
          }
        },
        uploadedFile: {
          select: {
            createdAt: true,
            createdBy: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
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
      userId: session.userId,
      organizationId: session.organizationId,
      metadata: { sourceFile: record.sourceFile }
    });

    return Response.json(normalizeRecord(record));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Policy record could not be updated." }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role === "VIEWER") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.policyRecord.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read")
      }
    });

    if (!existing || existing.deletedAt) {
      return Response.json({ error: "Policy record not found." }, { status: 404 });
    }

    // Verify tenant and role permissions
    const isAuthorized = canAccessResource(
      session,
      "delete",
      existing.createdById,
      existing.organizationId
    );

    if (!isAuthorized) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // Perform enterprise Soft Delete
    await prisma.policyRecord.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session.userId
      }
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
      userId: session.userId,
      organizationId: session.organizationId,
      metadata: { sourceFile: existing.sourceFile }
    });

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Policy record could not be deleted." }, { status: 500 });
  }
}
