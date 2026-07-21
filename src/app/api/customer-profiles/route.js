import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter, getCustomerProfileScopedFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import {
  normalizeProfilePhone,
  normalizeIndianPhone,
  sanitizeCustomerProfilePayload,
  serializeCustomerProfile,
} from "@/lib/customer-profiles/utils";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await requireSession(request);
    if (user.response) return user.response;

    const { searchParams } = new URL(request.url);
    const phone = normalizeProfilePhone(searchParams.get("phone") || "");
    const tenantFilter = getTenantFilter(user, "read");
    const actorId = user.userId || user.id;
    const ownProfileFilter = getCustomerProfileScopedFilter(user);

    if (!phone) {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
      const skip = (page - 1) * limit;

      const status = searchParams.get("status") || "";
      const createdBy = searchParams.get("createdBy") || searchParams.get("assignedTo") || "";
      const createdById = searchParams.get("createdById") || "";
      const lob = searchParams.get("lob") || "";
      const followUpDate = searchParams.get("followUpDate") || "";
      const q = searchParams.get("q") || "";
      const summaryOnly = searchParams.get("summaryOnly") === "true";

      const where = {
        ...ownProfileFilter,
        deletedAt: null,
      };

      const andFilters = [];

      if (status) {
        if (status === "Converted") {
          andFilters.push({
            OR: [{ status: "Converted" }, { convertedToCustomer: true }],
          });
        } else {
          where.status = status;
        }
      }

      if (createdBy) {
        andFilters.push({
          OR: [
            { createdBy: { name: { contains: createdBy, mode: "insensitive" } } },
            { createdBy: { email: { contains: createdBy, mode: "insensitive" } } },
            { assignedTo: { contains: createdBy, mode: "insensitive" } },
          ],
        });
      }

      if (createdById === "unassigned") {
        where.id = "00000000-0000-0000-0000-000000000000";
      } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(createdById)) {
        where.createdById = createdById;
      }

      if (lob) {
        where.selectedLOBs = { array_contains: lob };
      }

      if (followUpDate) {
        const start = new Date(`${followUpDate}T00:00:00.000Z`);
        const end = new Date(`${followUpDate}T23:59:59.999Z`);
        andFilters.push({
          OR: [{ nextFollowUpDate: { gte: start, lte: end } }, { followUpDate: { gte: start, lte: end } }],
        });
      }

      if (q) {
        andFilters.push({
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        });
      }

      if (andFilters.length > 0) {
        where.AND = andFilters;
      }

      if (summaryOnly) {
        const counts = await prisma.customerProfile.groupBy({
          by: ["status", "convertedToCustomer"],
          where: {
            ...ownProfileFilter,
            deletedAt: null,
          },
          _count: { id: true },
        });
        return NextResponse.json({ counters: buildProfileCounters(counts) });
      }

      // Fetch paginated profiles and total counts in parallel
      const lobOptionsQuery = buildCustomerProfileLobOptionsQuery(
        ownProfileFilter,
        user.role === "SUPER_ADMIN" ? null : user.assignedLOBs,
      );
      const [profiles, totalCount, counts, assignedToOptions, lobRows] = await Promise.all([
        prisma.customerProfile.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
          include: {
            createdBy: { select: { name: true, email: true } },
            updatedBy: { select: { name: true, email: true } },
          },
        }),
        prisma.customerProfile.count({ where }),
        prisma.customerProfile.groupBy({
          by: ["status", "convertedToCustomer"],
          where: {
            ...ownProfileFilter,
            deletedAt: null,
          },
          _count: {
            id: true,
          },
        }),
        prisma.customerProfile.findMany({
          where: {
            ...ownProfileFilter,
            deletedAt: null,
          },
          select: {
            assignedTo: true,
            createdBy: { select: { name: true, email: true } },
          },
        }),
        prisma.$queryRawUnsafe(lobOptionsQuery.sql, ...lobOptionsQuery.params),
      ]);

      const serialized = profiles.map(serializeCustomerProfile);

      const counters = buildProfileCounters(counts);

      const filterOptions = {
        assignedTo: unique(
          assignedToOptions.map(
            (profile) => profile.createdBy?.name || profile.createdBy?.email || profile.assignedTo,
          ),
        ),
        lobs: unique(lobRows.map((row) => row.lob)),
      };

      return NextResponse.json({
        profiles: serialized,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        counters,
        filterOptions,
        policyMatches: [],
      });
    }

    const [profiles, policyRecords] = await Promise.all([
      prisma.customerProfile.findMany({
        where: {
          ...ownProfileFilter,
          phone: { contains: phone },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
        include: {
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.policyRecord.findMany({
        where: {
          ...tenantFilter,
          deletedAt: null,
          OR: [
            { reviewedData: { path: ["contactNumber"], string_contains: phone } },
            { reviewedData: { path: ["Contact No."], string_contains: phone } },
            { reviewedData: { path: ["customerMobile"], string_contains: phone } },
            { data: { path: ["contactNumber"], string_contains: phone } },
            { data: { path: ["Contact No."], string_contains: phone } },
            { data: { path: ["customerMobile"], string_contains: phone } },
          ],
        },
        orderBy: { savedAt: "desc" },
        take: 200,
        select: {
          id: true,
          savedAt: true,
          data: true,
          reviewedData: true,
          createdBy: { select: { name: true, email: true } },
        },
      }),
    ]);

    const serializedProfiles = profiles.map(serializeCustomerProfile);
    const claimedByAnotherUser =
      user.role === "SUPER_ADMIN"
        ? null
        : await prisma.customerProfile.findFirst({
            where: {
              ...getCustomerProfileClaimFilter(user),
              phone: { contains: phone },
              NOT: { createdById: actorId },
            },
            select: { id: true },
          });

    if (claimedByAnotherUser && !serializedProfiles.length) {
      return NextResponse.json({
        profiles: [],
        policyMatches: [],
        claimedByAnotherUser: true,
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
          assignedTo: record.createdBy?.name || record.createdBy?.email || "",
          vehicleNumber: payload.vehicleNumber || payload.registrationNumber || "",
          registrationNumber: payload.registrationNumber || "",
          makeModel: payload.makeModel || payload.variant || "",
          engineNumber: payload.engineNumber || "",
          chassisNumber: payload.chassisNumber || "",
          idv: payload.idv || "",
          sumInsured: payload.sumInsured || "",
          startDate: payload.startDate || "",
          expiryDate: payload.expiryDate || "",
          duration: payload.duration || "",
          riskLocation: payload.riskLocation || "",
          district: payload.district || "",
          tehsil: payload.tehsil || "",
          occupancy: payload.occupancy || "",
          validIn: payload.validIn || "",
          description: payload.description || "",
          remark: payload.remark || "",
        };
      })
      .filter((record) => normalizeProfilePhone(record.phone) === phone);

    return NextResponse.json({
      profiles: serializedProfiles,
      policyMatches: claimedByAnotherUser ? [] : policyMatches,
      claimedByAnotherUser: Boolean(claimedByAnotherUser),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Failed to search lead profiles.") },
      { status: 500 },
    );
  }
}

function buildProfileCounters(counts) {
  const counters = {
    totalProfiles: 0,
    newLeads: 0,
    followUpRequired: 0,
    interested: 0,
    converted: 0,
    lost: 0,
  };

  for (const item of counts) {
    const count = item._count.id || 0;
    counters.totalProfiles += count;
    if (item.status === "New Lead") counters.newLeads += count;
    if (item.status === "Follow-up Required") counters.followUpRequired += count;
    if (item.status === "Interested") counters.interested += count;
    if (item.status === "Converted" || item.convertedToCustomer) counters.converted += count;
    if (item.status === "Lost") counters.lost += count;
  }

  return counters;
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
    params,
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
    const creatorLabel = user.name || user.email || "";
    const profileData = {
      ...data,
      assignedTo: data.assignedTo || creatorLabel,
    };
    if (!profileData.phone || normalizeIndianPhone(profileData.phone) !== profileData.phone) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian mobile number (starting with 6-9)." },
        { status: 400 },
      );
    }
    if (profileData.alternatePhone && normalizeIndianPhone(profileData.alternatePhone) !== profileData.alternatePhone) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian mobile number (starting with 6-9) for alternate phone." },
        { status: 400 },
      );
    }

    const existing = await prisma.customerProfile.findFirst({
      where: {
        ...getCustomerProfileClaimFilter(user),
        phone: profileData.phone,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    if (existing) {
      const isOwnLead = existing.createdById === actorId;
      return NextResponse.json(
        {
          error: isOwnLead
            ? "This phone number already exists in your Lead Generation records."
            : "This phone number is already claimed by another user in Lead Generation.",
          profile: isOwnLead ? serializeCustomerProfile(existing) : null,
          claimedByAnotherUser: !isOwnLead,
        },
        { status: 409 },
      );
    }

    const record = await prisma.customerProfile.create({
      data: {
        ...profileData,
        name: profileData.name || "Unnamed Customer",
        organizationId: user.organizationId,
        createdById: actorId,
        updatedById: actorId,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
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
      metadata: { phone: record.phone, selectedLOBs: record.selectedLOBs },
    });

    return NextResponse.json(serializeCustomerProfile(record), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Customer profile could not be saved.") },
      { status: 500 },
    );
  }
}

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session)
    return { response: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  return session;
}

function getCustomerProfileClaimFilter(user) {
  const filter = {
    deletedAt: null,
  };
  if (user.organizationId) {
    filter.organizationId = user.organizationId;
  }
  return filter;
}
