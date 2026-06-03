import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { normalizeProfilePhone, sanitizeCustomerProfilePayload, serializeCustomerProfile } from "@/lib/customer-profile-utils";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await requireSession(request);
    if (user.response) return user.response;

    const { searchParams } = new URL(request.url);
    const phone = normalizeProfilePhone(searchParams.get("phone") || "");
    const tenantFilter = getTenantFilter(user, "read");
    if (!phone) {
      const profiles = await prisma.customerProfile.findMany({
        where: tenantFilter,
        orderBy: { updatedAt: "desc" },
        take: 500,
        include: {
          createdBy: { select: { name: true, email: true } },
          updatedBy: { select: { name: true, email: true } }
        }
      });
      const serialized = profiles.map(serializeCustomerProfile);
      const filtered = filterProfiles(serialized, searchParams);
      return NextResponse.json({
        profiles: filtered,
        counters: buildCounters(serialized),
        filterOptions: {
          assignedTo: unique(serialized.map((profile) => profile.assignedTo)),
          lobs: unique(serialized.flatMap((profile) => profile.selectedLOBs || []))
        },
        policyMatches: []
      });
    }

    const profiles = await prisma.customerProfile.findMany({
      where: {
        ...tenantFilter,
        phone: { contains: phone }
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } }
      }
    });

    const serializedProfiles = profiles.map(serializeCustomerProfile);

    return NextResponse.json({
      profiles: serializedProfiles,
      policyMatches: []
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to search customer profiles." }, { status: 500 });
  }
}

function filterProfiles(profiles, searchParams) {
  const status = searchParams.get("status") || "";
  const assignedTo = String(searchParams.get("assignedTo") || "").toLowerCase();
  const lob = searchParams.get("lob") || "";
  const followUpDate = searchParams.get("followUpDate") || "";
  const query = String(searchParams.get("q") || "").toLowerCase();

  return profiles.filter((profile) => {
    if (status && profile.status !== status) return false;
    if (assignedTo && !String(profile.assignedTo || "").toLowerCase().includes(assignedTo)) return false;
    if (lob && !(profile.selectedLOBs || []).includes(lob)) return false;
    if (followUpDate) {
      const next = profile.nextFollowUpDate ? new Date(profile.nextFollowUpDate).toISOString().slice(0, 10) : "";
      const legacy = profile.followUpDate ? new Date(profile.followUpDate).toISOString().slice(0, 10) : "";
      if (next !== followUpDate && legacy !== followUpDate) return false;
    }
    if (query) {
      const haystack = `${profile.name} ${profile.phone}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function buildCounters(profiles) {
  return {
    totalProfiles: profiles.length,
    newLeads: profiles.filter((profile) => profile.status === "New Lead").length,
    followUpRequired: profiles.filter((profile) => profile.status === "Follow-up Required").length,
    interested: profiles.filter((profile) => profile.status === "Interested").length,
    converted: profiles.filter((profile) => profile.status === "Converted" || profile.convertedToCustomer).length,
    lost: profiles.filter((profile) => profile.status === "Lost").length
  };
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export async function POST(request) {
  try {
    const user = await requireSession(request);
    if (user.response) return user.response;
    if (user.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = sanitizeCustomerProfilePayload(body);

    const actorId = user.userId || user.id;
    const record = await prisma.customerProfile.create({
      data: {
        ...data,
        name: data.name || "Unnamed Customer",
        organizationId: user.organizationId,
        createdById: actorId,
        updatedById: actorId
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } }
      }
    });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "CUSTOMER_PROFILE_CREATE",
      entityType: "CustomerProfile",
      entityId: record.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: user.organizationId,
      metadata: { phone: record.phone, selectedLOBs: record.selectedLOBs }
    });

    return NextResponse.json(serializeCustomerProfile(record), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer profile could not be saved." }, { status: 500 });
  }
}

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session) return { response: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  return session;
}
