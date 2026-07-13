import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";

export const runtime = "nodejs";

const MODULE = "CLIENT_ID_REQUEST";
const OPEN_STATUSES = ["OPEN", "IN_PROGRESS"];
const ACTIVE_STATUSES = [...OPEN_STATUSES, "WAITING_DOCUMENTS"];

export async function GET(request) {
  const session = await requireStaffSession(request);
  if (session.response) return session.response;

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const allMine = mine && searchParams.get("all") === "1";
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
    take: allMine ? 50 : mine ? 1 : 50,
  });

  const items = await Promise.all(
    requests.map(async (item) => ({
      ...serializeRequest(item),
      suggestions:
        !mine && OPEN_STATUSES.includes(item.status)
          ? await findSuggestions(item)
          : [],
      policies: await findAttachedPolicies(item),
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
      customerName: { equals: name, mode: "insensitive" },
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return NextResponse.json(serializeRequest(existing));

  const requestedAt = new Date();
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
        workflowStatus: "PENDING",
        history: [
          {
            event: "REQUESTED",
            actorId,
            actorName: session.name || session.email || "Agent",
            at: requestedAt.toISOString(),
            identity: { name, phone, email },
          },
        ],
      },
    },
  });

  return NextResponse.json(serializeRequest(item), { status: 201 });
}

