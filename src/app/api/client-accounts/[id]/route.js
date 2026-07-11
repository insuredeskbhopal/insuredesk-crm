import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { sanitizeClientAccountPayload, serializeClientAccount } from "@/lib/client-accounts/utils";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const session = await requireStaffSession(request);
    if (session.response) return session.response;

    const { id } = await params;
    const account = await prisma.clientAccount.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
        deletedAt: null,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Client account not found." }, { status: 404 });
    }

    return NextResponse.json(serializeClientAccount(account));
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Client account could not be loaded.") },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireStaffSession(request);
    if (session.response) return session.response;
    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.clientAccount.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client account not found." }, { status: 404 });
    }

    const data = sanitizeClientAccountPayload(await request.json());
    if (!data.name || !data.phone || normalizeIndianPhone(data.phone) !== data.phone) {
      return NextResponse.json(
        { error: "Please enter client name and a valid 10-digit Indian mobile number." },
        { status: 400 },
      );
    }

    const duplicate = await prisma.clientAccount.findFirst({
      where: {
        ...getTenantFilter(session, "read"),
        deletedAt: null,
        phone: data.phone,
        NOT: { id },
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error: "This phone number already has a Client ID.",
          profile: serializeClientAccount(duplicate),
        },
        { status: 409 },
      );
    }

    const actorId = session.userId || session.id;
    const account = await prisma.clientAccount.update({
      where: { id },
      data: {
        ...data,
        updatedById: actorId,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CLIENT_ACCOUNT_UPDATE",
      entityType: "ClientAccount",
      entityId: account.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { phone: account.phone },
    });

    return NextResponse.json(serializeClientAccount(account));
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Client account could not be updated.") },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireStaffSession(request);
    if (session.response) return session.response;
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admin can delete client accounts." }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.clientAccount.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client account not found." }, { status: 404 });
    }

    const actorId = session.userId || session.id;
    const account = await prisma.clientAccount.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: actorId,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CLIENT_ACCOUNT_DELETE",
      entityType: "ClientAccount",
      entityId: account.id,
      severity: "WARNING",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { phone: account.phone },
    });

    return NextResponse.json({ success: true, profile: serializeClientAccount(account) });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Client account could not be deleted.") },
      { status: 500 },
    );
  }
}

async function requireStaffSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session || session.role === "CLIENT") {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }
  return session;
}
