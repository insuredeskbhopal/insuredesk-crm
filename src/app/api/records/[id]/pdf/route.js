import { prisma } from "@/lib/db/prisma";
import { securityHeaders } from "@/lib/auth/security";
import { verifyJWT } from "@/lib/auth";
import { canAccessSharedResource, getTenantFilter } from "@/lib/auth/rbac";
import { getLocalPhysicalPath, getSignedUrl } from "@/lib/storage";
import { downloadGoogleDriveFile } from "@/lib/storage/google-drive-storage";
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
      ...getTenantFilter(session, "read"),
    },
    include: {
      uploadedFile: true,
    },
  });

  if (!record || record.deletedAt) {
    return Response.json({ error: "Record not found." }, { status: 404 });
  }

  // Validate tenant context and RBAC permissions
  const isAuthorized = canAccessSharedResource(session, "read", record.organizationId);

  if (!isAuthorized) {
    return Response.json(
      { error: "Access denied: record is outside your organization scope" },
      { status: 403 },
    );
  }

  const url = new URL(_request.url);
  const isView = url.searchParams.get("view") === "true" || url.searchParams.get("disposition") === "inline";
  const dispositionType = isView ? "inline" : "attachment";

  const polNum = record.reviewedData?.policyNumber || record.data?.policyNumber || "";
  const insName = record.reviewedData?.insuredName || record.data?.insuredName || "";
  const standardName = polNum && insName
    ? `${sanitizeFileName(polNum)}_${sanitizeFileName(insName)}.pdf`
    : sanitizeFileName(record.pdfFileName || record.uploadedFile?.sourceFile || "policy.pdf");

  const file = record.uploadedFile;
  const memoryBytes = record.pdfBytes || file?.pdfBytes;

  if (!file || !file.storagePath) {
    if (memoryBytes && memoryBytes.length > 0) {
      return new Response(memoryBytes, {
        headers: {
          ...securityHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `${dispositionType}; filename="${standardName}"`,
          "Content-Length": String(memoryBytes.length),
        },
      });
    }
    return Response.json({ error: "PDF file not found for this record." }, { status: 404 });
  }

  const { ipAddress, userAgent } = getAuditMetadata(_request);

  // If local storage, read and stream back. If cloud, redirect to signed URL
  if (file.storageProvider === "local" || !file.storageProvider) {
    let physicalPath;
    try {
      physicalPath = getLocalPhysicalPath(file.storagePath);
    } catch {
      if (memoryBytes && memoryBytes.length > 0) {
        return new Response(memoryBytes, {
          headers: {
            ...securityHeaders,
            "Content-Type": file.mimeType || "application/pdf",
            "Content-Disposition": `${dispositionType}; filename="${standardName}"`,
            "Content-Length": String(memoryBytes.length),
          },
        });
      }
      return Response.json({ error: "Access Denied: Invalid file path" }, { status: 403 });
    }

    try {
      const fileBuffer = await fs.readFile(physicalPath);

      // Audit download event
      await logAudit({
        action: isView ? "RECORD_PDF_VIEW" : "RECORD_PDF_DOWNLOAD",
        entityType: "PolicyRecord",
        entityId: record.id,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: session.userId,
        organizationId: session.organizationId,
        metadata: { filename: standardName, view: isView },
      });

      return new Response(fileBuffer, {
        headers: {
          ...securityHeaders,
          "Content-Type": file.mimeType || "application/pdf",
          "Content-Disposition": `${dispositionType}; filename="${standardName}"`,
          "Content-Length": String(fileBuffer.length),
        },
      });
    } catch {
      if (memoryBytes && memoryBytes.length > 0) {
        return new Response(memoryBytes, {
          headers: {
            ...securityHeaders,
            "Content-Type": file.mimeType || "application/pdf",
            "Content-Disposition": `${dispositionType}; filename="${standardName}"`,
            "Content-Length": String(memoryBytes.length),
          },
        });
      }
      return Response.json({ error: "File not found on disk storage." }, { status: 404 });
    }
  } else if (file.storageProvider === "google_drive") {
    try {
      const fileBuffer = await downloadGoogleDriveFile(file.storagePath);

      await logAudit({
        action: isView ? "RECORD_PDF_VIEW" : "RECORD_PDF_DOWNLOAD",
        entityType: "PolicyRecord",
        entityId: record.id,
        severity: "INFO",
        source: "API",
        ipAddress,
        userAgent,
        userId: session.userId,
        organizationId: session.organizationId,
        metadata: { filename: standardName, storageProvider: file.storageProvider, view: isView },
      });

      return new Response(fileBuffer, {
        headers: {
          ...securityHeaders,
          "Content-Type": file.mimeType || "application/pdf",
          "Content-Disposition": `${dispositionType}; filename="${standardName}"`,
          "Content-Length": String(fileBuffer.length),
        },
      });
    } catch {
      if (memoryBytes && memoryBytes.length > 0) {
        return new Response(memoryBytes, {
          headers: {
            ...securityHeaders,
            "Content-Type": file.mimeType || "application/pdf",
            "Content-Disposition": `${dispositionType}; filename="${standardName}"`,
            "Content-Length": String(memoryBytes.length),
          },
        });
      }
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
      metadata: { storagePath: file.storagePath },
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
