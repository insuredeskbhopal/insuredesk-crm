import { prisma } from "@/lib/db/prisma";

const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }
    }
    return operation(transaction);
  };

  return typeof database.$transaction === "function" ? database.$transaction(run) : run(database);
}
