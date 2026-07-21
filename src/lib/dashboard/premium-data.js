import { prisma } from "@/lib/db/prisma";
import { POLICY_RECORD_SELECT } from "@/lib/records/scoped-data";
import {
  MANUAL_RENEWAL_IMPORT_METHOD,
  MANUAL_RENEWAL_SOURCE_FILE,
  MANUAL_RENEWAL_SQL_EXCLUSION,
} from "@/lib/records/manual-renewal-source";

const TERMINAL_STATUSES = "'RENEWED', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE'";
const LOST_STATUSES = "'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER', 'RENEWED_ELSEWHERE'";

const premiumExpression = (alias = "") => `CAST(COALESCE(NULLIF(regexp_replace(COALESCE(
  NULLIF(${alias}reviewed_data->>'netPremium', ''),
  NULLIF(${alias}data->>'netPremium', ''),
  NULLIF(${alias}reviewed_data->>'totalPremium', ''),
  NULLIF(${alias}reviewed_data->>'premium', ''),
  NULLIF(${alias}data->>'totalPremium', ''),
  NULLIF(${alias}data->>'premium', '')
), '[^0-9.]', '', 'g'), ''), '0') AS NUMERIC)`;

const expiryExpression = `CASE
  WHEN raw_expiry ~ '^\\d{4}-\\d{2}-\\d{2}' THEN CAST(SUBSTRING(raw_expiry FROM 1 FOR 10) AS DATE)
  WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YYYY')
  WHEN raw_expiry ~ '^\\d{1,2}[/-]\\d{1,2}[/-]\\d{2}' THEN TO_DATE(REPLACE(raw_expiry, '/', '-'), 'DD-MM-YY')
  ELSE NULL
END`;

function premiumBaseCTE() {
  return `
    WITH parsed AS (
      SELECT
        id,
        saved_at,
        COALESCE(renewal_date, saved_at) AS renewal_activity_at,
        is_active_policy,
        COALESCE(renewal_status, 'ACTIVE') AS renewal_status,
        ${premiumExpression()} AS premium,
        COALESCE(reviewed_data->>'expiryDate', reviewed_data->>'policyEndDate', data->>'expiryDate', data->>'policyEndDate') AS raw_expiry,
        LOWER(CONCAT_WS(' ',
          reviewed_data->>'insuredName', data->>'insuredName',
          reviewed_data->>'customerName', data->>'customerName',
          reviewed_data->>'policyNumber', data->>'policyNumber',
          reviewed_data->>'insuranceCompany', data->>'insuranceCompany',
          reviewed_data->>'policyType', data->>'policyType'
        )) AS search_text
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND ($1::boolean OR organization_id IS NOT DISTINCT FROM $2::uuid)
        ${MANUAL_RENEWAL_SQL_EXCLUSION}
    ),
    dated AS (
      SELECT parsed.*, (${expiryExpression}) AS expiry_date
      FROM parsed
    ),
    renewed_matched AS (
      SELECT DISTINCT ON (id) id, activity_at
      FROM (
        SELECT p.id, COALESCE(marker.renewal_date, marker.saved_at) AS activity_at
        FROM pdf_records marker
        JOIN pdf_records p ON p.id = marker.renewed_policy_id
        WHERE marker.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND marker.renewal_status = 'RENEWED'
          AND marker.extraction_method = '${MANUAL_RENEWAL_IMPORT_METHOD}'
          AND COALESCE(marker.renewal_date, marker.saved_at) >= $5::timestamptz
          AND COALESCE(marker.renewal_date, marker.saved_at) < $7::timestamptz
          AND ($1::boolean OR marker.organization_id IS NOT DISTINCT FROM $2::uuid)
          AND ($1::boolean OR p.organization_id IS NOT DISTINCT FROM $2::uuid)
          AND COALESCE(p.extraction_method, '') != '${MANUAL_RENEWAL_IMPORT_METHOD}'
        UNION ALL
        SELECT p.id, p.saved_at AS activity_at
        FROM pdf_records p
        WHERE p.deleted_at IS NULL
          AND p.saved_at >= $5::timestamptz
          AND p.saved_at < $7::timestamptz
          AND ($1::boolean OR p.organization_id IS NOT DISTINCT FROM $2::uuid)
          AND regexp_replace(lower(COALESCE(p.reviewed_data->>'newOrRenewal', p.data->>'newOrRenewal', p.reviewed_data->>'New / Renewal', p.data->>'New / Renewal', '')), '[^a-z]', '', 'g') = 'renewal'
          AND COALESCE(p.extraction_method, '') != '${MANUAL_RENEWAL_IMPORT_METHOD}'
          AND COALESCE(p.source_file, '') != '${MANUAL_RENEWAL_SOURCE_FILE}'
          AND COALESCE(p.pdf_file_name, '') != '${MANUAL_RENEWAL_SOURCE_FILE}'
      ) renewed_sources
      ORDER BY id, activity_at DESC
    )
  `;
}

