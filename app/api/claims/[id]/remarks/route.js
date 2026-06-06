import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import {
  canWriteClaim,
  claimInclude,
  getClaimWhere,
  requireClaimSession,
  serializeClaim
} from "../../utils";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const auth = await requireClaimSession(request, true);
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const existing = await prisma.claim.findFirst({
      where: { id, ...getClaimWhere(session, "read") }
    });
    if (!existing) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    if (!canWriteClaim(session, existing)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const payload = await request.json();
    const text = String(payload.text || "").trim();
    if (!text) return NextResponse.json({ error: "Remark is required." }, { status: 422 });

    const followUpDate = parseDate(payload.followUpDate);
    const actorId = session.userId || session.id || null;

    await prisma.$transaction(async (tx) => {
      await tx.claimRemark.create({
        data: {
          claimId: id,
          text,
          followUpDate,
          createdById: actorId
        }
      });

      await tx.claim.update({
        where: { id },
        data: {
          currentRemark: text,
          followUpDate,
          claimStatus: followUpDate ? "Follow Up" : existing.claimStatus,
          updatedById: actorId
        }
      });
    });

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: claimInclude
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CLAIM_REMARK_CREATE",
      entityType: "Claim",
      entityId: id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { claimNo: claim.claimNo, insuredName: claim.insuredName }
    });

    return NextResponse.json(serializeClaim(claim), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Claim remark could not be saved." }, { status: 500 });
  }
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
