import { prisma } from "@/lib/db/prisma";
import { startOfDay } from "@/app/lib/reporting/filters";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";

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
    
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    const orgId = session.organizationId || null;

    const today = startOfDay(new Date());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const queryParams = [
      isSuperAdmin,
      orgId,
      todayStr
    ];

    const renewalsCTE = `
      WITH normalized_policies AS (
        SELECT 
          id,
          saved_at,
          is_active_policy,
          COALESCE(renewal_status, 'ACTIVE') AS renewal_status,
          COALESCE(reviewed_data->>'insuredName', data->>'insuredName', 'Unnamed Insured') AS insured_name,
          COALESCE(reviewed_data->>'insuranceCompany', reviewed_data->>'Insurance Company', data->>'insuranceCompany', data->>'Insurance Company', 'Unknown Insurer') AS company,
          COALESCE(reviewed_data->>'policyType', reviewed_data->>'Policy Type', data->>'policyType', data->>'Policy Type', 'General Policy') AS policy_type,
          COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber', 'No Policy #') AS policy_number,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id = $2::uuid)
      ),
      parsed_policies AS (
        SELECT 
          id,
          saved_at,
          is_active_policy,
          COALESCE(renewal_status, 'ACTIVE') AS renewal_status,
          insured_name,
          company,
          policy_type,
          policy_number,
          raw_expiry,
          (CASE 
            WHEN raw_expiry ~ '^\\d{4}-\\d{2}-\\d{2}' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
            WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
            ELSE NULL
           END) AS expiry_date
        FROM normalized_policies
      ),
      filtered_policies AS (
        SELECT 
          id,
          insured_name as "insuredName",
          company,
          policy_type as "policyType",
          policy_number as "policyNumber",
          raw_expiry as "expiryDate",
          expiry_date,
          (expiry_date - $3::date) AS days_remaining
        FROM parsed_policies
        WHERE is_active_policy = true
          AND expiry_date IS NOT NULL
      )
      SELECT 
        id, 
        "insuredName", 
        company, 
        "policyType", 
        "policyNumber", 
        "expiryDate",
        days_remaining as "daysRemaining"
      FROM filtered_policies
      ORDER BY 
        CASE WHEN days_remaining >= 0 THEN 0 ELSE 1 END ASC, -- future renewals first
        CASE WHEN days_remaining >= 0 THEN days_remaining END ASC, -- future closest first
        CASE WHEN days_remaining < 0 THEN days_remaining END DESC -- past most recent first
      LIMIT 5
    `;

    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfThisYear = new Date(today.getFullYear(), 0, 1);

    const statsParams = [
      isSuperAdmin,
      orgId,
      todayStr,
      startOfToday.toISOString(),
      startOfThisMonth.toISOString(),
      startOfThisYear.toISOString()
    ];

    const statsQuery = `
      WITH parsed AS (
        SELECT 
          saved_at,
          is_active_policy,
          renewal_status,
          CAST(COALESCE(NULLIF(regexp_replace(COALESCE(reviewed_data->>'netPremium', data->>'netPremium', reviewed_data->>'totalPremium', reviewed_data->>'premium', data->>'totalPremium', data->>'premium'), '[^0-9.]', '', 'g'), ''), '0') AS NUMERIC) as premium,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id = $2::uuid)
      ),
      dated AS (
        SELECT 
          saved_at,
          is_active_policy,
          renewal_status,
          premium,
          raw_expiry,
          (CASE 
            WHEN raw_expiry ~ '^\\d{4}-\\d{2}-\\d{2}' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
            WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
            ELSE NULL
           END) AS expiry_date
        FROM parsed
      )
      SELECT 
        -- EOD
        COUNT(CASE WHEN saved_at >= $4::timestamptz THEN 1 END)::integer as eod_count,
        SUM(CASE WHEN saved_at >= $4::timestamptz THEN premium ELSE 0 END)::numeric as eod_premium,
        -- MTD
        COUNT(CASE WHEN saved_at >= $5::timestamptz THEN 1 END)::integer as mtd_count,
        SUM(CASE WHEN saved_at >= $5::timestamptz THEN premium ELSE 0 END)::numeric as mtd_premium,
        -- YTD
        COUNT(CASE WHEN saved_at >= $6::timestamptz THEN 1 END)::integer as ytd_count,
        SUM(CASE WHEN saved_at >= $6::timestamptz THEN premium ELSE 0 END)::numeric as ytd_premium,
        -- Renewed
        COUNT(CASE WHEN renewal_status = 'RENEWED' THEN 1 END)::integer as renewed_count,
        SUM(CASE WHEN renewal_status = 'RENEWED' THEN premium ELSE 0 END)::numeric as renewed_premium,
        -- Lost
        COUNT(CASE WHEN renewal_status = 'LOST' THEN 1 END)::integer as lost_count,
        SUM(CASE WHEN renewal_status = 'LOST' THEN premium ELSE 0 END)::numeric as lost_premium,
        -- Expired
        COUNT(CASE WHEN is_active_policy = true AND renewal_status = 'ACTIVE' AND expiry_date IS NOT NULL AND expiry_date < $3::date THEN 1 END)::integer as expired_count,
        SUM(CASE WHEN is_active_policy = true AND renewal_status = 'ACTIVE' AND expiry_date IS NOT NULL AND expiry_date < $3::date THEN premium ELSE 0 END)::numeric as expired_premium,
        -- Upcoming Dues
        COUNT(CASE WHEN is_active_policy = true AND renewal_status = 'ACTIVE' AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 10 THEN 1 END)::integer as due10,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status = 'ACTIVE' AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 20 THEN 1 END)::integer as due20,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status = 'ACTIVE' AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 30 THEN 1 END)::integer as due30
      FROM dated
    `;

    const [renewalsResult, statsResult] = await Promise.all([
      prisma.$queryRawUnsafe(renewalsCTE, ...queryParams),
      prisma.$queryRawUnsafe(statsQuery, ...statsQueryArgs(statsParams))
    ]);

    const renewals = renewalsResult.map((r) => ({
      id: r.id,
      insuredName: r.insuredName,
      company: r.company,
      policyType: r.policyType,
      policyNumber: r.policyNumber,
      formattedExpiry: r.expiryDate || "",
      daysRemaining: r.daysRemaining,
      isExpired: r.daysRemaining < 0
    }));

    const stats = statsResult[0] || {};
    const eodPremium = Number(stats.eod_premium) || 0;
    const eodCount = Number(stats.eod_count) || 0;
    const mtdPremium = Number(stats.mtd_premium) || 0;
    const mtdCount = Number(stats.mtd_count) || 0;
    const ytdPremium = Number(stats.ytd_premium) || 0;
    const ytdCount = Number(stats.ytd_count) || 0;
    const due10 = Number(stats.due10) || 0;
    const due20 = Number(stats.due20) || 0;
    const due30 = Number(stats.due30) || 0;
    const expiredCount = Number(stats.expired_count) || 0;
    const expiredPremium = Number(stats.expired_premium) || 0;
    const renewedCount = Number(stats.renewed_count) || 0;
    const renewedPremium = Number(stats.renewed_premium) || 0;
    const lostCount = Number(stats.lost_count) || 0;
    const lostPremium = Number(stats.lost_premium) || 0;

    function statsQueryArgs(params) {
      return params;
    }

    // 3. Fetch recent uploads
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
      renewalCounts: {
        eodPremium,
        eodCount,
        mtdPremium,
        mtdCount,
        ytdPremium,
        ytdCount,
        due10,
        due20,
        due30,
        expired: expiredCount,
        expiredPremium,
        renewed: renewedCount,
        renewedPremium,
        lost: lostCount,
        lostPremium
      },
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
