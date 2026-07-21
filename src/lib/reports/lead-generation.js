import { prisma } from "@/lib/db/prisma";

export async function loadLeadAgentReport({ session, page = 1, limit = 25, q = "" }) {
  if (session?.role !== "SUPER_ADMIN") {
    throw new Error("Super Admin access is required.");
  }

  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25));
  const search = String(q || "").trim();
  const organizationId = session.organizationId || null;
  const isGlobal = !organizationId;
  const offset = (safePage - 1) * safeLimit;

  const rows = await prisma.$queryRawUnsafe(
    `
      WITH agent_leads AS (
        SELECT
          cp.created_by_id,
          COALESCE(NULLIF(BTRIM(u.name), ''), NULLIF(BTRIM(u.email), ''), 'System / Unassigned') AS agent_name,
          COALESCE(u.email, '') AS agent_email,
          COUNT(*)::integer AS total_leads,
          COUNT(*) FILTER (WHERE cp.status = 'New Lead')::integer AS new_leads,
          COUNT(*) FILTER (WHERE cp.status = 'Follow-up Required')::integer AS follow_up_required,
          COUNT(*) FILTER (WHERE cp.status = 'Interested')::integer AS interested,
          COUNT(*) FILTER (WHERE cp.status = 'Converted' OR cp.converted_to_customer = true)::integer AS converted,
          COUNT(*) FILTER (WHERE cp.status = 'Lost')::integer AS lost,
          MAX(cp.created_at) AS latest_lead_at
        FROM customer_profiles cp
        LEFT JOIN users u ON u.id = cp.created_by_id AND u.deleted_at IS NULL
        WHERE cp.deleted_at IS NULL
          AND cp.created_by_id IS NOT NULL
          AND ($1::boolean OR cp.organization_id IS NOT DISTINCT FROM $2::uuid)
          AND (
            $3::text = ''
            OR COALESCE(u.name, '') ILIKE $4::text
            OR COALESCE(u.email, '') ILIKE $4::text
          )
        GROUP BY cp.created_by_id, u.name, u.email
      )
      SELECT agent_leads.*, COUNT(*) OVER()::integer AS agent_count
      FROM agent_leads
      ORDER BY total_leads DESC, agent_name ASC
      LIMIT $5::integer OFFSET $6::integer
    `,
    isGlobal,
    organizationId,
    search,
    `%${search}%`,
    safeLimit,
    offset,
  );

  const totalAgents = Number(rows[0]?.agent_count || 0);
  return {
    agents: rows.map((row) => ({
      agentId: row.created_by_id,
      agentName: row.agent_name,
      agentEmail: row.agent_email,
      totalLeads: Number(row.total_leads) || 0,
      newLeads: Number(row.new_leads) || 0,
      followUpRequired: Number(row.follow_up_required) || 0,
      interested: Number(row.interested) || 0,
      converted: Number(row.converted) || 0,
      lost: Number(row.lost) || 0,
      latestLeadAt: row.latest_lead_at,
    })),
    page: safePage,
    limit: safeLimit,
    totalAgents,
    totalPages: Math.max(1, Math.ceil(totalAgents / safeLimit)),
  };
}
