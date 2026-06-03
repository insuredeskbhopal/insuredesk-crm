import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/record-validation";
import { randomUUID } from "node:crypto";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { formatReviewValidationError, getReviewValidation } from "@/app/lib/dashboard-helpers";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");

    // Retrieve scoped filter for multi-tenancy and RBAC
    const tenantFilter = getTenantFilter(user, "read");

    let queryOptions = {
      where: tenantFilter,
      orderBy: { savedAt: "desc" },
      select: {
        id: true,
        savedAt: true,
        data: true,
        reviewedData: true,
        extractedData: true,
        extractionMethod: true,
        extractionQuality: true,
        extractionLog: true,
        confidenceScore: true,
        pdfFileName: true,
        pdfMimeType: true,
        organizationId: true,
        createdById: true,
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
    };

    if (limitParam) {
      const limit = parseInt(limitParam, 10) || 50;
      const page = parseInt(pageParam || "1", 10) || 1;
      queryOptions.take = limit;
      queryOptions.skip = (page - 1) * limit;
    }

    const records = await prisma.policyRecord.findMany(queryOptions);
    return Response.json(records.map(normalizeRecord));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve records." },
      { status: 500 }
    );
  }
}

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

    const payload = await request.json();
    const data = sanitizeRecordPayload(payload);
    const validation = getReviewValidation({
      sourceFile: data.sourceFile,
      extractedData: data
    });

    if (validation.contactErrors.length) {
      return Response.json({ error: validation.contactErrors.join(" ") }, { status: 400 });
    }

    if (!validation.valid) {
      return Response.json({
        error: formatReviewValidationError(validation.missingRequired, validation.contactErrors),
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
    
    const record = await prisma.policyRecord.create({
      data: {
        id: randomUUID(),
        savedAt: new Date(),
        data,
        organizationId: user.organizationId,
        createdById: actorId
      }
    });

    // Record creation audit
    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "RECORD_CREATE",
      entityType: "PolicyRecord",
      entityId: record.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { sourceFile: record.sourceFile }
    });

    return Response.json(normalizeRecord({
      ...record,
      createdBy: { name: user.name, email: user.email }
    }), { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create policy record" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  return Response.json(
    { error: "Bulk delete is disabled. Delete policy records one at a time as super admin." },
    { status: 405 }
  );
}
