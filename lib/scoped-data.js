import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";

export const POLICY_RECORD_SELECT = {
  id: true,
  savedAt: true,
  data: true,
  reviewedData: true,
  extractedData: true,
  extractionMethod: true,
  extractionQuality: true,
  extractionLog: true,
  confidenceScore: true,
  pdfFileName: true,
  pdfMimeType: true,
  detectedBankSource: true,
  selectedBankSource: true,
  organizationId: true,
  createdById: true,
  createdBy: {
    select: {
      name: true,
      email: true
    }
  },
  uploadedFile: {
    select: {
      createdAt: true,
      createdBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  }
};

export async function getCurrentSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyJWT(token);
}

export async function loadScopedPolicyRecords(options = {}) {
  const session = await getCurrentSessionFromCookies();
  const tenantFilter = getTenantFilter(session, "read");
  const where = {
    ...tenantFilter,
    ...(options.includeInactive ? {} : { isActivePolicy: true })
  };

  return prisma.policyRecord.findMany({
    where,
    orderBy: { savedAt: "desc" },
    select: options.select || POLICY_RECORD_SELECT
  });
}

export async function loadScopedUploads(options = {}) {
  const session = await getCurrentSessionFromCookies();
  const where = getTenantFilter(session, "read");

  return prisma.uploadedFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...(options.take ? { take: options.take } : {}),
    ...(options.select ? { select: options.select } : {})
  });
}
