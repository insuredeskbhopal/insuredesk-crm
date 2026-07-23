import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";
import { isValidClientEmail, matchesClientAccountIdentity } from "@/lib/client-accounts/utils";
import { generateTemporaryClientMpin, provisionClientMpin } from "@/lib/client-portal/credentials";
import {
  normalizeClientId,
  withClientIdLock,
  withClientIdRequestLock,
  withClientPhoneLock,
  withClientPhoneLocks,
  withPolicyRecordLocks,
} from "@/lib/client-accounts/server";

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
  const phone = mine ? normalizeIndianPhone(searchParams.get("phone") || "") : "";
  const name = mine ? searchParams.get("name")?.trim() : "";
  const sharedTenantIdentityPoll = Boolean(mine && !allMine && session.organizationId && (phone || name));
  const where = {
    module: MODULE,
    ...(session.organizationId ? { organizationId: session.organizationId } : {}),
    ...(mine && !sharedTenantIdentityPoll ? { createdById: actorId } : {}),
  };

  if (mine) {
    if (phone) where.customerMobile = phone;
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
      suggestions: !mine && OPEN_STATUSES.includes(item.status) ? await findSuggestions(item) : [],
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
  const email =
    String(body.email || "")
      .trim()
      .toLowerCase() || null;
  if (!name || !phone) {
    return NextResponse.json(
      { error: "Client name and a valid 10-digit Indian mobile number are required." },
      { status: 400 },
    );
  }
  if (!isValidClientEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid client email address." }, { status: 400 });
  }

  const actorId = session.userId || session.id;
  const organizationId = await resolveOrganizationId(session);
  const requestedAt = new Date();
  const result = await withClientPhoneLock(organizationId, phone, async (database) => {
    const existing = await database.task.findFirst({
      where: {
        module: MODULE,
        organizationId,
        ...(!organizationId ? { createdById: actorId } : {}),
        customerMobile: phone,
        customerName: { equals: name, mode: "insensitive" },
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return { item: existing, created: false };

    const item = await database.task.create({
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
    return { item, created: true };
  });

  return NextResponse.json(serializeRequest(result.item), { status: result.created ? 201 : 200 });
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
      return NextResponse.json(
        { error: "Only Super Admin can return a request for correction." },
        { status: 403 },
      );
    }
    if (!OPEN_STATUSES.includes(item.status)) {
      return NextResponse.json(
        { error: "Only a pending request can be returned for correction." },
        { status: 409 },
      );
    }
    const note = String(body.note || "").trim();
    if (!note) {
      return NextResponse.json({ error: "A correction note is required." }, { status: 400 });
    }
    const decidedAt = new Date();
    const history = getHistory(item.metadata);
    const transition = await withClientIdRequestLock(item.id, async (tx) => {
      const claim = await tx.task.updateMany({
        where: { id: item.id, status: { in: OPEN_STATUSES } },
        data: { status: "ASSIGNED", updatedById: actorId },
      });
      if (claim.count !== 1) return { conflict: true };

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
      return { task, conflict: false };
    });
    if (transition.conflict) {
      return NextResponse.json(
        { error: "This request changed before the correction was saved." },
        { status: 409 },
      );
    }
    return NextResponse.json(serializeRequest(transition.task));
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
    const email =
      String(body.email || "")
        .trim()
        .toLowerCase() || null;
    if (!name || !phone) {
      return NextResponse.json(
        { error: "Client name and a valid 10-digit Indian mobile number are required." },
        { status: 400 },
      );
    }
    if (!isValidClientEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid client email address." }, { status: 400 });
    }
    const after = { name, phone, email };
    const resubmittedAt = new Date();
    const transition = await withClientPhoneLocks(
      item.organizationId,
      [item.customerMobile, phone],
      (phoneDatabase) =>
        withClientIdRequestLock(
          item.id,
          async (tx) => {
            const current = await tx.task.findFirst({
              where: { id: item.id, module: MODULE, organizationId: item.organizationId },
            });
            if (!current || current.status !== "WAITING_DOCUMENTS") return { conflict: true };
            if (!canResubmit(session, current)) return { forbidden: true };

            const collision = await tx.task.findFirst({
              where: {
                id: { not: current.id },
                module: MODULE,
                organizationId: current.organizationId,
                ...(!current.organizationId ? { createdById: current.createdById } : {}),
                customerMobile: phone,
                customerName: { equals: name, mode: "insensitive" },
                status: { in: ACTIVE_STATUSES },
              },
              select: { id: true },
            });
            if (collision) return { collision: true };

            const claim = await tx.task.updateMany({
              where: { id: current.id, status: "WAITING_DOCUMENTS" },
              data: { status: "ASSIGNED", updatedById: actorId },
            });
            if (claim.count !== 1) return { conflict: true };

            const policyRefs = await tx.policyRecord.findMany({
              where: { clientIdRequestId: current.id, clientIdPending: true, deletedAt: null },
              select: { id: true },
            });
            return withPolicyRecordLocks(
              policyRefs.map((policy) => policy.id),
              async (policyDatabase) => {
                const policies = await policyDatabase.policyRecord.findMany({
                  where: { clientIdRequestId: current.id, clientIdPending: true, deletedAt: null },
                  select: { id: true, data: true, reviewedData: true, extractedData: true },
                });
                for (const policy of policies) {
                  const identityUpdate = {
                    insuredName: name,
                    contactNumber: phone,
                    email: email || "",
                    emailAddress: email || "",
                  };
                  await policyDatabase.policyRecord.update({
                    where: { id: policy.id },
                    data: {
                      data: { ...(policy.data || {}), ...identityUpdate },
                      reviewedData: { ...(policy.reviewedData || policy.data || {}), ...identityUpdate },
                      extractedData: policy.extractedData
                        ? { ...policy.extractedData, ...identityUpdate }
                        : policy.extractedData,
                      clientIdStatus: "PENDING",
                    },
                  });
                }
                const before = requestIdentity(current);
                const task = await policyDatabase.task.update({
                  where: { id: current.id },
                  data: {
                    title: `Client ID requested for ${name}`,
                    customerName: name,
                    customerMobile: phone,
                    status: "OPEN",
                    updatedById: actorId,
                    metadata: {
                      ...(current.metadata || {}),
                      email,
                      workflowStatus: "PENDING",
                      history: [
                        ...getHistory(current.metadata),
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
                return { task, conflict: false };
              },
              tx,
            );
          },
          phoneDatabase,
        ),
    );
    if (transition.forbidden) {
      return NextResponse.json({ error: "You cannot resubmit this request." }, { status: 403 });
    }
    if (transition.collision) {
      return NextResponse.json(
        { error: "Another active Client ID request already exists for this client." },
        { status: 409 },
      );
    }
    if (transition.conflict) {
      return NextResponse.json(
        { error: "This request changed before it could be resubmitted." },
        { status: 409 },
      );
    }
    return NextResponse.json(serializeRequest(transition.task));
  }

  if (session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can resolve Client ID requests." }, { status: 403 });
  }
  if (!OPEN_STATUSES.includes(item.status)) {
    return NextResponse.json(
      { error: "This request must be pending before it can be resolved." },
      { status: 409 },
    );
  }
  let result;
  try {
    result = await withClientPhoneLock(item.organizationId, item.customerMobile, (phoneDatabase) =>
      withClientIdRequestLock(
        item.id,
        async (tx) => {
          const claim = await tx.task.updateMany({
            where: { id: item.id, status: { in: OPEN_STATUSES } },
            data: { status: "ASSIGNED", updatedById: actorId },
          });
          if (claim.count !== 1) {
            return { updated: null, mappedPolicyCount: 0, resolutionConflict: true };
          }

          const policyRefs = await tx.policyRecord.findMany({
            where: { clientIdRequestId: item.id, clientIdPending: true, deletedAt: null },
            select: { id: true },
          });
          return withPolicyRecordLocks(
            policyRefs.map((policy) => policy.id),
            async (policyDatabase) => {
              const policies = await policyDatabase.policyRecord.findMany({
                where: { clientIdRequestId: item.id, clientIdPending: true, deletedAt: null },
                select: { id: true, data: true, reviewedData: true, extractedData: true },
              });
              const finishResolution = async (database, account, resolutionType) => {
                for (const policy of policies) {
                  await database.policyRecord.update({
                    where: { id: policy.id },
                    data: {
                      data: { ...(policy.data || {}), clientId: account.id },
                      reviewedData: { ...(policy.reviewedData || policy.data || {}), clientId: account.id },
                      extractedData: policy.extractedData
                        ? { ...policy.extractedData, clientId: "" }
                        : policy.extractedData,
                      clientIdPending: false,
                      clientIdStatus: "LINKED",
                    },
                  });
                }

                const resolvedTask = await database.task.update({
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
                return {
                  updated: resolvedTask,
                  mappedPolicyCount: policies.length,
                  resolutionConflict: false,
                };
              };

              if (action === "LINK_EXISTING") {
                const clientId = normalizeClientId(body.clientId);
                if (!clientId) throw workflowError("CLIENT_NOT_FOUND");
                return withClientIdLock(
                  clientId,
                  async (clientDatabase) => {
                    const account = await clientDatabase.clientAccount.findFirst({
                      where: { id: clientId, organizationId: item.organizationId, deletedAt: null },
                    });
                    if (!account) throw workflowError("CLIENT_NOT_FOUND");
                    return finishResolution(clientDatabase, account, "LINK_EXISTING");
                  },
                  policyDatabase,
                );
              }

              const existingAccount = await policyDatabase.clientAccount.findFirst({
                where: {
                  organizationId: item.organizationId,
                  deletedAt: null,
                  phone: item.customerMobile,
                },
              });
              if (existingAccount) {
                return withClientIdLock(
                  existingAccount.id,
                  async (clientDatabase) => {
                    const account = await clientDatabase.clientAccount.findFirst({
                      where: {
                        id: existingAccount.id,
                        organizationId: item.organizationId,
                        deletedAt: null,
                        phone: item.customerMobile,
                      },
                    });
                    if (!account) throw workflowError("CLIENT_NOT_FOUND");
                    if (
                      !matchesClientAccountIdentity(account, {
                        insuredName: item.customerName,
                        contactNumber: item.customerMobile,
                        email: item.metadata?.email,
                      })
                    ) {
                      throw workflowError("IDENTITY_CONFLICT");
                    }
                    return finishResolution(clientDatabase, account, "LINK_EXISTING");
                  },
                  policyDatabase,
                );
              }

              const account = await policyDatabase.clientAccount.create({
                data: {
                  name: item.customerName,
                  phone: item.customerMobile,
                  email: item.metadata?.email || null,
                  organizationId: item.organizationId,
                  createdById: actorId,
                  updatedById: actorId,
                },
              });
              const temporaryMpin = generateTemporaryClientMpin();
              await provisionClientMpin(account, temporaryMpin, policyDatabase);
              return {
                ...(await finishResolution(policyDatabase, account, "CREATE_NEW")),
                temporaryMpin,
              };
            },
            tx,
          );
        },
        phoneDatabase,
      ),
    );
  } catch (error) {
    if (error?.code === "CLIENT_NOT_FOUND") {
      return NextResponse.json(
        { error: "That Client ID was not found in this organization." },
        { status: 404 },
      );
    }
    if (error?.code === "IDENTITY_CONFLICT") {
      return NextResponse.json(
        {
          error:
            "This phone number belongs to a different client identity. Correct the request or explicitly link the intended Client ID.",
        },
        { status: 409 },
      );
    }
    throw error;
  }

  if (result.resolutionConflict) {
    return NextResponse.json({ error: "This Client ID request was already resolved." }, { status: 409 });
  }

  return NextResponse.json({
    ...serializeRequest(result.updated),
    mappedPolicyCount: result.mappedPolicyCount,
    ...(result.temporaryMpin ? { temporaryMpin: result.temporaryMpin } : {}),
  });
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
    workflowStatus:
      metadata.workflowStatus || (item.status === "WAITING_DOCUMENTS" ? "NEEDS_CORRECTION" : "PENDING"),
    correctionNote: metadata.latestCorrectionNote || null,
    history: Array.isArray(metadata.history) ? metadata.history : [],
    createdAt: item.createdAt,
    completedAt: item.completedAt,
  };
}

function getHistory(metadata) {
  return Array.isArray(metadata?.history) ? metadata.history : [];
}

function workflowError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
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
