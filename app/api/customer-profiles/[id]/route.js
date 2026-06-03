import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { canAccessResource, getTenantFilter } from "@/lib/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { sanitizeCustomerProfilePayload, serializeCustomerProfile } from "@/lib/customer-profile-utils";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const profile = await prisma.customerProfile.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read")
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } }
      }
    });

    if (!profile || profile.deletedAt) {
      return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });
    }

    return NextResponse.json(serializeCustomerProfile(profile));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer profile could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session || session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.customerProfile.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "write")
      }
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Customer profile not found." }, { status: 404 });
    }

    if (!canAccessResource(session, "write", existing.createdById, existing.organizationId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const data = sanitizeCustomerProfilePayload(await request.json());

    const actorId = session.userId || session.id;
    const profile = await prisma.customerProfile.update({
      where: { id },
      data: {
        ...data,
        name: data.name || "Unnamed Customer",
        updatedById: actorId
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } }
      }
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CUSTOMER_PROFILE_UPDATE",
      entityType: "CustomerProfile",
      entityId: profile.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { phone: profile.phone, selectedLOBs: profile.selectedLOBs }
    });

    return NextResponse.json(serializeCustomerProfile(profile));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer profile could not be updated." }, { status: 500 });
  }
}
