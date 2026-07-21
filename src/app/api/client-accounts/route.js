import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import {
  normalizeClientPhone,
  sanitizeClientAccountPayload,
  serializeClientAccount,
} from "@/lib/client-accounts/utils";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const session = await requireStaffSession(request);
    if (session.response) return session.response;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const skip = (page - 1) * limit;
    const q = searchParams.get("q") || "";

    const where = {
      ...getTenantFilter(session, "read"),
      deletedAt: null,
    };

    if (q.trim()) {
      const query = q.trim();
      where.OR = [
        { id: isUuid(query) ? query : undefined },
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: normalizeClientPhone(query) || query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { googleEmail: { contains: query, mode: "insensitive" } },
      ].filter((item) => !Object.values(item).includes(undefined));
    }

    const [accounts, total] = await Promise.all([
      prisma.clientAccount.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        include: {
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.clientAccount.count({ where }),
    ]);

    return NextResponse.json({
      profiles: accounts.map(serializeClientAccount),
      accounts: accounts.map(serializeClientAccount),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Failed to search client accounts.") },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const session = await requireStaffSession(request);
    if (session.response) return session.response;
    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = sanitizeClientAccountPayload(await request.json());
    if (!data.name || !data.phone || normalizeIndianPhone(data.phone) !== data.phone) {
      return NextResponse.json(
        { error: "Please enter client name and a valid 10-digit Indian mobile number." },
        { status: 400 },
      );
    }

    const existing = await prisma.clientAccount.findFirst({
      where: {
        ...getTenantFilter(session, "read"),
        deletedAt: null,
        phone: data.phone,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "This phone number already has a Client ID.",
          profile: serializeClientAccount(existing),
        },
        { status: 409 },
      );
    }

    const actorId = session.userId || session.id;
    const account = await prisma.clientAccount.create({
      data: {
        ...data,
        organizationId: session.organizationId,
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
      action: "CLIENT_ACCOUNT_CREATE",
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

    return NextResponse.json(serializeClientAccount(account), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getUserFacingErrorMessage(error, "Client account could not be saved.") },
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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
