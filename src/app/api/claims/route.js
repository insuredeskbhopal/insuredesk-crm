import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import {
  claimInclude,
  getClaimWhere,
  requireClaimSession,
  sanitizeClaimDocuments,
  sanitizeClaimPayload,
  serializeClaim,
} from "./utils";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireClaimSession(request);
    if (auth.response) return auth.response;
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10), 1), 500);
    const skip = (page - 1) * limit;

    const where = getClaimWhere(session, "read");
    if (q) {
      where.OR = [
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
      ];
    }

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: claimInclude,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.claim.count({ where }),
    ]);

    return NextResponse.json({
      claims: claims.map(serializeClaim),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Claims could not be loaded." },
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
    if (!data.insuredName || !data.claimNo) {
      return NextResponse.json({ error: "Insured name and claim number are required." }, { status: 422 });
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
      { error: error instanceof Error ? error.message : "Claim could not be saved." },
      { status: 500 },
    );
  }
}