export async function loadPremiumReportPage({
  session,
  reportId,
  today,
  startToday,
  startMonth,
  startYear,
  startNextMonth,
  page = 1,
  limit = 25,
  q = "",
  sort = "newest",
}) {
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  const organizationId = session.organizationId ?? null;
  const normalizedQuery = String(q || "").trim().toLowerCase();
  const periodCondition = {
    eod: "saved_at >= $4::timestamptz",
    mtd: "saved_at >= $5::timestamptz",
    ytd: "saved_at >= $6::timestamptz",
    lost: `renewal_status IN (${LOST_STATUSES})`,
    expired: `is_active_policy = true AND renewal_status NOT IN (${TERMINAL_STATUSES}) AND expiry_date >= ($3::date - 30) AND expiry_date < $3::date`,
  }[reportId];
  const filteredCTE = reportId === "renewed"
    ? `filtered AS (
        SELECT d.id, rm.activity_at AS report_date, d.premium
        FROM renewed_matched rm
        JOIN dated d USING (id)
        WHERE ($8 = '' OR d.search_text LIKE $9)
      )`
    : `filtered AS (
        SELECT id, saved_at AS report_date, premium
        FROM dated
        WHERE ${periodCondition || "FALSE"}
          AND ($8 = '' OR search_text LIKE $9)
      )`;
  const orderBy = {
    oldest: "report_date ASC, id ASC",
    premium_desc: "premium DESC, report_date DESC, id DESC",
  }[sort] || "report_date DESC, id DESC";
  const base = `${premiumBaseCTE()}, ${filteredCTE}`;
  const params = [
    isSuperAdmin,
    organizationId,
    today,
    startToday,
    startMonth,
    startYear,
    startNextMonth,
    normalizedQuery,
    `%${normalizedQuery}%`,
  ];
  const offset = (page - 1) * limit;
  const [aggregateRows, idRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `${base} SELECT COUNT(*)::integer AS count, COALESCE(SUM(premium), 0)::numeric AS premium FROM filtered`,
      ...params,
    ),
    prisma.$queryRawUnsafe(
      `${base} SELECT id, report_date FROM filtered ORDER BY ${orderBy} LIMIT $10::integer OFFSET $11::integer`,
      ...params,
      limit,
      offset,
    ),
  ]);
  const ids = idRows.map((row) => row.id);
  const records = ids.length
    ? await prisma.policyRecord.findMany({ where: { id: { in: ids } }, select: POLICY_RECORD_SELECT })
    : [];
  const byId = new Map(records.map((record) => [record.id, record]));
  const reportDateById = new Map(idRows.map((row) => [row.id, row.report_date]));
  const totalCount = Number(aggregateRows[0]?.count) || 0;

  return {
    records: ids.map((id) => ({ ...byId.get(id), reportDate: reportDateById.get(id) })).filter((record) => record.id),
    totalCount,
    totalPremium: Number(aggregateRows[0]?.premium) || 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}
