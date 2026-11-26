import { prisma } from "@/lib/db/prisma";
import { matchesClientAccountIdentity, normalizeClientCode } from "@/lib/client-accounts/utils";

const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export { normalizeClientCode };

export function normalizeClientId(value) {
  const clientId = String(value || "").trim();
  return CLIENT_ID_PATTERN.test(clientId) ? clientId.toLowerCase() : "";
}

export async function findActiveClientAccount(clientId, organizationId, database = prisma) {
  const id = normalizeClientId(clientId);
  if (!id) return null;

  return database.clientAccount.findFirst({
    where: {
      id,
      organizationId: organizationId ?? null,
      deletedAt: null,
    },
    select: { id: true, name: true, phone: true, email: true, organizationId: true },
  });
}

export async function findActiveClientAccountByIdentifier(identifier, organizationId, database = prisma) {
  const id = normalizeClientId(identifier);
  const clientCode = id ? "" : normalizeClientCode(identifier);
  if (!id && !clientCode) return null;

  return database.clientAccount.findFirst({
    where: {
      ...(id ? { id } : { clientCode }),
      ...(organizationId !== undefined ? { organizationId: organizationId ?? null } : {}),
      deletedAt: null,
    },
    select: {
      id: true,
      clientCode: true,
      name: true,
      phone: true,
      email: true,
      googleEmail: true,
      organizationId: true,
    },
  });
}

export async function generateNextClientCode(database = prisma) {
  if (typeof database?.$queryRaw === "function") {
    const rows = await database.$queryRaw`
      SELECT 'BHQ-' || nextval('"client_account_code_seq"')::text AS code
    `;
    const generated = Array.isArray(rows) ? rows[0]?.code : rows?.code;
    if (generated) return String(generated);
  }
  return `BHQ-${Math.floor(100001 + Math.random() * 899999)}`;
}

export async function findMatchingClientAccountsByPhone(phone, organizationId, database = prisma, include) {
  const where = {
    organizationId: organizationId ?? null,
    deletedAt: null,
    phone,
  };
  if (typeof database?.clientAccount?.findMany === "function") {
    return database.clientAccount.findMany({
      where,
      ...(include ? { include } : {}),
    });
  }
  if (typeof database?.clientAccount?.findFirst === "function") {
    const first = await database.clientAccount.findFirst({
      where,
      ...(include ? { include } : {}),
    });
    return first ? [first] : [];
  }
  return [];
}

export async function createClientAccountWithIdentityCheck(
  database,
  { name, phone, email = null, organizationId = null, actorId = null, allowSharedPhone = false, include } = {},
) {
  const existingAccounts = await findMatchingClientAccountsByPhone(phone, organizationId, database, include);
  const exactMatch = existingAccounts.find((acc) =>
    matchesClientAccountIdentity(acc, {
      insuredName: name,
      contactNumber: phone,
      email,
    }),
  );

  if (exactMatch) {
    return { outcome: "EXISTING_EXACT", account: exactMatch, existingAccounts };
  }

  if (existingAccounts.length > 0 && !allowSharedPhone) {
    return { outcome: "IDENTITY_CONFLICT", account: null, existingAccounts };
  }

  const clientCode = await generateNextClientCode(database);
  const account = await database.clientAccount.create({
    data: {
      clientCode,
      name,
      phone,
      email: email || null,
      organizationId: organizationId ?? null,
      createdById: actorId || null,
      updatedById: actorId || null,
    },
    ...(include ? { include } : {}),
  });

  return { outcome: "CREATED", account, existingAccounts };
}

export async function notifyClientIdUsers({
  database = prisma,
  organizationId = null,
  recipientUserIds = [],
  includeSuperAdmins = false,
  createdById = null,
  category = "SERVICE_REQUEST",
  severity = "INFO",
  title,
  message,
  recordId,
  recordLabel = "",
  actionUrl = "/operations/client-management",
  sourceKey,
  metadata = {},
} = {}) {
  if (!database?.notification || typeof database.notification.create !== "function") return [];

  const targetIds = new Set(recipientUserIds.filter(Boolean));
  if (includeSuperAdmins && typeof database?.user?.findMany === "function") {
    const admins = await database.user.findMany({
      where: {
        organizationId: organizationId ?? null,
        role: "SUPER_ADMIN",
        deletedAt: null,
      },
      select: { id: true },
    });
    for (const admin of admins) {
      if (admin?.id) targetIds.add(admin.id);
    }
  }

  const created = [];
  for (const userId of targetIds) {
    try {
      const notification = await database.notification.create({
        data: {
          organizationId: organizationId ?? null,
          userId,
          createdById: createdById || null,
          category,
          severity,
          title,
          message,
          module: "CLIENT_ID_REQUEST",
          recordId: recordId || null,
          recordLabel: recordLabel || null,
          actionUrl,
          sourceKey: `${sourceKey}:${userId}`,
          metadata,
        },
      });
      created.push(notification);
    } catch (error) {
      if (error?.code !== "P2002") {
        console.warn("Failed to create Client ID notification:", error?.message || error);
      }
    }
  }
  return created;
}

export async function withClientPhoneLock(organizationId, phone, operation, database = prisma) {
  return withClientPhoneLocks(organizationId, [phone], operation, database);
}

export async function withClientPhoneLocks(organizationId, phones, operation, database = prisma) {
  const lockKeys = [...new Set(phones.map((phone) => String(phone || "").trim()).filter(Boolean))]
    .sort()
    .map((phone) => `client-phone:${organizationId ?? "no-organization"}:${phone}`);
  return withAdvisoryLocks(
    lockKeys,
    operation,
    database,
  );
}

export async function withClientIdLocks(clientIds, operation, database = prisma) {
  const lockKeys = [...new Set(clientIds.map(normalizeClientId).filter(Boolean))]
    .sort()
    .map((clientId) => `client-account:${clientId}`);
  return withAdvisoryLocks(lockKeys, operation, database);
}

export async function withClientIdLock(clientId, operation, database = prisma) {
  return withClientIdLocks([clientId], operation, database);
}

export async function withClientIdRequestLock(requestId, operation, database = prisma) {
  const id = String(requestId || "").trim().toLowerCase();
  return withAdvisoryLocks(id ? [`client-id-request:${id}`] : [], operation, database);
}

export async function withPolicyRecordLock(recordId, operation, database = prisma) {
  return withPolicyRecordLocks([recordId], operation, database);
}

export async function withPolicyRecordLocks(recordIds, operation, database = prisma) {
  const lockKeys = [...new Set(recordIds.map((recordId) => String(recordId || "").trim().toLowerCase()).filter(Boolean))]
    .sort()
    .map((recordId) => `policy-record:${recordId}`);
  return withAdvisoryLocks(lockKeys, operation, database);
}

async function withAdvisoryLocks(lockKeys, operation, database) {
  const run = async (transaction) => {
    if (typeof transaction.$executeRaw === "function") {
      for (const lockKey of lockKeys) {
        try {
          await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        } catch {}
      }
    }
    return operation(transaction);
  };

  // If already inside a transaction client (not root prisma), do not re-wrap in $transaction
  if (database && database !== prisma && typeof database.$transaction !== "function") {
    return run(database);
  }

  if (typeof database?.$transaction === "function") {
    return database.$transaction(run, { maxWait: 15000, timeout: 30000 });
  }

  return run(database || prisma);
}
