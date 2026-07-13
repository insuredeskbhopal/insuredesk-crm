import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";

export const runtime = "nodejs";

const MODULE = "CLIENT_ID_REQUEST";
const OPEN_STATUSES = ["OPEN", "IN_PROGRESS"];

export async function GET(request) {
  const session = await requireStaffSession(request);
  if (session.response) return session.response;

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  if (!mine && session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can review Client ID requests." }, { status: 403 });
  }

  const actorId = session.userId || session.id;
  const where = {
    module: MODULE,
    ...(session.organizationId ? { organizationId: session.organizationId } : {}),
    ...(mine ? { createdById: actorId } : {}),
  };

  if (mine) {
    const phone = normalizeIndianPhone(searchParams.get("phone") || "");
    if (phone) where.customerMobile = phone;
    const name = searchParams.get("name")?.trim();
    if (name) where.customerName = { equals: name, mode: "insensitive" };
  }

  const requests = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: mine ? 1 : 50,
  });

  const items = await Promise.all(
    requests.map(async (item) => ({
      ...serializeRequest(item),
      suggestions:
        !mine && OPEN_STATUSES.includes(item.status)
          ? await findSuggestions(item)
          : [],
      policies: !mine ? await findAttachedPolicies(item) : [],
    })),
  );

  return NextResponse.json({ requests: items });
}

