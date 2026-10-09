import { prisma } from "@/lib/db/prisma";

export async function loadLeadAgentReport({ session, page = 1, limit = 25, q = "" }) {
  if (!session) {
    throw new Error("Authentication required.");
  }
  if (session.role !== "SUPER_ADMIN") throw new Error("Super Admin access is required.");

  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25));
  const search = String(q || "").trim();
  const offset = (safePage - 1) * safeLimit;
  const searchFilter = `
    cp.deleted_at IS NULL
    AND cp.created_by_id IS NOT NULL
    AND (
      $1::text = ''
      OR COALESCE(u.name, '') ILIKE $2::text
      OR COALESCE(u.email, '') ILIKE $2::text
    )
  `;

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
        FROM lead_generation cp
        LEFT JOIN users u ON u.id = cp.created_by_id AND u.deleted_at IS NULL
        WHERE ${searchFilter}
        GROUP BY cp.created_by_id, u.name, u.email
      )
      SELECT agent_leads.*, COUNT(*) OVER()::integer AS agent_count
      FROM agent_leads
      ORDER BY total_leads DESC, agent_name ASC
      LIMIT $3::integer OFFSET $4::integer
    `,
    search,
    `%${search}%`,
    safeLimit,
    offset,
  );

  const [summary = {}] = await prisma.$queryRawUnsafe(
    `
      SELECT
        COUNT(*)::integer AS total_leads,
        COUNT(DISTINCT cp.created_by_id)::integer AS active_agents,
        COUNT(*) FILTER (WHERE cp.status = 'New Lead')::integer AS new_leads,
        COUNT(*) FILTER (WHERE cp.status = 'Follow-up Required')::integer AS follow_up_required,
        COUNT(*) FILTER (WHERE cp.status = 'Interested')::integer AS interested,
        COUNT(*) FILTER (WHERE cp.status = 'Converted' OR cp.converted_to_customer = true)::integer AS converted,
        COUNT(*) FILTER (WHERE cp.status = 'Lost')::integer AS lost,
        COUNT(*) FILTER (
          WHERE cp.next_follow_up_date IS NOT NULL
            AND cp.next_follow_up_date < NOW()
            AND cp.status <> 'Lost'
            AND cp.converted_to_customer = false
        )::integer AS overdue_follow_ups,
        COUNT(*) FILTER (
          WHERE cp.next_follow_up_date IS NOT NULL
            AND cp.next_follow_up_date >= NOW()
            AND cp.next_follow_up_date < NOW() + INTERVAL '7 days'
            AND cp.status <> 'Lost'
            AND cp.converted_to_customer = false
        )::integer AS due_this_week,
        COUNT(*) FILTER (WHERE cp.created_at >= date_trunc('month', NOW()))::integer AS created_this_month,
        COUNT(*) FILTER (WHERE cp.created_at >= date_trunc('day', NOW()))::integer AS created_today,
        MAX(cp.created_at) AS latest_lead_at
      FROM lead_generation cp
      LEFT JOIN users u ON u.id = cp.created_by_id AND u.deleted_at IS NULL
      WHERE ${searchFilter}
    `,
    search,
    `%${search}%`,
  );
  const [topAgentRow = null] = await prisma.$queryRawUnsafe(
    `
      SELECT
        cp.created_by_id,
        COALESCE(NULLIF(BTRIM(u.name), ''), NULLIF(BTRIM(u.email), ''), 'System / Unassigned') AS agent_name,
        COALESCE(u.email, '') AS agent_email,
        COUNT(*)::integer AS total_leads,
        COUNT(*) FILTER (WHERE cp.status = 'Converted' OR cp.converted_to_customer = true)::integer AS converted
      FROM lead_generation cp
      LEFT JOIN users u ON u.id = cp.created_by_id AND u.deleted_at IS NULL
      WHERE ${searchFilter}
      GROUP BY cp.created_by_id, u.name, u.email
      ORDER BY total_leads DESC, agent_name ASC
      LIMIT 1
    `,
    search,
    `%${search}%`,
  );

  const totals = {
    totalLeads: Number(summary.total_leads) || 0,
    activeAgents: Number(summary.active_agents) || 0,
    newLeads: Number(summary.new_leads) || 0,
    followUpRequired: Number(summary.follow_up_required) || 0,
    interested: Number(summary.interested) || 0,
    converted: Number(summary.converted) || 0,
    lost: Number(summary.lost) || 0,
    overdueFollowUps: Number(summary.overdue_follow_ups) || 0,
    dueThisWeek: Number(summary.due_this_week) || 0,
    createdThisMonth: Number(summary.created_this_month) || 0,
    createdToday: Number(summary.created_today) || 0,
    latestLeadAt: summary.latest_lead_at || null,
  };
  const totalAgents = totals.activeAgents;
  const topAgent = topAgentRow
    ? {
        agentId: topAgentRow.created_by_id,
        agentName: topAgentRow.agent_name,
        agentEmail: topAgentRow.agent_email,
        totalLeads: Number(topAgentRow.total_leads) || 0,
        converted: Number(topAgentRow.converted) || 0,
      }
    : null;

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
      openLeads:
        (Number(row.new_leads) || 0) +
        (Number(row.follow_up_required) || 0) +
        (Number(row.interested) || 0),
      latestLeadAt: row.latest_lead_at,
    })),
    summary: {
      ...totals,
      conversionRate: totals.totalLeads ? Math.round((totals.converted / totals.totalLeads) * 100) : 0,
      lossRate: totals.totalLeads ? Math.round((totals.lost / totals.totalLeads) * 100) : 0,
      averageLeadsPerAgent: totals.activeAgents ? Math.round(totals.totalLeads / totals.activeAgents) : 0,
      openLeads: totals.newLeads + totals.followUpRequired + totals.interested,
    },
    topAgent,
    page: safePage,
    limit: safeLimit,
    totalAgents,
    totalPages: Math.max(1, Math.ceil(totalAgents / safeLimit)),
  };
}
