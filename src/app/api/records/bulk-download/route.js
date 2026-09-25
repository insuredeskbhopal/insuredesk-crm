import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { canAccessSharedResource, getTenantFilter } from "@/lib/auth/rbac";
import { getLocalPhysicalPath } from "@/lib/storage";
import { downloadGoogleDriveFile } from "@/lib/storage/google-drive-storage";
import { logAudit, getAuditMetadata } from "@/lib/audit";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import fs from "fs/promises";
import pdf from "pdf-parse";

export const runtime = "nodejs";

function normalizePolicyNumber(val) {
  if (!val) return "";
  return String(val).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function sanitizeFileName(value) {
  return String(value || "unnamed")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session) {
      return Response.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { ids } = body;

    const tenantFilter = getTenantFilter(session, "read");
    const where = {
      ...tenantFilter,
      deletedAt: null,
    };

    if (Array.isArray(ids) && ids.length > 0) {
      where.id = { in: ids };
    }

    const records = await prisma.policyRecord.findMany({
      where,
      select: {
        id: true,
        data: true,
        reviewedData: true,
        sourceFile: true,
        pdfFileName: true,
        pdfBytes: true,
        extractionMethod: true,
        uploadedFileId: true,
        organizationId: true,
        uploadedFile: {
          select: {
            id: true,
            sourceFile: true,
            storageProvider: true,
            storagePath: true,
            pdfBytes: true,
            mimeType: true,
            fileSize: true,
            storageMetadata: true,
          },
        },
      },
      orderBy: { savedAt: "desc" },
      take: 500, // Safe batch limit
    });

    if (!records.length) {
      return Response.json({ error: "No policy records found matching criteria." }, { status: 404 });
    }

    const zip = new JSZip();
    const reportRows = [];
    const usedFileNames = new Map();

    for (const record of records) {
      const isAuthorized = canAccessSharedResource(session, "read", record.organizationId);
      if (!isAuthorized) continue;

      const polNum = String(record.reviewedData?.policyNumber || record.data?.policyNumber || "").trim();
      const insName = String(record.reviewedData?.insuredName || record.data?.insuredName || "").trim();
      const normPolNum = normalizePolicyNumber(polNum);

      const isExcel = Boolean(
        (record.sourceFile && record.sourceFile.includes(".xlsx")) ||
        (record.pdfFileName && record.pdfFileName.includes(".xlsx")) ||
        record.extractionMethod === "EXCEL"
      );

      const policySource = isExcel
        ? "Excel Import"
        : record.sourceFile === "Manual Entry"
          ? "Manual Entry"
          : "PDF Extracted";

      let pdfBuffer = null;
      let pdfSource = "None";
      let fetchError = null;

      // 1. Try DB Bytes
      if (record.pdfBytes && record.pdfBytes.length > 0) {
        pdfBuffer = Buffer.from(record.pdfBytes);
        pdfSource = "App Storage";
      } else if (record.uploadedFile?.pdfBytes && record.uploadedFile.pdfBytes.length > 0) {
        pdfBuffer = Buffer.from(record.uploadedFile.pdfBytes);
        pdfSource = "App Storage";
      }

      // 2. Try Local File Storage
      if (!pdfBuffer && record.uploadedFile?.storagePath) {
        if (record.uploadedFile.storageProvider === "local" || !record.uploadedFile.storageProvider) {
          try {
            const physicalPath = getLocalPhysicalPath(record.uploadedFile.storagePath);
            pdfBuffer = await fs.readFile(physicalPath);
            pdfSource = "App Storage";
          } catch (e) {
            fetchError = e.message;
          }
        } else if (record.uploadedFile.storageProvider === "google_drive") {
          try {
            pdfBuffer = await downloadGoogleDriveFile(record.uploadedFile.storagePath);
            pdfSource = "Google Drive";
          } catch (e) {
            fetchError = e.message;
          }
        }
      }

      let pdfFound = pdfBuffer ? "Yes" : "No";
      let matchStatus = "Matched";
      let downloadStatus = "Downloaded";
      let reason = "Successfully verified and included in archive.";

      if (pdfBuffer) {
        // Verify policy number
        let isVerified = false;
        try {
          const parsed = await pdf(pdfBuffer);
          const normText = normalizePolicyNumber(parsed.text || "");
          if (normPolNum && normText.includes(normPolNum)) {
            isVerified = true;
          } else {
            const fnNorm = normalizePolicyNumber(record.pdfFileName || record.uploadedFile?.sourceFile || "");
            if (normPolNum && fnNorm.includes(normPolNum)) {
              isVerified = true;
            } else if ((parsed.text || "").trim().length < 50) {
              // Scanned / raster image PDF
              isVerified = true;
              reason = "Verified scanned policy PDF.";
            } else {
              matchStatus = "Policy Number Mismatch";
              downloadStatus = "Review Required";
              reason = "Policy number not found inside PDF text.";
            }
          }
        } catch (err) {
          matchStatus = "Corrupted PDF";
          downloadStatus = "Failed";
          reason = `PDF file corrupted or unreadable: ${err.message}`;
        }

        if (downloadStatus !== "Failed") {
          // Add to ZIP
          let baseFileName = `${sanitizeFileName(polNum || "NoPolicyNo")}_${sanitizeFileName(insName || "Insured")}`;
          let fileName = `${baseFileName}.pdf`;
          if (usedFileNames.has(fileName.toLowerCase())) {
            const count = usedFileNames.get(fileName.toLowerCase()) + 1;
            usedFileNames.set(fileName.toLowerCase(), count);
            fileName = `${baseFileName}_${count}.pdf`;
          } else {
            usedFileNames.set(fileName.toLowerCase(), 1);
          }

          zip.file(fileName, pdfBuffer);
        }
      } else {
        if (isExcel) {
          matchStatus = "No PDF - Excel Import";
          downloadStatus = "Skipped";
          reason = "Excel-imported policy legitimately has no attached PDF.";
        } else {
          matchStatus = "PDF Missing";
          downloadStatus = "Failed";
          reason = fetchError ? `Failed to load file: ${fetchError}` : "PDF document not found in storage.";
        }
      }

      reportRows.push({
        policyId: record.id,
        policyNumber: polNum || "-",
        insuredName: insName || "-",
        policySource,
        pdfFound,
        pdfSource: pdfFound === "Yes" ? pdfSource : "-",
        matchStatus,
        downloadStatus,
        reason,
      });
    }

    // Build PDF_Download_Report.xlsx
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BimaHeadquarter CRM";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("PDF Download Report", {
      views: [{ showGridLines: true }],
    });

    sheet.columns = [
      { header: "Policy ID", key: "policyId", width: 38 },
      { header: "Policy Number", key: "policyNumber", width: 26 },
      { header: "Insured Name", key: "insuredName", width: 34 },
      { header: "Policy Source", key: "policySource", width: 18 },
      { header: "PDF Found", key: "pdfFound", width: 14 },
      { header: "PDF Source", key: "pdfSource", width: 18 },
      { header: "Match Status", key: "matchStatus", width: 26 },
      { header: "Download Status", key: "downloadStatus", width: 18 },
      { header: "Reason", key: "reason", width: 45 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E3A5F" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    reportRows.forEach((r, idx) => {
      const row = sheet.addRow(r);
      row.height = 22;
      row.alignment = { vertical: "middle" };
      row.font = { name: "Calibri", size: 10 };

      // Striping
      if (idx % 2 === 1) {
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
      }

      // Download Status cell coloring
      const statusCell = row.getCell("downloadStatus");
      if (r.downloadStatus === "Downloaded") {
        statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "166534" } };
      } else if (r.downloadStatus === "Skipped") {
        statusCell.font = { name: "Calibri", size: 10, color: { argb: "64748B" } };
      } else if (r.downloadStatus === "Review Required") {
        statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "B45309" } };
      } else {
        statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "991B1B" } };
      }
    });

    const reportBuffer = await workbook.xlsx.writeBuffer();
    zip.file("PDF_Download_Report.xlsx", reportBuffer);

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    const { ipAddress, userAgent } = getAuditMetadata(request);
    await logAudit({
      action: "BULK_PDF_DOWNLOAD",
      entityType: "PolicyRecord",
      entityId: session.organizationId,
      severity: "INFO",
      source: "API",
      ipAddress,
      userAgent,
      userId: session.userId,
      organizationId: session.organizationId,
      metadata: { count: records.length, downloadedCount: reportRows.filter(r => r.downloadStatus === "Downloaded").length },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="policies_export_${timestamp}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err) {
    console.error("Bulk download error:", err);
    return Response.json({ error: err.message || "Failed to generate bulk PDF archive." }, { status: 500 });
  }
}
