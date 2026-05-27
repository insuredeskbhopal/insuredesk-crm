import { prisma } from "@/lib/prisma";
import { securityHeaders } from "@/lib/security";
import { verifyJWT } from "@/lib/auth";
import { canAccessResource, getTenantFilter } from "@/lib/rbac";
import { getLocalPhysicalPath, getSignedUrl } from "@/lib/storage";
import { downloadGoogleDriveFile } from "@/lib/google-drive-storage";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import { NextResponse } from "next/server";
import fs from "fs/promises";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const token = _request.cookies.get("token")?.value;
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await verifyJWT(token);
  if (!session) {
    return Response.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const { id } = await params;

  // Retrieve policy record including linked upload file metadata
  const record = await prisma.policyRecord.findFirst({
    where: {
      id,
      ...getTenantFilter(session, "read")
    },
    include: {
      uploadedFile: true
    }
  });

  if (!record || record.deletedAt) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  // Validate tenant context and RBAC permissions
  const isAuthorized = canAccessResource(
    session,
    "read",
    record.createdById,
    record.organizationId
  );

  if (!isAuthorized) {
    return Response.json({ error: "Access denied: record is outside your organization scope" }, { status: 403 });
  }

  const file = record.uploadedFile;
  if (!file || !file.storagePath) {
    return Response.json({ error: "PDF file not found for this record." }, { status: 404 });
  }

  const { ipAddress, userAgent } = getAuditMetadata(_request);

  // If local storage, read and stream back. If cloud, redirect to signed URL
  if (file.storageProvider === "local" || !file.storageProvider) {
    let physicalPath;
    try {
      physicalPath = getLocalPhysicalPath(file.storagePath);
    } catch {
      return Response.json({ error: "Access Denied: Invalid file path" }, { status: 403 });
    }

    try {
      const fileBuffer = await fs.readFile(physicalPath);
      const fileName = sanitizeFileName(record.pdfFileName || file.sourceFile || "policy.pdf");

      // Audit download event
      await logAudit({
        action: "RECORD_PDF_DOWNLOAD",
        entityType: "PolicyRecord",
        entityId: record.id,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: session.userId,
        organizationId: session.organizationId,
        metadata: { filename: fileName }
      });

      return new Response(fileBuffer, {
        headers: {
          ...securityHeaders,
          "Content-Type": file.mimeType || "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": String(fileBuffer.length)
        }
      });
    } catch {
      return Response.json({ error: "File not found on disk storage." }, { status: 404 });
    }
  } else if (file.storageProvider === "google_drive") {
    try {
      const fileBuffer = await downloadGoogleDriveFile(file.storagePath);
      const fileName = sanitizeFileName(record.pdfFileName || file.sourceFile || "policy.pdf");

      await logAudit({
        action: "RECORD_PDF_DOWNLOAD",
        entityType: "PolicyRecord",
        entityId: record.id,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: session.userId,
        organizationId: session.organizationId,
        metadata: { filename: fileName, storageProvider: file.storageProvider }
      });

      return new Response(fileBuffer, {
        headers: {
          ...securityHeaders,
          "Content-Type": file.mimeType || "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": String(fileBuffer.length)
        }
      });
    } catch {
      return Response.json({ error: "File not found in Google Drive storage." }, { status: 404 });
    }
  } else {
    // Cloud storage redirect using signed URLs
    const signedUrl = getSignedUrl(file.storagePath);

    // Audit download redirect event
    await logAudit({
      action: "RECORD_PDF_DOWNLOAD_REDIRECT",
      entityType: "PolicyRecord",
      entityId: record.id,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: session.userId,
      organizationId: session.organizationId,
      metadata: { storagePath: file.storagePath }
    });

    return NextResponse.redirect(signedUrl);
  }
}

function sanitizeFileName(value) {
  return String(value || "policy.pdf")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