export async function PATCH(request) {
  const session = await requireStaffSession(request);
  if (session.response) return session.response;

  const body = await request.json();
  const requestId = String(body.requestId || "");
  const action = body.action;
  const allowedActions = ["LINK_EXISTING", "CREATE_NEW", "NEEDS_CORRECTION", "REJECT", "RESUBMIT"];
  if (!requestId || !allowedActions.includes(action)) {
    return NextResponse.json({ error: "A valid request action is required." }, { status: 400 });
  }

  const item = await prisma.task.findFirst({
    where: {
      id: requestId,
      module: MODULE,
      ...(session.organizationId ? { organizationId: session.organizationId } : {}),
    },
  });
  if (!item) return NextResponse.json({ error: "Client ID request not found." }, { status: 404 });

  const actorId = session.userId || session.id;

  if (["NEEDS_CORRECTION", "REJECT"].includes(action)) {
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admin can return a request for correction." }, { status: 403 });
    }
    if (!OPEN_STATUSES.includes(item.status)) {
      return NextResponse.json({ error: "Only a pending request can be returned for correction." }, { status: 409 });
    }
    const note = String(body.note || "").trim();
    if (!note) {
      return NextResponse.json({ error: "A correction note is required." }, { status: 400 });
    }
    const decidedAt = new Date();
    const history = getHistory(item.metadata);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.policyRecord.updateMany({
        where: { clientIdRequestId: item.id, clientIdPending: true, deletedAt: null },
        data: { clientIdStatus: "ACTION_REQUIRED" },
      });
      const task = await tx.task.update({
        where: { id: item.id },
        data: {
          status: "WAITING_DOCUMENTS",
          updatedById: actorId,
          metadata: {
            ...(item.metadata || {}),
            workflowStatus: "NEEDS_CORRECTION",
            latestCorrectionNote: note,
            history: [
              ...history,
              {
                event: action,
                note,
                actorId,
                actorName: session.name || session.email || "Super Admin",
                at: decidedAt.toISOString(),
                identity: requestIdentity(item),
              },
            ],
          },
        },
      });
      if (item.createdById) {
        await tx.notification.create({
          data: {
            organizationId: item.organizationId,
            userId: item.createdById,
            createdById: actorId,
            category: "SERVICE_REQUEST",
            severity: "WARNING",
            title: "Client ID request needs correction",
            message: note,
            module: MODULE,
            recordId: item.id,
            recordLabel: item.customerName,
            actionUrl: `/operations/client-management?clientIdRequest=${item.id}`,
            sourceKey: `client-id-correction:${item.id}:${decidedAt.getTime()}`,
            metadata: { requestId: item.id, decisionType: action },
          },
        });
      }
      return task;
    });
    return NextResponse.json(serializeRequest(updated));
  }

  if (action === "RESUBMIT") {
    if (!canResubmit(session, item)) {
      return NextResponse.json({ error: "You cannot resubmit this request." }, { status: 403 });
    }
    if (item.status !== "WAITING_DOCUMENTS") {
      return NextResponse.json({ error: "This request is not waiting for correction." }, { status: 409 });
    }
    const name = String(body.name || "").trim();
    const phone = normalizeIndianPhone(body.phone || "");
    const email = String(body.email || "").trim().toLowerCase() || null;
    if (!name || !phone) {
      return NextResponse.json(
        { error: "Client name and a valid 10-digit Indian mobile number are required." },
        { status: 400 },
      );
    }
    const before = requestIdentity(item);
    const after = { name, phone, email };
    const resubmittedAt = new Date();
    const history = getHistory(item.metadata);
    const updated = await prisma.$transaction(async (tx) => {
      const policies = await tx.policyRecord.findMany({
        where: { clientIdRequestId: item.id, clientIdPending: true, deletedAt: null },
        select: { id: true, data: true, reviewedData: true, extractedData: true },
      });
      for (const policy of policies) {
        const identityUpdate = {
          insuredName: name,
          contactNumber: phone,
          email: email || "",
          emailAddress: email || "",
        };
        await tx.policyRecord.update({
          where: { id: policy.id },
          data: {
            data: { ...(policy.data || {}), ...identityUpdate },
            reviewedData: { ...(policy.reviewedData || policy.data || {}), ...identityUpdate },
            extractedData: policy.extractedData ? { ...policy.extractedData, ...identityUpdate } : policy.extractedData,
            clientIdStatus: "PENDING",
          },
        });
      }
      return tx.task.update({
        where: { id: item.id },
        data: {
          title: `Client ID requested for ${name}`,
          customerName: name,
          customerMobile: phone,
          status: "OPEN",
          updatedById: actorId,
          metadata: {
            ...(item.metadata || {}),
            email,
            workflowStatus: "PENDING",
            history: [
              ...history,
              {
                event: "RESUBMITTED",
                actorId,
                actorName: session.name || session.email || "Agent",
                at: resubmittedAt.toISOString(),
                before,
                after,
              },
            ],
          },
        },
      });
    });
    return NextResponse.json(serializeRequest(updated));
  }

  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can resolve Client ID requests." }, { status: 403 });
  }
  if (!OPEN_STATUSES.includes(item.status)) {
    return NextResponse.json({ error: "This request must be pending before it can be resolved." }, { status: 409 });
  }
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
          clientIdStatus: "LINKED",
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
          workflowStatus: "LINKED",
          history: [
            ...getHistory(item.metadata),
            {
              event: resolutionType,
              actorId,
              actorName: session.name || session.email || "Super Admin",
              at: new Date().toISOString(),
              resolvedClientId: account.id,
              resolvedClientName: account.name,
              mappedPolicyCount: policies.length,
            },
          ],
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
    select: {
      id: true,
      sourceFile: true,
      data: true,
      reviewedData: true,
      clientIdPending: true,
      clientIdStatus: true,
    },
    orderBy: { savedAt: "desc" },
  });
  return policies.map((policy) => {
    const data = policy.reviewedData || policy.data || {};
    return {
      id: policy.id,
      policyNumber: data.policyNumber || "",
      sourceFile: policy.sourceFile || data.sourceFile || "Policy PDF",
      clientIdPending: policy.clientIdPending,
      clientIdStatus: policy.clientIdStatus,
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
    workflowStatus: metadata.workflowStatus || (item.status === "WAITING_DOCUMENTS" ? "NEEDS_CORRECTION" : "PENDING"),
    correctionNote: metadata.latestCorrectionNote || null,
    history: Array.isArray(metadata.history) ? metadata.history : [],
    createdAt: item.createdAt,
    completedAt: item.completedAt,
  };
}

function getHistory(metadata) {
  return Array.isArray(metadata?.history) ? metadata.history : [];
}

function requestIdentity(item) {
  return {
    name: item.customerName || "",
    phone: item.customerMobile || "",
    email: item.metadata?.email || null,
  };
}

function canResubmit(session, item) {
  const actorId = session.userId || session.id;
  if (session.role === "VIEWER" || session.role === "CLIENT") return false;
  if (session.role === "SUPER_ADMIN" || item.createdById === actorId) return true;
  return Boolean(session.organizationId && session.organizationId === item.organizationId);
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
