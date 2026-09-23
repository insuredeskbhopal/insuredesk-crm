import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import {
  claimsCountsCache,
  CLAIMS_COUNTS_TTL_MS,
  claimInclude,
  claimListSelect,
  getClaimWhere,
  invalidateClaimsCountsCache,
  requireClaimSession,
  sanitizeClaimDocuments,
  sanitizeClaimPayload,
  serializeClaim,
  serializeClaimSummary,
} from "./utils";

export const runtime = "nodejs";

async function getClaimsFilterCounts(session) {
  const cacheKey = session.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : String(session.organizationId || "NONE");
  const cached = claimsCountsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CLAIMS_COUNTS_TTL_MS) {
    return cached.data;
  }

  const rawRows = session.role === "SUPER_ADMIN"
    ? await prisma.$queryRaw`
        SELECT 
          COUNT(*)::int AS "all",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) NOT IN ('settled', 'rejected'))::int AS "pending",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'open')::int AS "open",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'follow up' OR follow_up_date IS NOT NULL)::int AS "followUp",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'documents pending')::int AS "documents",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'settled')::int AS "settled",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'rejected')::int AS "rejected"
        FROM claims
        WHERE deleted_at IS NULL
      `
    : await prisma.$queryRaw`
        SELECT 
          COUNT(*)::int AS "all",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) NOT IN ('settled', 'rejected'))::int AS "pending",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'open')::int AS "open",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'follow up' OR follow_up_date IS NOT NULL)::int AS "followUp",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'documents pending')::int AS "documents",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'settled')::int AS "settled",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(claim_status, '')) = 'rejected')::int AS "rejected"
        FROM claims
        WHERE organization_id = ${session.organizationId}::uuid AND deleted_at IS NULL
      `;

  const raw = rawRows[0] || {};
  const filterCounts = {
    all: raw.all || 0,
    pending: raw.pending || 0,
    open: raw.open || 0,
    "follow-up": raw.followUp || 0,
    documents: raw.documents || 0,
    settled: raw.settled || 0,
    rejected: raw.rejected || 0,
  };

  claimsCountsCache.set(cacheKey, { data: filterCounts, timestamp: Date.now() });
  return filterCounts;
}

export async function GET(request) {
  try {
    const auth = await requireClaimSession(request);
    if (auth.response) return auth.response;
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25", 10) || 25, 1), 100);
    const filter = String(searchParams.get("filter") || "all").toLowerCase();
    const summaryOnly = searchParams.get("summaryOnly") === "true";
    const skip = (page - 1) * limit;

    const baseWhere = getClaimWhere(session, "read");
    const where = { ...baseWhere };
    const andFilters = [];
    if (q) {
      andFilters.push({ OR: [
        { insuredName: { contains: q, mode: "insensitive" } },
        { mobileNo: { contains: q, mode: "insensitive" } },
        { contactPerson: { contains: q, mode: "insensitive" } },
        { policyNo: { contains: q, mode: "insensitive" } },
        { claimNo: { contains: q, mode: "insensitive" } },
        { groupName: { contains: q, mode: "insensitive" } },
        { claimDescription: { contains: q, mode: "insensitive" } },
        { claimType: { contains: q, mode: "insensitive" } },
        { claimStatus: { contains: q, mode: "insensitive" } },
        { currentRemark: { contains: q, mode: "insensitive" } },
      ] });
    }

    if (filter === "pending") {
      andFilters.push({
        NOT: [
          { claimStatus: { equals: "Settled", mode: "insensitive" } },
          { claimStatus: { equals: "Rejected", mode: "insensitive" } },
        ],
      });
    } else if (filter === "open") {
      andFilters.push({ claimStatus: { equals: "Open", mode: "insensitive" } });
    } else if (filter === "follow-up") {
      andFilters.push({
        OR: [
          { claimStatus: { equals: "Follow Up", mode: "insensitive" } },
          { followUpDate: { not: null } },
        ],
      });
    } else if (filter === "documents") {
      andFilters.push({ claimStatus: { equals: "Documents Pending", mode: "insensitive" } });
    } else if (filter === "settled") {
      andFilters.push({ claimStatus: { equals: "Settled", mode: "insensitive" } });
    } else if (filter === "rejected") {
      andFilters.push({ claimStatus: { equals: "Rejected", mode: "insensitive" } });
    }
    if (andFilters.length) where.AND = andFilters;
    const [claims, total, filterCounts] = await Promise.all([
      summaryOnly
        ? Promise.resolve([])
        : prisma.claim.findMany({
            where,
            select: claimListSelect,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
          }),
      summaryOnly ? Promise.resolve(0) : prisma.claim.count({ where }),
      getClaimsFilterCounts(session),
    ]);

    return NextResponse.json({
      claims: claims.map(serializeClaimSummary),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      filterCounts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Claims could not be loaded. Please try again.") },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireClaimSession(request, true);
    if (auth.response) return auth.response;
    const { session } = auth;

    const payload = await request.json();
    const data = sanitizeClaimPayload(payload);
    if (!data.insuredName || !data.mobileNo || !data.policyNo || !data.claimNo || !data.metadata.insuranceCompany) {
      return NextResponse.json(
        { error: "Insured name, mobile number, policy number, insurance company, and claim number are required." },
        { status: 422 },
      );
    }

    const actorId = session.userId || session.id || null;
    const claim = await prisma.claim.create({
      data: {
        ...data,
        organizationId: session.organizationId,
        createdById: actorId,
        updatedById: actorId,
        documents: {
          create: sanitizeClaimDocuments(payload.documents, actorId),
        },
      },
      include: claimInclude,
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CLAIM_CREATE",
      entityType: "Claim",
      entityId: claim.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { claimNo: claim.claimNo, insuredName: claim.insuredName },
    });

    invalidateClaimsCountsCache(session.organizationId);
    return NextResponse.json(serializeClaim(claim), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Claim could not be saved. Please try again.") },
      { status: 500 },
    );
  }
}
