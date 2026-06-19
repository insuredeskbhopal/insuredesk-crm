import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import {
  canDeleteClaim,
  canWriteClaim,
  claimInclude,
  getClaimWhere,
  requireClaimSession,
  sanitizeClaimDocuments,
  sanitizeClaimPayload,
  serializeClaim,
} from "../utils";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const auth = await requireClaimSession(request);
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const claim = await prisma.claim.findFirst({
      where: { id, ...getClaimWhere(session, "read") },
      include: claimInclude,
    });

    if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    return NextResponse.json(serializeClaim(claim));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Claim could not be loaded." },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireClaimSession(request, true);
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const existing = await prisma.claim.findFirst({
      where: { id, ...getClaimWhere(session, "read") },
    });
    if (!existing) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    if (!canWriteClaim(session, existing))
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const payload = await request.json();
    const data = sanitizeClaimPayload(payload);
    if (!data.insuredName || !data.claimNo) {
      return NextResponse.json({ error: "Insured name and claim number are required." }, { status: 422 });
    }

    const actorId = session.userId || session.id || null;
    await prisma.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id },
        data: {
          ...data,
          updatedById: actorId,
        },
      });

      await tx.claimDocument.deleteMany({ where: { claimId: id } });
      const documents = sanitizeClaimDocuments(payload.documents, actorId);
      if (documents.length) {
        await tx.claimDocument.createMany({
          data: documents.map((document) => ({ ...document, claimId: id })),
        });
      }
    });

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: claimInclude,
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CLAIM_UPDATE",
      entityType: "Claim",
      entityId: id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { claimNo: claim.claimNo, insuredName: claim.insuredName },
    });

    return NextResponse.json(serializeClaim(claim));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Claim could not be updated." },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireClaimSession(request, true);
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const existing = await prisma.claim.findFirst({
      where: { id, ...getClaimWhere(session, "read") },
    });
    if (!existing) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    if (!canDeleteClaim(session, existing))
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const actorId = session.userId || session.id || null;
    await prisma.claim.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
      },
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CLAIM_DELETE",
      entityType: "Claim",
      entityId: id,
      severity: "WARNING",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { claimNo: existing.claimNo, insuredName: existing.insuredName },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Claim could not be deleted." },
      { status: 500 },
    );
  }
}
