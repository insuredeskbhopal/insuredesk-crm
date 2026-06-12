import { prisma } from "@/lib/db/prisma";
import { normalizeRecord } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/records/validation";
import { randomUUID } from "node:crypto";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";
    const company = searchParams.get("company") || "";
    const policyType = searchParams.get("policyType") || "";
    const assignedTo = searchParams.get("assignedTo") || "";

    // Retrieve scoped filter for multi-tenancy and RBAC
    const tenantFilter = getTenantFilter(user, "read");

    const where = {
      ...tenantFilter,
      deletedAt: null
    };
    const andFilters = [];

    if (q.trim()) {
      const searchTerms = q.trim().toLowerCase();
      const searchKeys = [
        'insuredName', 'policyNumber', 'contactNumber', 'contactPerson', 
        'whatsappGroupName', 'groupName', 'policyType', 'vehicleNumber', 
        'registrationNumber', 'engineNumber', 'chassisNumber', 'makeModel', 
        'rtoLocation', 'district', 'tehsil', 'insuranceCompany'
      ];
      const searchOrs = [];
      for (const key of searchKeys) {
        searchOrs.push({ reviewedData: { path: [key], string_contains: searchTerms, mode: 'insensitive' } });
        searchOrs.push({ data: { path: [key], string_contains: searchTerms, mode: 'insensitive' } });
      }
      andFilters.push({ OR: searchOrs });
    }

    if (status) {
      andFilters.push({
        OR: [
          { reviewedData: { path: ['status'], equals: status, mode: 'insensitive' } },
          { data: { path: ['status'], equals: status, mode: 'insensitive' } }
        ]
      });
    }

    if (company) {
      andFilters.push({
        OR: [
          { selectedCompany: { equals: company, mode: 'insensitive' } },
          { reviewedData: { path: ['insuranceCompany'], equals: company, mode: 'insensitive' } },
          { data: { path: ['insuranceCompany'], equals: company, mode: 'insensitive' } }
        ]
      });
    }

    if (policyType) {
      andFilters.push({
        OR: [
          { selectedPolicyType: { equals: policyType, mode: 'insensitive' } },
          { reviewedData: { path: ['policyType'], equals: policyType, mode: 'insensitive' } },
          { data: { path: ['policyType'], equals: policyType, mode: 'insensitive' } }
        ]
      });
    }

    if (assignedTo) {
      andFilters.push({
        OR: [
          { createdBy: { name: { contains: assignedTo, mode: 'insensitive' } } },
          { createdBy: { email: { contains: assignedTo, mode: 'insensitive' } } }
        ]
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const selectOptions = {
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
    };

    const [records, totalCount] = await Promise.all([
      prisma.policyRecord.findMany({
        where,
        orderBy: { savedAt: "desc" },
        select: selectOptions,
        skip,
        take: limit
      }),
      prisma.policyRecord.count({ where })
    ]);

    const normalized = records.map(normalizeRecord);

    return Response.json({
      records: normalized,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1
    });
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
        sourceFile: data.sourceFile || "Manual Entry",
        selectedCompany: data.insuranceCompany || "",
        selectedPolicyType: data.policyType || "",
        reviewedData: data,
        extractedData: data,
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

export async function DELETE() {
  return Response.json(
    { error: "Bulk delete is disabled. Delete policy records one at a time as super admin." },
    { status: 405 }
  );
}
