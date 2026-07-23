import { prisma } from "@/lib/db/prisma";
import { normalizeRecord } from "@/lib/records";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { withoutManualRenewalSources } from "@/lib/records/manual-renewal-source";

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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
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
      deletedAt: null,
    };
    Object.assign(where, withoutManualRenewalSources(where));
    const andFilters = [];

    if (q.trim()) {
      const searchTerms = q.trim().toLowerCase();
      const searchKeys = [
        "insuredName",
        "policyNumber",
        "contactNumber",
        "contactPerson",
        "whatsappGroupName",
        "groupName",
        "policyType",
        "vehicleNumber",
        "registrationNumber",
        "engineNumber",
        "chassisNumber",
        "makeModel",
        "rtoLocation",
        "district",
        "tehsil",
        "insuranceCompany",
      ];
      const searchOrs = [];
      for (const key of searchKeys) {
        searchOrs.push({ reviewedData: { path: [key], string_contains: searchTerms, mode: "insensitive" } });
        searchOrs.push({ data: { path: [key], string_contains: searchTerms, mode: "insensitive" } });
      }
      andFilters.push({ OR: searchOrs });
    }

    if (status) {
      andFilters.push({
        OR: [
          { reviewedData: { path: ["status"], equals: status, mode: "insensitive" } },
          { data: { path: ["status"], equals: status, mode: "insensitive" } },
        ],
      });
    }

    if (company) {
      andFilters.push({
        OR: [
          { selectedCompany: { equals: company, mode: "insensitive" } },
          { reviewedData: { path: ["insuranceCompany"], equals: company, mode: "insensitive" } },
          { data: { path: ["insuranceCompany"], equals: company, mode: "insensitive" } },
        ],
      });
    }

    if (policyType) {
      andFilters.push({
        OR: [
          { selectedPolicyType: { equals: policyType, mode: "insensitive" } },
          { reviewedData: { path: ["policyType"], equals: policyType, mode: "insensitive" } },
          { data: { path: ["policyType"], equals: policyType, mode: "insensitive" } },
        ],
      });
    }

    if (assignedTo) {
      andFilters.push({
        OR: [
          { createdBy: { name: { contains: assignedTo, mode: "insensitive" } } },
          { createdBy: { email: { contains: assignedTo, mode: "insensitive" } } },
        ],
      });
    }

    if (andFilters.length > 0) {
      const existingAnd = where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
      where.AND = [...existingAnd, ...andFilters];
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
    };

    const [records, totalCount] = await Promise.all([
      prisma.policyRecord.findMany({
        where,
        orderBy: { savedAt: "desc" },
        select: selectOptions,
        skip,
        take: limit,
      }),
      prisma.policyRecord.count({ where }),
    ]);

    const normalized = records.map(normalizeRecord);

    return Response.json({
      records: normalized,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (error) {
    return Response.json(
      { error: getUserFacingErrorMessage(error, "Failed to retrieve records.") },
      { status: 500 },
    );
  }
}

export async function POST() {
  return Response.json(
    { error: "This legacy writer is retired. Save policies through /api/policy-records." },
    { status: 410 },
  );
}

export async function DELETE() {
  return Response.json(
    { error: "Bulk delete is disabled. Delete policy records one at a time as super admin." },
    { status: 405 },
  );
}
