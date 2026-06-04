import { prisma } from "@/lib/db/prisma";

/**
 * Creates an immutable audit log entry in the database.
 * Does not throw on write errors to avoid blocking core user transactions.
 * 
 * @param {object} logData Audit logging inputs
 * @param {string} logData.action The audited event action description
 * @param {string} logData.entityType Affected schema entity (e.g. 'UploadedFile', 'User')
 * @param {string} [logData.entityId] Optional ID of the affected entity
 * @param {'INFO' | 'WARNING' | 'CRITICAL'} [logData.severity] Event severity level
 * @param {'API' | 'USER_ACTION' | 'AI_PIPELINE' | 'SYSTEM' | 'AUTH'} [logData.source] Log source categorization
 * @param {string} [logData.ipAddress] Client IP address
 * @param {string} [logData.userAgent] Client browser/tool agent string
 * @param {object} [logData.metadata] Rich structured context data
 * @param {string} [logData.userId] Performing user ID
 * @param {string} [logData.organizationId] Performing tenant organization ID
 */
export async function logAudit({
  action,
  entityType,
  entityId = null,
  severity = "INFO",
  source = "USER_ACTION",
  ipAddress = null,
  userAgent = null,
  metadata = null,
  userId = null,
  organizationId = null,
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        severity,
        source,
        ipAddress,
        userAgent,
        metadata: metadata ? metadata : undefined,
        userId,
        organizationId,
      },
    });
  } catch (error) {
    console.error("FAILED TO WRITE AUDIT LOG EVENT:", error);
    return null;
  }
}

/**
 * Utility to extract IP address and User Agent headers safely from Next.js requests.
 * 
 * @param {Request} request Next.js request object
 * @returns {{ ipAddress: string|null, userAgent: string|null }}
 */
export function getAuditMetadata(request) {
  if (!request || !request.headers) {
    return { ipAddress: null, userAgent: null };
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded 
    ? forwarded.split(",")[0].trim() 
    : request.headers.get("x-real-ip") || null;

  const userAgent = request.headers.get("user-agent") || null;

  return { ipAddress, userAgent };
}
