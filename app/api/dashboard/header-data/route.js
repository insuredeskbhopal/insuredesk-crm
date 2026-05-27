import { prisma } from "@/lib/prisma";
import { normalizeRecord } from "@/lib/records";
import { parsePolicyDate, startOfDay } from "@/app/lib/reporting/filters";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/rbac";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/upload-status";

export const dynamic = "force-dynamic";

function formatRelativeTime(dateString) {
  const now = new Date();
  const diffMs = now - new Date(dateString);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function formatDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return String(date);
  }
}

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated", success: false }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session) {
      return Response.json({ error: "Invalid or expired session", success: false }, { status: 401 });
    }

    const tenantFilter = getTenantFilter(session, "read");
    // 1. Fetch upcoming renewals
    const rawRecords = await prisma.policyRecord.findMany({
      where: tenantFilter,
      orderBy: { savedAt: "desc" },
      select: {
        id: true,
        savedAt: true,
        data: true,
        reviewedData: true,
        pdfFileName: true
      }
    });
    
    const records = rawRecords.map(normalizeRecord);
    const today = startOfDay(new Date());
    
    // Filter and map policies that have a valid expiry date
    const renewals = records
      .map((r) => {
        const expiry = parsePolicyDate(r.expiryDate);
        return {
          id: r.id,
          insuredName: r.insuredName || "Unnamed Insured",
          insuranceCompany: r.insuranceCompany || "Unknown Insurer",
          policyType: r.policyType || "General Policy",
          policyNumber: r.policyNumber || "No Policy #",
          expiryDate: r.expiryDate,
          parsedExpiry: expiry,
          daysRemaining: expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
        };
      })
      .filter((r) => r.parsedExpiry !== null)
      // Sort: upcoming renewals first (closest first), expired renewals last (most recent first)
      .sort((a, b) => {
        if (a.daysRemaining >= 0 && b.daysRemaining >= 0) {
          return a.daysRemaining - b.daysRemaining;
        }
        if (a.daysRemaining < 0 && b.daysRemaining < 0) {
          return b.daysRemaining - a.daysRemaining; // most recently expired first
        }
        return a.daysRemaining >= 0 ? -1 : 1; // future renewals before past
      })
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        insuredName: r.insuredName,
        company: r.insuranceCompany,
        policyType: r.policyType,
        policyNumber: r.policyNumber,
        formattedExpiry: r.expiryDate || formatDate(r.parsedExpiry),
        daysRemaining: r.daysRemaining,
        isExpired: r.daysRemaining < 0
      }));

    // 2. Fetch recent uploads
    const uploads = await prisma.uploadedFile.findMany({
      where: tenantFilter,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        sourceFile: true,
        status: true,
        createdAt: true,
        errorMessage: true,
        policyRecords: {
          where: tenantFilter,
          select: {
            id: true,
            data: true,
            reviewedData: true
          }
        }
      }
    });

    const notifications = uploads.map((u) => {
      const uploadStatus = normalizeUploadStatus(u.status);
      let icon = "📄";
      let text = `File "${u.sourceFile}" uploaded`;
      let type = "info";
      let recordId = null;
      let clientName = null;

      if (u.policyRecords && u.policyRecords.length > 0) {
        const record = u.policyRecords[0];
        const payload = record.reviewedData || record.data || {};
        clientName = payload.insuredName || payload["Insured Name"] || "";
        recordId = record.id;
      }
      
      if (uploadStatus === UPLOAD_STATUS.APPROVED) {
        icon = "✅";
        text = `Successfully saved ${u.sourceFile}`;
        type = "success";
      } else if (uploadStatus === UPLOAD_STATUS.FAILED) {
        icon = "❌";
        text = `Failed to process ${u.sourceFile}: ${u.errorMessage || "Unknown error"}`;
        type = "error";
      } else if (uploadStatus === UPLOAD_STATUS.REVIEW_REQUIRED) {
        icon = "⚠️";
        text = `${u.sourceFile} is ready for review`;
        type = "warning";
      } else if (uploadStatus === UPLOAD_STATUS.PROCESSING) {
        icon = "⏳";
        text = `Extracting details: ${u.sourceFile}`;
        type = "progress";
      }
      
      return {
        id: u.id,
        icon,
        text,
        time: formatRelativeTime(u.createdAt),
        type,
        errorMessage: u.errorMessage || "",
        recordId,
        clientName
      };
    });

    return Response.json({
      renewals,
      notifications,
      success: true
    });
  } catch (error) {
    console.error("Failed to load header data:", error);
    return Response.json(
      { error: "Failed to load header dashboard data", success: false },
      { status: 500 }
    );
  }
}
