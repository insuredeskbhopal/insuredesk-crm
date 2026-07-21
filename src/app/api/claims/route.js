import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import {
  claimInclude,
  claimListSelect,
  getClaimWhere,
  requireClaimSession,
  sanitizeClaimDocuments,
  sanitizeClaimPayload,
  serializeClaim,
  serializeClaimSummary,
} from "./utils";

export const runtime = "nodejs";

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

    const [claims, total, statusCounts, followUpCount] = await Promise.all([
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
      prisma.claim.groupBy({
        by: ["claimStatus"],
        where: baseWhere,
        _count: { id: true },
      }),
      prisma.claim.count({
        where: {
          ...baseWhere,
          OR: [
            { claimStatus: { equals: "Follow Up", mode: "insensitive" } },
            { followUpDate: { not: null } },
          ],
        },
      }),
    ]);

    const countStatus = (status) =>
      statusCounts.reduce(
        (sum, item) =>
          String(item.claimStatus || "").toLowerCase() === status ? sum + (item._count?.id || 0) : sum,
        0,
      );
    const allCount = statusCounts.reduce((sum, item) => sum + (item._count?.id || 0), 0);

    return NextResponse.json({
      claims: claims.map(serializeClaimSummary),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      filterCounts: {
        all: allCount,
        pending: allCount - countStatus("settled") - countStatus("rejected"),
        open: countStatus("open"),
        "follow-up": followUpCount,
        documents: countStatus("documents pending"),
        settled: countStatus("settled"),
        rejected: countStatus("rejected"),
      },
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

    return NextResponse.json(serializeClaim(claim), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Claim could not be saved. Please try again.") },
      { status: 500 },
    );
  }
}
