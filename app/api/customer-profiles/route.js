import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { normalizeProfilePhone, sanitizeCustomerProfilePayload, serializeCustomerProfile } from "@/lib/customer-profiles/utils";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await requireSession(request);
    if (user.response) return user.response;

    const { searchParams } = new URL(request.url);
    const phone = normalizeProfilePhone(searchParams.get("phone") || "");
    const tenantFilter = getTenantFilter(user, "read");
    const actorId = user.userId || user.id;
    const ownProfileFilter = getCustomerProfileOwnerFilter(user);

    if (!phone) {
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const skip = (page - 1) * limit;

      const status = searchParams.get("status") || "";
      const assignedTo = searchParams.get("assignedTo") || "";
      const lob = searchParams.get("lob") || "";
      const followUpDate = searchParams.get("followUpDate") || "";
      const q = searchParams.get("q") || "";

      const where = {
        ...ownProfileFilter,
        deletedAt: null
      };

      const andFilters = [];

      if (status) {
        where.status = status;
      }

      if (assignedTo) {
        where.assignedTo = { contains: assignedTo, mode: "insensitive" };
      }

      if (lob) {
        where.selectedLOBs = { array_contains: lob };
      }

      if (followUpDate) {
        const start = new Date(`${followUpDate}T00:00:00.000Z`);
        const end = new Date(`${followUpDate}T23:59:59.999Z`);
        andFilters.push({
          OR: [
            { nextFollowUpDate: { gte: start, lte: end } },
            { followUpDate: { gte: start, lte: end } }
          ]
        });
      }

      if (q) {
        andFilters.push({
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } }
          ]
        });
      }

      if (andFilters.length > 0) {
        where.AND = andFilters;
      }

      // Fetch paginated profiles and total counts in parallel
      const lobOptionsQuery = buildCustomerProfileLobOptionsQuery(ownProfileFilter);
      const [profiles, totalCount, counts, assignedToOptions, lobRows] = await Promise.all([
        prisma.customerProfile.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
          include: {
            createdBy: { select: { name: true, email: true } },
            updatedBy: { select: { name: true, email: true } }
          }
        }),
        prisma.customerProfile.count({ where }),
        prisma.customerProfile.groupBy({
          by: ["status", "convertedToCustomer"],
          where: {
            ...ownProfileFilter,
            deletedAt: null
          },
          _count: {
            id: true
          }
        }),
        prisma.customerProfile.findMany({
          where: {
            ...ownProfileFilter,
            deletedAt: null,
            assignedTo: { not: null }
          },
          distinct: ["assignedTo"],
          orderBy: { assignedTo: "asc" },
          select: {
            assignedTo: true
          }
        }),
        prisma.$queryRawUnsafe(lobOptionsQuery.sql, ...lobOptionsQuery.params)
      ]);

      const serialized = profiles.map(serializeCustomerProfile);

      // Build counters from the aggregated status counts
      let totalProfiles = 0;
      let newLeads = 0;
      let followUpRequired = 0;
      let interested = 0;
      let converted = 0;
      let lost = 0;

      for (const c of counts) {
        const countVal = c._count.id || 0;
        totalProfiles += countVal;
        if (c.status === "New Lead") newLeads += countVal;
        if (c.status === "Follow-up Required") followUpRequired += countVal;
        if (c.status === "Interested") interested += countVal;
        if (c.status === "Converted" || c.convertedToCustomer) converted += countVal;
        if (c.status === "Lost") lost += countVal;
      }

      const counters = {
        totalProfiles,
        newLeads,
        followUpRequired,
        interested,
        converted,
        lost
      };

      const filterOptions = {
        assignedTo: unique(assignedToOptions.map((profile) => profile.assignedTo)),
        lobs: unique(lobRows.map((row) => row.lob))
      };

      return NextResponse.json({
        profiles: serialized,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        counters,
        filterOptions,
        policyMatches: []
      });
    }

    const [profiles, policyRecords] = await Promise.all([
      prisma.customerProfile.findMany({
        where: {
          ...ownProfileFilter,
          phone: { contains: phone }
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: {
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } }
        }
      }),
      prisma.policyRecord.findMany({
        where: {
          ...tenantFilter,
          deletedAt: null,
          OR: [
            { reviewedData: { path: ['contactNumber'], string_contains: phone } },
            { reviewedData: { path: ['Contact No.'], string_contains: phone } },
            { reviewedData: { path: ['customerMobile'], string_contains: phone } },
            { data: { path: ['contactNumber'], string_contains: phone } },
            { data: { path: ['Contact No.'], string_contains: phone } },
            { data: { path: ['customerMobile'], string_contains: phone } }
          ]
        },
        orderBy: { savedAt: "desc" },
        take: 200,
        select: {
          id: true,
          savedAt: true,
          data: true,
          reviewedData: true,
          createdBy: { select: { name: true, email: true } }
        }
      })
    ]);

    const serializedProfiles = profiles.map(serializeCustomerProfile);
    const claimedByAnotherUser = await prisma.customerProfile.findFirst({
      where: {
        ...getCustomerProfileClaimFilter(user),
        phone: { contains: phone },
        NOT: { createdById: actorId }
      },
      select: { id: true }
    });

    if (claimedByAnotherUser && !serializedProfiles.length) {
      return NextResponse.json({
        profiles: [],
        policyMatches: [],
        claimedByAnotherUser: true
      });
    }

    const policyMatches = policyRecords
      .map((record) => {
        const payload = record.reviewedData || record.data || {};
        return {
          id: record.id,
          savedAt: record.savedAt,
          name: payload.insuredName || payload.customerName || "",
          phone: payload.contactNumber || payload.customerMobile || "",
          policyNumber: payload.policyNumber || "",
          policyType: payload.policyType || "",
          insuranceCompany: payload.insuranceCompany || payload.companyName || "",
          remarks: payload.remark || "",
          assignedTo: record.createdBy?.name || record.createdBy?.email || ""
        };
      })
      .filter((record) => normalizeProfilePhone(record.phone) === phone);

    return NextResponse.json({
      profiles: serializedProfiles,
      policyMatches: claimedByAnotherUser ? [] : policyMatches,
      claimedByAnotherUser: Boolean(claimedByAnotherUser)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to search customer profiles." }, { status: 500 });
  }
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function buildCustomerProfileLobOptionsQuery(ownerFilter = {}) {
  const params = [];
  const conditions = ["deleted_at IS NULL"];

  if (ownerFilter.organizationId) {
    params.push(ownerFilter.organizationId);
    conditions.push(`organization_id = $${params.length}::uuid`);
  }

  if (ownerFilter.createdById) {
    params.push(ownerFilter.createdById);
    conditions.push(`created_by_id = $${params.length}::uuid`);
  }

  return {
    sql: `
      SELECT DISTINCT lob
      FROM customer_profiles, jsonb_array_elements_text(selected_lobs) AS lob
      WHERE ${conditions.join(" AND ")}
      ORDER BY lob ASC
    `,
    params
  };
}

export async function POST(request) {
  try {
    const user = await requireSession(request);
    if (user.response) return user.response;
    if (user.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = sanitizeCustomerProfilePayload(body);

    const actorId = user.userId || user.id;
    if (data.phone) {
      const existing = await prisma.customerProfile.findFirst({
        where: {
          ...getCustomerProfileClaimFilter(user),
          phone: { contains: data.phone }
        },
        include: {
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } }
        }
      });

      if (existing) {
        const isOwnLead = existing.createdById === actorId;
        return NextResponse.json(
          {
            error: isOwnLead
              ? "This phone number already exists in your Customer Profiling leads."
              : "This phone number is already claimed by another user in Customer Profiling.",
            profile: isOwnLead ? serializeCustomerProfile(existing) : null,
            claimedByAnotherUser: !isOwnLead
          },
          { status: 409 }
        );
      }
    }

    const record = await prisma.customerProfile.create({
      data: {
        ...data,
        name: data.name || "Unnamed Customer",
        organizationId: user.organizationId,
        createdById: actorId,
        updatedById: actorId
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } }
      }
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CUSTOMER_PROFILE_CREATE",
      entityType: "CustomerProfile",
      entityId: record.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { phone: record.phone, selectedLOBs: record.selectedLOBs }
    });

    return NextResponse.json(serializeCustomerProfile(record), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer profile could not be saved." }, { status: 500 });
  }
}

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session) return { response: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  return session;
}

function getCustomerProfileOwnerFilter(user) {
  const actorId = user.userId || user.id;
  return {
    ...getTenantFilter(user, "read"),
    createdById: actorId
  };
}

function getCustomerProfileClaimFilter(user) {
  const filter = {
    deletedAt: null
  };
  if (user.organizationId) {
    filter.organizationId = user.organizationId;
  }
  return filter;
}
