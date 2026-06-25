import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import {
  canDeleteEndorsement,
  canWriteEndorsement,
  endorsementInclude,
  getEndorsementWhere,
  requireEndorsementSession,
  sanitizeEndorsementPayload,
  serializeEndorsement,
} from "../utils";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const auth = await requireEndorsementSession(request);
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const record = await prisma.endorsement.findFirst({
      where: { id, ...getEndorsementWhere(session, "read") },
      include: endorsementInclude,
    });

    if (!record) return NextResponse.json({ error: "Endorsement not found." }, { status: 404 });
    return NextResponse.json(serializeEndorsement(record));
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Endorsement could not be loaded.") },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireEndorsementSession(request, true);
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const existing = await prisma.endorsement.findFirst({
      where: { id, ...getEndorsementWhere(session, "read") },
    });
    if (!existing) return NextResponse.json({ error: "Endorsement not found." }, { status: 404 });
    if (!canWriteEndorsement(session, existing))
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const payload = await request.json();
    const data = sanitizeEndorsementPayload(payload);
    if (!data.insuredName || !data.endorsementType) {
      return NextResponse.json({ error: "Insured name and endorsement type are required." }, { status: 422 });
    }

    const actorId = session.userId || session.id || null;
    await prisma.$transaction(async (tx) => {
      await tx.endorsement.update({
        where: { id },
        data: {
          ...data,
          endorsementNo: data.endorsementNo || existing.endorsementNo,
          updatedById: actorId,
        },
      });

      await syncDocument(
        tx,
        id,
        "Generated Letter",
        data.generatedLetterPdfUrl,
        data.generatedLetterFileName,
        actorId,
      );
      await syncDocument(
        tx,
        id,
        "Insurance Company Letter",
        data.insuranceCompanyLetterPdfUrl,
        data.insuranceCompanyLetterFileName,
        actorId,
        data.remark,
      );
    });

    const record = await prisma.endorsement.findUnique({
      where: { id },
      include: endorsementInclude,
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "ENDORSEMENT_UPDATE",
      entityType: "Endorsement",
      entityId: id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { endorsementNo: record.endorsementNo, oldStatus: existing.status, newStatus: record.status },
    });

    return NextResponse.json(serializeEndorsement(record));
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Endorsement could not be updated.") },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireEndorsementSession(request, true);
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const existing = await prisma.endorsement.findFirst({
      where: { id, ...getEndorsementWhere(session, "read") },
    });
    if (!existing) return NextResponse.json({ error: "Endorsement not found." }, { status: 404 });
    if (!canDeleteEndorsement(session, existing)) {
      return NextResponse.json({ error: "Only admins can delete draft endorsements." }, { status: 403 });
    }
    if (existing.status !== "Draft") {
      return NextResponse.json({ error: "Only Draft endorsements can be deleted." }, { status: 403 });
    }

    const actorId = session.userId || session.id || null;
    await prisma.endorsement.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
      },
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "ENDORSEMENT_DELETE",
      entityType: "Endorsement",
      entityId: id,
      severity: "WARNING",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { endorsementNo: existing.endorsementNo, policyNo: existing.policyNo },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Endorsement could not be deleted.") },
      { status: 500 },
    );
  }
}

async function syncDocument(tx, endorsementId, documentType, dataUrl, fileName, actorId, remark = null) {
  await tx.endorsementDocument.deleteMany({ where: { endorsementId, documentType } });
  if (!dataUrl) return;
  await tx.endorsementDocument.create({
    data: {
      endorsementId,
      documentType,
      fileName: fileName || `${endorsementId}-${documentType.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      fileType: "application/pdf",
      dataUrl,
      remark,
      uploadedById: actorId,
    },
  });
}