export async function POST(request) {
  const session = await requireStaffSession(request);
  if (session.response) return session.response;
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await request.json();
  const name = String(body.name || "").trim();
  const phone = normalizeIndianPhone(body.phone || "");
  const email = String(body.email || "").trim().toLowerCase() || null;
  if (!name || !phone) {
    return NextResponse.json(
      { error: "Client name and a valid 10-digit Indian mobile number are required." },
      { status: 400 },
    );
  }

  const actorId = session.userId || session.id;
  const organizationId = await resolveOrganizationId(session);
  const existing = await prisma.task.findFirst({
    where: {
      module: MODULE,
      organizationId,
      createdById: actorId,
      customerMobile: phone,
      status: { in: OPEN_STATUSES },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return NextResponse.json(serializeRequest(existing));

  const item = await prisma.task.create({
    data: {
      organizationId,
      createdById: actorId,
      updatedById: actorId,
      title: `Client ID requested for ${name}`,
      description: "Agent could not find a matching client profile during policy processing.",
      type: "SERVICE_REQUEST",
      status: "OPEN",
      priority: "HIGH",
      module: MODULE,
      customerName: name,
      customerMobile: phone,
      metadata: {
        email,
        requestedByName: session.name || null,
        requestedByEmail: session.email || null,
      },
    },
  });

  return NextResponse.json(serializeRequest(item), { status: 201 });
}

export async function PATCH(request) {
  const session = await requireStaffSession(request);
  if (session.response) return session.response;
  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can resolve Client ID requests." }, { status: 403 });
  }

  const body = await request.json();
  const requestId = String(body.requestId || "");
  const action = body.action;
  if (!requestId || !["LINK_EXISTING", "CREATE_NEW"].includes(action)) {
    return NextResponse.json({ error: "A valid request and resolution action are required." }, { status: 400 });
  }

  const item = await prisma.task.findFirst({
    where: {
      id: requestId,
      module: MODULE,
      ...(session.organizationId ? { organizationId: session.organizationId } : {}),
    },
  });
  if (!item) return NextResponse.json({ error: "Client ID request not found." }, { status: 404 });
  if (!OPEN_STATUSES.includes(item.status)) {
    return NextResponse.json({ error: "This request has already been resolved." }, { status: 409 });
  }

  const actorId = session.userId || session.id;
  let account;
  let resolutionType = action;

  if (action === "LINK_EXISTING") {
    account = await prisma.clientAccount.findFirst({
      where: {
        id: String(body.clientId || ""),
        organizationId: item.organizationId,
        deletedAt: null,
      },
    });
    if (!account) {
      return NextResponse.json({ error: "That Client ID was not found in this organization." }, { status: 404 });
    }
  } else {
    account = await prisma.clientAccount.findFirst({
      where: {
        organizationId: item.organizationId,
        deletedAt: null,
        phone: item.customerMobile,
      },
    });
    if (account) {
      resolutionType = "LINK_EXISTING";
    } else {
      account = await prisma.clientAccount.create({
        data: {
          name: item.customerName,
          phone: item.customerMobile,
          email: item.metadata?.email || null,
          organizationId: item.organizationId,
          createdById: actorId,
          updatedById: actorId,
        },
      });
    }
  }

  const { updated, mappedPolicyCount } = await prisma.$transaction(async (tx) => {
    const policies = await tx.policyRecord.findMany({
      where: { clientIdRequestId: item.id, clientIdPending: true, deletedAt: null },
      select: { id: true, data: true, reviewedData: true, extractedData: true },
    });
    for (const policy of policies) {
      await tx.policyRecord.update({
        where: { id: policy.id },
        data: {
          data: { ...(policy.data || {}), clientId: account.id },
          reviewedData: { ...(policy.reviewedData || policy.data || {}), clientId: account.id },
          extractedData: policy.extractedData
            ? { ...policy.extractedData, clientId: account.id }
            : policy.extractedData,
          clientIdPending: false,
        },
      });
    }

    const resolvedTask = await tx.task.update({
      where: { id: item.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        updatedById: actorId,
        recordId: account.id,
        recordLabel: account.name,
        metadata: {
          ...(item.metadata || {}),
          resolvedClientId: account.id,
          resolvedClientName: account.name,
          resolutionType,
          resolvedByName: session.name || null,
          mappedPolicyCount: policies.length,
        },
      },
    });
    return { updated: resolvedTask, mappedPolicyCount: policies.length };
  });

  return NextResponse.json({ ...serializeRequest(updated), mappedPolicyCount });
}

async function findSuggestions(item) {
  const email = item.metadata?.email;
  const or = [
    { phone: item.customerMobile },
    ...(email ? [{ email: { equals: email, mode: "insensitive" } }] : []),
    ...(item.customerName ? [{ name: { contains: item.customerName, mode: "insensitive" } }] : []),
  ];
  return prisma.clientAccount.findMany({
    where: {
      organizationId: item.organizationId,
      deletedAt: null,
      OR: or,
    },
    select: { id: true, name: true, phone: true, email: true },
    take: 5,
    orderBy: { updatedAt: "desc" },
  });
}

async function findAttachedPolicies(item) {
  const policies = await prisma.policyRecord.findMany({
    where: { clientIdRequestId: item.id, deletedAt: null },
    select: { id: true, sourceFile: true, data: true, reviewedData: true, clientIdPending: true },
    orderBy: { savedAt: "desc" },
  });
  return policies.map((policy) => {
    const data = policy.reviewedData || policy.data || {};
    return {
      id: policy.id,
      policyNumber: data.policyNumber || "",
      sourceFile: policy.sourceFile || data.sourceFile || "Policy PDF",
      clientIdPending: policy.clientIdPending,
    };
  });
}

function serializeRequest(item) {
  const metadata = item.metadata || {};
  return {
    id: item.id,
    status: item.status,
    name: item.customerName,
    phone: item.customerMobile,
    email: metadata.email || null,
    requestedByName: metadata.requestedByName || null,
    requestedByEmail: metadata.requestedByEmail || null,
    resolvedClientId: metadata.resolvedClientId || item.recordId || null,
    resolvedClientName: metadata.resolvedClientName || item.recordLabel || null,
    resolutionType: metadata.resolutionType || null,
    createdAt: item.createdAt,
    completedAt: item.completedAt,
  };
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

async function resolveOrganizationId(session) {
  if (session.organizationId) return session.organizationId;
  const actorId = session.userId || session.id;
  if (!actorId) return null;
  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { organizationId: true },
  });
  return user?.organizationId || null;
}
