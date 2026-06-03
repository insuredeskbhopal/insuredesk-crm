import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { canAccessResource, getTenantFilter } from "@/lib/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session || session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const insuranceType = String(body.insuranceType || "").trim();
    if (!insuranceType) {
      return NextResponse.json({ error: "Select an insurance type before converting." }, { status: 422 });
    }

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

    const actorId = session.userId || session.id;
    const profile = await prisma.customerProfile.update({
      where: { id },
      data: {
        convertedToCustomer: true,
        status: "Converted",
        updatedById: actorId
      }
    });

    const redirectUrl = `/bulk-upload?profileId=${encodeURIComponent(id)}&insuranceType=${encodeURIComponent(insuranceType)}`;
    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CUSTOMER_PROFILE_CONVERT",
      entityType: "CustomerProfile",
      entityId: profile.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { insuranceType, redirectUrl }
    });

    return NextResponse.json({ id: profile.id, status: profile.status, redirectUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer profile could not be converted." }, { status: 500 });
  }
}
