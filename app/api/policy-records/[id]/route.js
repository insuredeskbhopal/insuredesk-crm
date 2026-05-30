import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/record-validation";
import { verifyJWT } from "@/lib/auth";
import { canAccessResource, getTenantFilter, UserRole } from "@/lib/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";

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
    const actorId = session.userId || session.id || null;
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

    const incomingReviewedData = payload.reviewedData || payload.extractedData || {};
    if (!Object.keys(incomingReviewedData).length) {
      return Response.json({ error: "No policy edits were provided." }, { status: 400 });
    }
    const sourceFile = payload.sourceFile || existing.sourceFile || existing.pdfFileName || existing.data?.sourceFile || "Untitled.pdf";
    const reviewedData = sanitizeRecordPayload({
      ...(existing.reviewedData || existing.extractedData || existing.data || {}),
      ...incomingReviewedData,
      sourceFile
    });
    const mergedData = sanitizeRecordPayload({
      ...(existing.data || {}),
      ...reviewedData,
      sourceFile
    });
    const extractedData = payload.extractedData
      ? sanitizeRecordPayload({
          ...(existing.extractedData || {}),
          ...payload.extractedData,
          sourceFile
        })
      : existing.extractedData;

    const record = await prisma.policyRecord.update({
      where: { id },
      data: {
        reviewedData,
        extractedData,
        selectedBankSource: payload.selectedBankSource ?? existing.selectedBankSource,
        selectedCompany: payload.selectedCompany ?? existing.selectedCompany,
        selectedServiceCategory: payload.selectedServiceCategory ?? existing.selectedServiceCategory,
        selectedPolicyType: payload.selectedPolicyType ?? existing.selectedPolicyType,
        data: mergedData,
        updatedById: actorId
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
      userId: actorId,
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
    const actorId = session.userId || session.id || null;
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
        deletedById: actorId
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
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { sourceFile: existing.sourceFile }
    });

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Policy record could not be deleted." }, { status: 500 });
  }
}
