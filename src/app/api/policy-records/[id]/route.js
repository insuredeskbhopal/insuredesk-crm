import { prisma } from "@/lib/db/prisma";
import { normalizeRecord } from "@/lib/records";
import { sanitizeRecordPayload } from "@/lib/records/validation";
import { verifyJWT } from "@/lib/auth";
import { canAccessSharedResource, getTenantFilter, UserRole } from "@/lib/auth/rbac";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { formatReviewValidationError, getReviewValidation } from "@/app/lib/dashboard-helpers";
import insuranceCompanyMaster from "@/lib/master/insurance-companies.cjs";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";
import {
  findActiveClientAccount,
  withClientIdLocks,
  withClientIdRequestLock,
  withClientPhoneLock,
  withPolicyRecordLock,
} from "@/lib/client-accounts/server";

export const runtime = "nodejs";
const { normalizeInsuranceCompanyName } = insuranceCompanyMaster;

export async function PUT(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role === UserRole.VIEWER) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const payload = await request.json();
    const actorId = session.userId || session.id || null;
    const existing = await prisma.policyRecord.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
      },
    });

    if (!existing || existing.deletedAt) {
      return Response.json({ error: "Policy record not found." }, { status: 404 });
    }

    // Verify tenant and role permissions
    const isAuthorized = canAccessSharedResource(session, "write", existing.organizationId);

    if (!isAuthorized) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    const incomingReviewedData = payload.reviewedData || {};
    if (!Object.keys(incomingReviewedData).length) {
      return Response.json({ error: "No policy edits were provided." }, { status: 400 });
    }
    const sourceFile =
      payload.sourceFile ||
      existing.sourceFile ||
      existing.pdfFileName ||
      existing.data?.sourceFile ||
      "Untitled.pdf";
    const reviewedData = sanitizeRecordPayload({
      ...(existing.reviewedData || existing.extractedData || existing.data || {}),
      ...incomingReviewedData,
      sourceFile,
    });
    const mergedData = sanitizeRecordPayload({
      ...(existing.data || {}),
      ...reviewedData,
      sourceFile,
    });
    const extractedData = payload.extractedData
      ? sanitizeRecordPayload({
          ...(existing.extractedData || {}),
          ...payload.extractedData,
          sourceFile,
          clientId: "",
        })
      : existing.extractedData
        ? { ...existing.extractedData, clientId: "" }
        : existing.extractedData;
    if (
      existing.clientIdRequestId &&
      payload.clientIdRequestId &&
      existing.clientIdRequestId !== payload.clientIdRequestId
    ) {
      return Response.json(
        { error: "This policy is already attached to another Client ID request." },
        { status: 409 },
      );
    }
    const policyCustomerName = String(reviewedData.insuredName || reviewedData.customerName || "").trim();
    const policyCustomerMobile = normalizeIndianPhone(
      reviewedData.contactNumber || reviewedData.customerMobile || "",
    );
    let clientIdRequestId = existing.clientIdRequestId || payload.clientIdRequestId || null;
    if (!clientIdRequestId && policyCustomerName && policyCustomerMobile) {
      const matchingActiveRequest = await prisma.task.findFirst({
        where: {
          module: "CLIENT_ID_REQUEST",
          status: { in: ["OPEN", "IN_PROGRESS", "WAITING_DOCUMENTS"] },
          customerName: { equals: policyCustomerName, mode: "insensitive" },
          customerMobile: policyCustomerMobile,
          ...(session.organizationId
            ? { organizationId: session.organizationId }
            : { createdById: existing.createdById }),
        },
        select: { id: true },
      });
      if (matchingActiveRequest && reviewedData.clientId) {
        return Response.json(
          { error: "An active Client ID request already exists for this client and must be resolved first." },
          { status: 409 },
        );
      }
      clientIdRequestId = matchingActiveRequest?.id || null;
    }
    let clientIdPending = false;
    let verifiedClientIdRequest = null;
    if (clientIdRequestId) {
      verifiedClientIdRequest = await prisma.task.findFirst({
        where: {
          id: clientIdRequestId,
          module: "CLIENT_ID_REQUEST",
          status: { in: ["OPEN", "IN_PROGRESS", "WAITING_DOCUMENTS", "COMPLETED"] },
          ...(session.organizationId
            ? { organizationId: session.organizationId }
            : { createdById: existing.createdById }),
        },
      });
      if (!verifiedClientIdRequest || !matchesClientIdRequest(verifiedClientIdRequest, reviewedData)) {
        return Response.json(
          { error: "The Client ID request is invalid or does not match this policy." },
          { status: 400 },
        );
      }
      const resolvedClientId =
        verifiedClientIdRequest.metadata?.resolvedClientId || verifiedClientIdRequest.recordId;
      if (verifiedClientIdRequest.status === "COMPLETED" && resolvedClientId) {
        if (
          reviewedData.clientId &&
          String(reviewedData.clientId).toLowerCase() !== String(resolvedClientId).toLowerCase()
        ) {
          return Response.json({ error: "Use the Client ID approved for this request." }, { status: 409 });
        }
        reviewedData.clientId = resolvedClientId;
        mergedData.clientId = resolvedClientId;
      } else if (verifiedClientIdRequest.status === "COMPLETED") {
        return Response.json({ error: "This Client ID request has no resolved client." }, { status: 409 });
      } else if (reviewedData.clientId) {
        return Response.json(
          { error: "This Client ID request must be resolved before a client can be linked directly." },
          { status: 409 },
        );
      } else {
        clientIdPending = true;
      }
    }
    if (reviewedData.clientId) {
      const activeClient = await findActiveClientAccount(reviewedData.clientId, existing.organizationId);
      if (!activeClient) {
        return Response.json(
          { error: "Select an active Client ID from this organization before saving." },
          { status: 400 },
        );
      }
      reviewedData.clientId = activeClient.id;
      mergedData.clientId = activeClient.id;
    }
    const previousClientIdCandidate = String(
      existing.reviewedData?.clientId || existing.data?.clientId || "",
    ).trim();
    const previousClientId =
      previousClientIdCandidate &&
      (await findActiveClientAccount(previousClientIdCandidate, existing.organizationId))
        ? previousClientIdCandidate.toLowerCase()
        : "";
    if (previousClientId && previousClientId !== reviewedData.clientId && session.role === UserRole.AGENT) {
      return Response.json(
        { error: "A manager or administrator must approve changes to an existing Client ID link." },
        { status: 403 },
      );
    }
    const selectedCompany = normalizeInsuranceCompanyName(
      payload.selectedCompany ?? reviewedData.insuranceCompany ?? existing.selectedCompany,
      existing.rawText || "",
    );
    const validation = getReviewValidation({
      sourceFile,
      extractedData: clientIdPending ? { ...mergedData, clientId: "PENDING_CLIENT_ID" } : mergedData,
      manualFields: Object.keys(mergedData),
    });

    if (validation.contactErrors.length) {
      return Response.json({ error: validation.contactErrors.join(" ") }, { status: 400 });
    }

    if (!validation.valid) {
      return Response.json(
        {
          error: formatReviewValidationError(validation.missingRequired, validation.contactErrors),
          missingRequired: validation.missingRequired,
        },
        { status: 422 },
      );
    }

    const updateRecord = (database) =>
      database.policyRecord.update({
        where: { id },
        data: {
          reviewedData,
          extractedData,
          selectedBankSource: payload.selectedBankSource ?? existing.selectedBankSource,
          selectedCompany,
          selectedServiceCategory: payload.selectedServiceCategory ?? existing.selectedServiceCategory,
          selectedPolicyType: payload.selectedPolicyType ?? existing.selectedPolicyType,
          data: mergedData,
          updatedById: actorId,
          clientIdRequestId: clientIdPending ? verifiedClientIdRequest.id : null,
          clientIdPending,
          clientIdStatus: clientIdPending
            ? verifiedClientIdRequest.status === "WAITING_DOCUMENTS" ||
              existing.clientIdStatus === "ACTION_REQUIRED"
              ? "ACTION_REQUIRED"
              : "PENDING"
            : "LINKED",
        },
        include: {
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
          uploadedFile: {
            select: {
              createdAt: true,
              createdBy: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

    const persistWithClientLocks = (database) =>
      withPolicyRecordLock(
        id,
        async (policyDatabase) => {
          const currentRecord = await policyDatabase.policyRecord.findFirst({
            where: { id, organizationId: existing.organizationId, deletedAt: null },
            select: { updatedAt: true },
          });
          if (!currentRecord) {
            return { error: "Policy record not found.", status: 404 };
          }
          if (
            existing.updatedAt &&
            currentRecord.updatedAt &&
            new Date(existing.updatedAt).getTime() !== new Date(currentRecord.updatedAt).getTime()
          ) {
            return {
              error: "This policy changed while you were editing it. Reload and try again.",
              status: 409,
            };
          }

          return withClientIdLocks(
            [previousClientId, reviewedData.clientId],
            async (lockedDatabase) => {
              if (reviewedData.clientId) {
                const activeClient = await findActiveClientAccount(
                  reviewedData.clientId,
                  existing.organizationId,
                  lockedDatabase,
                );
                if (!activeClient) {
                  return {
                    error: "Select an active Client ID from this organization before saving.",
                    status: 400,
                  };
                }
                reviewedData.clientId = activeClient.id;
                mergedData.clientId = activeClient.id;
              }
              if (
                previousClientId &&
                previousClientId !== reviewedData.clientId &&
                session.role === UserRole.AGENT
              ) {
                return {
                  error: "A manager or administrator must approve changes to an existing Client ID link.",
                  status: 403,
                };
              }
              return { record: await updateRecord(lockedDatabase) };
            },
            policyDatabase,
          );
        },
        database,
      );

    const persistRecord = async (database) => {
      const matchingActiveRequest =
        policyCustomerName && policyCustomerMobile
          ? await database.task.findFirst({
              where: {
                module: "CLIENT_ID_REQUEST",
                status: { in: ["OPEN", "IN_PROGRESS", "WAITING_DOCUMENTS"] },
                customerName: { equals: policyCustomerName, mode: "insensitive" },
                customerMobile: policyCustomerMobile,
                ...(session.organizationId
                  ? { organizationId: session.organizationId }
                  : { createdById: existing.createdById }),
              },
              select: { id: true },
            })
          : null;
      if (matchingActiveRequest && matchingActiveRequest.id !== clientIdRequestId) {
        if (reviewedData.clientId) {
          return {
            error: "An active Client ID request already exists for this client and must be resolved first.",
            status: 409,
          };
        }
        clientIdRequestId = matchingActiveRequest.id;
        clientIdPending = true;
      }

      if (!clientIdRequestId) return persistWithClientLocks(database);

      return withClientIdRequestLock(
        clientIdRequestId,
        async (requestDatabase) => {
          const currentRequest = await requestDatabase.task.findFirst({
            where: {
              id: clientIdRequestId,
              module: "CLIENT_ID_REQUEST",
              ...(session.organizationId
                ? { organizationId: session.organizationId }
                : { createdById: existing.createdById }),
            },
          });
          if (!currentRequest || !matchesClientIdRequest(currentRequest, reviewedData)) {
            return { error: "The Client ID request changed and no longer matches this policy.", status: 409 };
          }
          const resolvedClientId = currentRequest.metadata?.resolvedClientId || currentRequest.recordId;
          if (currentRequest.status === "COMPLETED") {
            if (!resolvedClientId) {
              return { error: "This Client ID request has no resolved client.", status: 409 };
            }
            if (
              reviewedData.clientId &&
              String(reviewedData.clientId).toLowerCase() !== String(resolvedClientId).toLowerCase()
            ) {
              return { error: "Use the Client ID approved for this request.", status: 409 };
            }
            reviewedData.clientId = resolvedClientId;
            mergedData.clientId = resolvedClientId;
            clientIdPending = false;
          } else if (["OPEN", "IN_PROGRESS", "WAITING_DOCUMENTS"].includes(currentRequest.status)) {
            if (reviewedData.clientId) {
              return {
                error: "This Client ID request must be resolved before a client can be linked directly.",
                status: 409,
              };
            }
            clientIdPending = true;
          } else {
            return { error: "This Client ID request is no longer active.", status: 409 };
          }
          verifiedClientIdRequest = currentRequest;
          return persistWithClientLocks(requestDatabase);
        },
        database,
      );
    };

    const updateResult = policyCustomerMobile
      ? await withClientPhoneLock(existing.organizationId, policyCustomerMobile, persistRecord)
      : await persistRecord(prisma);
    if (updateResult.error) {
      return Response.json({ error: updateResult.error }, { status: updateResult.status });
    }
    const record = updateResult.record;

    // Audit log update event
    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "POLICY_RECORD_UPDATE",
      entityType: "PolicyRecord",
      entityId: record.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: {
        sourceFile: record.sourceFile,
        previousClientId: previousClientId || null,
        clientId: reviewedData.clientId || null,
      },
    });

    return Response.json(normalizeRecord(record));
  } catch (error) {
    return Response.json(
      { error: getUserFacingErrorMessage(error, "Policy record could not be updated.") },
      { status: 400 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || session.role !== UserRole.SUPER_ADMIN) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const actorId = session.userId || session.id || null;
    const existing = await prisma.policyRecord.findFirst({
      where: {
        id,
        ...getTenantFilter(session, "read"),
      },
    });

    if (!existing || existing.deletedAt) {
      return Response.json({ error: "Policy record not found." }, { status: 404 });
    }

    // Verify tenant and role permissions
    const isAuthorized = canAccessSharedResource(session, "delete", existing.organizationId);

    if (!isAuthorized) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    let payload = {};
    try {
      payload = await request.json();
    } catch {}
    const policyNumber =
      existing.reviewedData?.policyNumber ||
      existing.data?.policyNumber ||
      existing.extractedData?.policyNumber ||
      "";
    const deleteLabel = policyNumber || id;
    const expectedConfirmation = `DELETE ${deleteLabel}`;

    if (String(payload.confirmation || "").trim() !== expectedConfirmation) {
      return Response.json(
        {
          error: `Type "${expectedConfirmation}" to delete this policy record.`,
          expectedConfirmation,
        },
        { status: 428 },
      );
    }

    // Serialize deletion with portal writes that recheck policy ownership.
    const deleted = await withPolicyRecordLock(id, async (database) => {
      const current = await database.policyRecord.findFirst({
        where: { id, organizationId: existing.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!current) return false;
      await database.policyRecord.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: actorId,
        },
      });
      return true;
    });
    if (!deleted) {
      return Response.json({ error: "Policy record not found." }, { status: 404 });
    }

    // Audit log delete event
    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "POLICY_RECORD_DELETE",
      entityType: "PolicyRecord",
      entityId: id,
      severity: "WARNING",
      source: "API",
      ipAddress,
      userAgent,
      userId: actorId,
      organizationId: session.organizationId,
      metadata: { sourceFile: existing.sourceFile, policyNumber },
    });

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Policy record could not be deleted." }, { status: 500 });
  }
}

function matchesClientIdRequest(request, policyData) {
  const requestPhone = String(request.customerMobile || "")
    .replace(/\D/g, "")
    .slice(-10);
  const policyPhone = String(policyData.contactNumber || policyData.customerMobile || "")
    .replace(/\D/g, "")
    .slice(-10);
  const normalizeName = (value) =>
    String(value || "")
      .replace(/^\s*(?:m\/s|mr|mrs|miss|ms)\.?\s+/i, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
  return (
    requestPhone.length === 10 &&
    requestPhone === policyPhone &&
    normalizeName(request.customerName) === normalizeName(policyData.insuredName)
  );
}
