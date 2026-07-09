import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";
import { MANUAL_RENEWAL_SQL_EXCLUSION } from "@/lib/records/manual-renewal-source";

export const dynamic = "force-dynamic";

const REPORT_TIME_ZONE = "Asia/Kolkata";
const INDIA_TIME_OFFSET = "+05:30";

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

    if (session.role === "VIEWER") {
      return Response.json({
        renewals: [],
        notifications: [],
        agentWise: [],
        renewalCounts: {
          eodPremium: 0,
          eodCount: 0,
          mtdPremium: 0,
          mtdCount: 0,
          ytdPremium: 0,
          ytdCount: 0,
          due10: 0,
          due20: 0,
          due30: 0,
          expired: 0,
          expiredPremium: 0,
          renewed: 0,
          renewedPremium: 0,
          lost: 0,
          lostPremium: 0,
        },
        success: true,
      });
    }

    const tenantFilter = getTenantFilter(session, "read");

    const isSuperAdmin = session.role === "SUPER_ADMIN";
    const orgId = session.organizationId || null;

    const now = new Date();
    const todayParts = getIndiaDateParts(now);
    const todayStr = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;

    const queryParams = [isSuperAdmin, orgId, todayStr];

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

    const startOfToday = makeIndiaDate(todayParts.year, todayParts.month, todayParts.day);
    const startOfThisMonth = makeIndiaDate(todayParts.year, todayParts.month, 1);
    const startOfNextMonth = makeIndiaDate(
      todayParts.month === 12 ? todayParts.year + 1 : todayParts.year,
      todayParts.month === 12 ? 1 : todayParts.month + 1,
      1,
    );
    const startOfThisYear = makeIndiaDate(todayParts.year, 1, 1);

    const statsParams = [
      isSuperAdmin,
      orgId,
      todayStr,
      startOfToday.toISOString(),
      startOfThisMonth.toISOString(),
      startOfThisYear.toISOString(),
      startOfNextMonth.toISOString(),
    ];

    const statsQuery = `
      WITH parsed AS (
        SELECT 
          CASE 
            WHEN COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') = '45140031260200003089' 
            THEN '2026-06-29T12:00:00+05:30'::timestamptz 
            ELSE saved_at 
          END as saved_at,
          COALESCE(renewal_date, saved_at) as renewal_activity_at,
          is_active_policy,
          renewal_status,
          CAST(COALESCE(NULLIF(regexp_replace(COALESCE(
            NULLIF(reviewed_data->>'netPremium', ''),
            NULLIF(data->>'netPremium', ''),
            NULLIF(reviewed_data->>'totalPremium', ''),
            NULLIF(reviewed_data->>'premium', ''),
            NULLIF(data->>'totalPremium', ''),
            NULLIF(data->>'premium', '')
          ), '[^0-9.]', '', 'g'), ''), '0') AS NUMERIC) as premium,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id = $2::uuid)
          ${MANUAL_RENEWAL_SQL_EXCLUSION}
      ),
      dated AS (
        SELECT 
          saved_at,
          renewal_activity_at,
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
      ),
      renewed_matched AS (
        SELECT DISTINCT
          p.id,
          CAST(COALESCE(NULLIF(regexp_replace(COALESCE(
            NULLIF(p.reviewed_data->>'netPremium', ''),
            NULLIF(p.data->>'netPremium', ''),
            NULLIF(p.reviewed_data->>'totalPremium', ''),
            NULLIF(p.reviewed_data->>'premium', ''),
            NULLIF(p.data->>'totalPremium', ''),
            NULLIF(p.data->>'premium', '')
          ), '[^0-9.]', '', 'g'), ''), '0') AS NUMERIC) as premium
        FROM pdf_records marker
        JOIN pdf_records p ON p.id = marker.renewed_policy_id
        WHERE marker.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND marker.renewal_status = 'RENEWED'
          AND marker.extraction_method = 'renewal_excel_import'
          AND COALESCE(marker.renewal_date, marker.saved_at) >= $5::timestamptz
          AND COALESCE(marker.renewal_date, marker.saved_at) < $7::timestamptz
          AND ($1::boolean OR marker.organization_id = $2::uuid)
          AND ($1::boolean OR p.organization_id = $2::uuid)
          AND COALESCE(p.extraction_method, '') != 'renewal_excel_import'
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
        (SELECT COUNT(*) FROM renewed_matched)::integer as renewed_count,
        (SELECT COALESCE(SUM(premium), 0) FROM renewed_matched)::numeric as renewed_premium,
        -- Lost
        COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer as lost_count,
        SUM(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN premium ELSE 0 END)::numeric as lost_premium,
        -- Expired
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date < $3::date AND expiry_date >= $3::date - 30 THEN 1 END)::integer as expired_count,
        SUM(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date < $3::date AND expiry_date >= $3::date - 30 THEN premium ELSE 0 END)::numeric as expired_premium,
        -- Upcoming Dues
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 10 THEN 1 END)::integer as due10,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 20 THEN 1 END)::integer as due20,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date >= $3::date AND (expiry_date - $3::date) <= 30 THEN 1 END)::integer as due30
      FROM dated
    `;

    const agentQuery = `
      WITH parsed AS (
        SELECT 
          CASE 
            WHEN COALESCE(reviewed_data->>'policyNumber', data->>'policyNumber') = '45140031260200003089' 
            THEN '2026-06-29T12:00:00+05:30'::timestamptz 
            ELSE saved_at 
          END as saved_at,
          COALESCE(renewal_date, saved_at) as renewal_activity_at,
          is_active_policy,
          renewal_status,
          created_by_id,
          CAST(COALESCE(NULLIF(regexp_replace(COALESCE(
            NULLIF(reviewed_data->>'netPremium', ''),
            NULLIF(data->>'netPremium', ''),
            NULLIF(reviewed_data->>'totalPremium', ''),
            NULLIF(reviewed_data->>'premium', ''),
            NULLIF(data->>'totalPremium', ''),
            NULLIF(data->>'premium', '')
          ), '[^0-9.]', '', 'g'), ''), '0') AS NUMERIC) as premium,
          COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry
        FROM pdf_records
        WHERE deleted_at IS NULL
          AND ($1::boolean OR organization_id = $2::uuid)
          ${MANUAL_RENEWAL_SQL_EXCLUSION}
      ),
      dated AS (
        SELECT 
          saved_at,
          renewal_activity_at,
          is_active_policy,
          renewal_status,
          created_by_id,
          premium,
          raw_expiry,
          (CASE 
            WHEN raw_expiry ~ '^\\d{4}-\\d{2}-\\d{2}' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
            WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
            WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
            ELSE NULL
           END) AS expiry_date
        FROM parsed
      ),
      renewed_matched AS (
        SELECT DISTINCT
          p.id,
          p.created_by_id,
          CAST(COALESCE(NULLIF(regexp_replace(COALESCE(
            NULLIF(p.reviewed_data->>'netPremium', ''),
            NULLIF(p.data->>'netPremium', ''),
            NULLIF(p.reviewed_data->>'totalPremium', ''),
            NULLIF(p.reviewed_data->>'premium', ''),
            NULLIF(p.data->>'totalPremium', ''),
            NULLIF(p.data->>'premium', '')
          ), '[^0-9.]', '', 'g'), ''), '0') AS NUMERIC) as premium
        FROM pdf_records marker
        JOIN pdf_records p ON p.id = marker.renewed_policy_id
        WHERE marker.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND marker.renewal_status = 'RENEWED'
          AND marker.extraction_method = 'renewal_excel_import'
          AND COALESCE(marker.renewal_date, marker.saved_at) >= $5::timestamptz
          AND COALESCE(marker.renewal_date, marker.saved_at) < $7::timestamptz
          AND ($1::boolean OR marker.organization_id = $2::uuid)
          AND ($1::boolean OR p.organization_id = $2::uuid)
          AND COALESCE(p.extraction_method, '') != 'renewal_excel_import'
      )
      SELECT 
        u.id as agent_id,
        u.name as agent_name,
        u.email as agent_email,
        COUNT(CASE WHEN saved_at >= $4::timestamptz THEN 1 END)::integer as eod_count,
        SUM(CASE WHEN saved_at >= $4::timestamptz THEN premium ELSE 0 END)::numeric as eod_premium,
        COUNT(CASE WHEN saved_at >= $5::timestamptz THEN 1 END)::integer as mtd_count,
        SUM(CASE WHEN saved_at >= $5::timestamptz THEN premium ELSE 0 END)::numeric as mtd_premium,
        COUNT(CASE WHEN saved_at >= $6::timestamptz THEN 1 END)::integer as ytd_count,
        SUM(CASE WHEN saved_at >= $6::timestamptz THEN premium ELSE 0 END)::numeric as ytd_premium,
        (SELECT COUNT(*) FROM renewed_matched rm WHERE rm.created_by_id IS NOT DISTINCT FROM u.id)::integer as renewed_count,
        (SELECT COALESCE(SUM(rm.premium), 0) FROM renewed_matched rm WHERE rm.created_by_id IS NOT DISTINCT FROM u.id)::numeric as renewed_premium,
        COUNT(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN 1 END)::integer as lost_count,
        SUM(CASE WHEN renewal_status IN ('LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') THEN premium ELSE 0 END)::numeric as lost_premium,
        COUNT(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date < $3::date AND expiry_date >= $3::date - 30 THEN 1 END)::integer as expired_count,
        SUM(CASE WHEN is_active_policy = true AND renewal_status NOT IN ('RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE') AND expiry_date IS NOT NULL AND expiry_date < $3::date AND expiry_date >= $3::date - 30 THEN premium ELSE 0 END)::numeric as expired_premium
      FROM dated d
      LEFT JOIN users u ON d.created_by_id = u.id
      GROUP BY u.id, u.name, u.email
    `;

    const [renewalsResult, statsResult, agentResult] = await Promise.all([
      prisma.$queryRawUnsafe(renewalsCTE, ...queryParams),
      prisma.$queryRawUnsafe(statsQuery, ...statsParams),
      prisma.$queryRawUnsafe(agentQuery, ...statsParams),
    ]);

    const renewals = renewalsResult.map((r) => ({
      id: r.id,
      insuredName: r.insuredName,
      company: r.company,
      policyType: r.policyType,
      policyNumber: r.policyNumber,
      formattedExpiry: r.expiryDate || "",
      daysRemaining: r.daysRemaining,
      isExpired: r.daysRemaining < 0,
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

    const agentWise = (agentResult || []).map((a) => ({
      agentId: a.agent_id,
      agentName: a.agent_name || "System / Unassigned",
      agentEmail: a.agent_email || "",
      eodCount: Number(a.eod_count) || 0,
      eodPremium: Number(a.eod_premium) || 0,
      mtdCount: Number(a.mtd_count) || 0,
      mtdPremium: Number(a.mtd_premium) || 0,
      ytdCount: Number(a.ytd_count) || 0,
      ytdPremium: Number(a.ytd_premium) || 0,
      renewedCount: Number(a.renewed_count) || 0,
      renewedPremium: Number(a.renewed_premium) || 0,
      lostCount: Number(a.lost_count) || 0,
      lostPremium: Number(a.lost_premium) || 0,
      expiredCount: Number(a.expired_count) || 0,
      expiredPremium: Number(a.expired_premium) || 0,
    }));

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
            reviewedData: true,
          },
        },
      },
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
        clientName,
      };
    });

    return Response.json({
      renewals,
      notifications,
      agentWise,
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
        lostPremium,
      },
      success: true,
    });
  } catch (error) {
    console.error("Failed to load header data:", error);
    return Response.json({ error: "Failed to load header dashboard data", success: false }, { status: 500 });
  }
}

function makeIndiaDate(year, month, day) {
  return new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00${INDIA_TIME_OFFSET}`,
  );
}

function getIndiaDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
  };
}
