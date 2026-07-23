import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { comparePassword, hashPassword } from "@/lib/auth";
import { withClientIdLock } from "@/lib/client-accounts/server";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function verifyClientMpin(customer, mpin) {
  return (await verifyClientMpinWithVersion(customer, mpin)).valid;
}

export async function verifyClientMpinWithVersion(customer, mpin, database = prisma) {
  const cleanMpin = String(mpin || "").replace(/\D/g, "");
  if (cleanMpin.length !== 4) return { valid: false, credentialVersion: 0 };

  return withClientCredentialLock(
    customer.id,
    (lockedDatabase) => verifyClientMpinInDatabase(customer, cleanMpin, lockedDatabase),
    database,
  );
}

export async function withVerifiedClientMpin(customer, mpin, operation, database = prisma) {
  const cleanMpin = String(mpin || "").replace(/\D/g, "");
  if (cleanMpin.length !== 4) return { valid: false, credentialVersion: 0, value: null };

  return withClientCredentialLock(
    customer.id,
    async (lockedDatabase) => {
      const verification = await verifyClientMpinInDatabase(customer, cleanMpin, lockedDatabase);
      if (!verification.valid) return { ...verification, value: null };
      return {
        ...verification,
        value: await operation(lockedDatabase, verification),
      };
    },
    database,
  );
}

async function recordLoginAttempt(database, customer, credential, valid) {
  if (!database.task?.upsert) return;

  const metadata = credential?.metadata || {};
  const failedAttempts = valid ? 0 : Number(metadata.failedAttempts || 0) + 1;
  const nextMetadata = {
    ...metadata,
    failedAttempts,
    lockedUntil:
      !valid && failedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MS).toISOString()
        : null,
    lastLoginAt: valid ? new Date().toISOString() : metadata.lastLoginAt || null,
    lastFailedLoginAt: valid ? metadata.lastFailedLoginAt || null : new Date().toISOString(),
  };

  await database.task.upsert({
    where: { sourceKey: `client-credential:${customer.id}` },
    create: credentialTaskData(customer, nextMetadata),
    update: { metadata: nextMetadata },
  });
}

export async function setClientMpin(customerId, mpin, expectedCredentialVersion) {
  const customer = await prisma.clientAccount.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, organizationId: true, deletedAt: true },
  });
  if (!customer || customer.deletedAt) throw new Error("Client account not found");

  return writeClientMpin(customer, mpin, expectedCredentialVersion);
}

export function generateTemporaryClientMpin() {
  return randomInt(0, 10_000).toString().padStart(4, "0");
}

export function provisionClientMpin(customer, mpin, database = prisma) {
  return writeClientMpin(customer, mpin, undefined, database);
}

async function writeClientMpin(customer, mpin, expectedCredentialVersion, database = prisma) {
  const cleanMpin = String(mpin || "").replace(/\D/g, "");
  if (cleanMpin.length !== 4) throw new Error("MPIN must be a 4-digit code");
  const mpinHash = await hashPassword(cleanMpin);

  return withClientCredentialLock(
    customer.id,
    (credentialDatabase) =>
      withClientIdLock(
        customer.id,
        async (lockedDatabase) => {
          const activeCustomer = await lockedDatabase.clientAccount.findFirst({
            where: {
              id: customer.id,
              organizationId: customer.organizationId ?? null,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (!activeCustomer) throw new Error("Client account not found");

          const existing = await lockedDatabase.task.findUnique({
            where: { sourceKey: `client-credential:${customer.id}` },
            select: { metadata: true },
          });
          const currentCredentialVersion = Number(existing?.metadata?.credentialVersion || 0);
          if (
            expectedCredentialVersion !== undefined &&
            currentCredentialVersion !== Number(expectedCredentialVersion)
          ) {
            const error = new Error("Client MPIN changed during this request.");
            error.code = "CREDENTIAL_VERSION_CONFLICT";
            throw error;
          }
          const credentialVersion = currentCredentialVersion + 1;
          await lockedDatabase.task.upsert({
            where: { sourceKey: `client-credential:${customer.id}` },
            create: credentialTaskData(customer, {
              mpinHash,
              failedAttempts: 0,
              lockedUntil: null,
              credentialVersion,
            }),
            update: {
              metadata: { mpinHash, failedAttempts: 0, lockedUntil: null, credentialVersion },
              completedAt: new Date(),
              archivedAt: new Date(),
            },
          });
          return credentialVersion;
        },
        credentialDatabase,
      ),
    database,
  );
}

export async function getClientCredentialVersion(customerId, database = prisma) {
  if (!database.task?.findUnique) return 0;
  const credential = await database.task.findUnique({
    where: { sourceKey: `client-credential:${customerId}` },
    select: { metadata: true },
  });
  return Number(credential?.metadata?.credentialVersion || 0);
}

export async function withClientCredentialLock(customerId, operation, database = prisma) {
  if (typeof database.$transaction !== "function") {
    if (typeof database.$executeRaw === "function") {
      await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`client-credential:${customerId}`}))`;
    }
    return operation(database);
  }

  return database.$transaction(async (transaction) => {
    if (typeof transaction.$executeRaw === "function") {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`client-credential:${customerId}`}))`;
    }
    return operation(transaction);
  });
}

async function verifyClientMpinInDatabase(customer, cleanMpin, database) {
  const credential = database.task?.findUnique
    ? await database.task.findUnique({
        where: { sourceKey: `client-credential:${customer.id}` },
        select: { metadata: true },
      })
    : null;
  const credentialVersion = Number(credential?.metadata?.credentialVersion || 0);
  const lockedUntil = Date.parse(credential?.metadata?.lockedUntil || "");
  if (Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
    return { valid: false, credentialVersion };
  }

  const valid = Boolean(
    credential?.metadata?.mpinHash && (await comparePassword(cleanMpin, credential.metadata.mpinHash)),
  );
  await recordLoginAttempt(database, customer, credential, valid);
  return { valid, credentialVersion };
}

function credentialTaskData(customer, metadata) {
  return {
    organizationId: customer.organizationId,
    title: "Client portal credential",
    description: "Secured client MPIN credential.",
    type: "SERVICE_REQUEST",
    status: "COMPLETED",
    priority: "MEDIUM",
    module: "CLIENT_PORTAL_SECURITY",
    recordId: customer.id,
    recordLabel: customer.name,
    customerName: customer.name,
    customerMobile: customer.phone,
    sourceKey: `client-credential:${customer.id}`,
    metadata,
    completedAt: new Date(),
    archivedAt: new Date(),
  };
}
