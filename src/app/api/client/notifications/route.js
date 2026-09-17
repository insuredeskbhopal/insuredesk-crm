import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireClient } from "@/lib/client-portal/session";

export async function GET(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;

    const customerId = auth.customer.id;
    const orgId = auth.organizationId;
    const clientPhone = (auth.customer.phone || "").replace(/[^0-9]/g, "").slice(-10);
    const clientName = (auth.customer.name || "").trim();

    // Fetch persisted read notification IDs
    const readTask = await prisma.task.findUnique({
      where: { sourceKey: `client-reads:${customerId}` },
      select: { metadata: true }
    });
    const readSet = new Set(Array.isArray(readTask?.metadata?.readIds) ? readTask.metadata.readIds : []);

    // 1. Fetch matching policy records for upcoming renewals
    const matchedRows = await prisma.$queryRaw`
      SELECT id, renewal_date, renewal_status,
             COALESCE(NULLIF(reviewed_data->>'policyNumber', ''), data->>'policyNumber', '') AS policy_number,
             COALESCE(NULLIF(reviewed_data->>'insuranceCompany', ''), data->>'insuranceCompany', selected_company, 'Insurance') AS company,
             COALESCE(NULLIF(reviewed_data->>'totalPremium', ''), data->>'totalPremium', reviewed_data->>'premium', data->>'premium', '0') AS premium
      FROM pdf_records
      WHERE deleted_at IS NULL
        AND organization_id IS NOT DISTINCT FROM ${orgId}::uuid
        AND is_active_policy = true
        AND (
          LOWER(COALESCE(NULLIF(reviewed_data->>'clientId', ''), data->>'clientId', '')) = LOWER(${customerId})
          OR (${clientPhone} != '' AND COALESCE(NULLIF(reviewed_data->>'contactNumber', ''), data->>'contactNumber', '') LIKE ${'%' + clientPhone + '%'})
          OR (${clientPhone} != '' AND COALESCE(NULLIF(reviewed_data->>'mobileNumber', ''), data->>'mobileNumber', '') LIKE ${'%' + clientPhone + '%'})
          OR (${clientPhone} != '' AND COALESCE(NULLIF(reviewed_data->>'phone', ''), data->>'phone', '') LIKE ${'%' + clientPhone + '%'})
          OR (${clientName} != '' AND LOWER(COALESCE(NULLIF(reviewed_data->>'insuredName', ''), data->>'insuredName', '')) = LOWER(${clientName}))
        )
      LIMIT 10
    `;

    const notifications = [];

    // Check renewals
    for (const row of matchedRows) {
      const isDue = row.renewal_status === "DUE" || row.renewal_status === "PENDING";
      const renewalDate = row.renewal_date ? new Date(row.renewal_date) : null;
      const isApproaching = renewalDate && (renewalDate.getTime() - Date.now() < 45 * 24 * 60 * 60 * 1000);

      if (isDue || isApproaching) {
        const id = `renewal-${row.id}`;
        notifications.push({
          id,
          type: "RENEWAL",
          title: `Policy Renewal Due`,
          subtitle: `${row.company} #${row.policy_number || "Policy"} • Premium ₹${row.premium}`,
          time: row.renewal_date ? new Date(row.renewal_date).toLocaleDateString("en-IN") : "Upcoming",
          severity: "WARNING",
          read: readSet.has(id),
        });
      }
    }

    // 2. Fetch recent claims
    const cleanPhone = String(auth.customer.phone || "").replace(/[^0-9]/g, "");
    const phoneSuffix = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : "";
    const claims = await prisma.claim.findMany({
      where: {
        deletedAt: null,
        organizationId: orgId,
        OR: [
          { metadata: { path: ["customerId"], equals: customerId } },
          ...(phoneSuffix ? [{ mobileNo: { endsWith: phoneSuffix } }] : []),
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        claimNo: true,
        policyNo: true,
        claimStatus: true,
        claimDescription: true,
        updatedAt: true,
      },
    });

    for (const claim of claims) {
      const id = `claim-${claim.id}`;
      notifications.push({
        id,
        type: "CLAIM",
        title: `Claim #${claim.claimNo || claim.id} Status: ${claim.claimStatus}`,
        subtitle: `Policy #${claim.policyNo || "-"}${claim.claimDescription ? " • " + claim.claimDescription : ""}`,
        time: claim.updatedAt ? new Date(claim.updatedAt).toLocaleDateString("en-IN") : "Recent",
        severity: ["Settled", "Approved"].includes(claim.claimStatus) ? "SUCCESS" : "INFO",
        read: readSet.has(id),
      });
    }

    // 3. Fetch recent service requests
    const tasks = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        module: "CLIENT_PORTAL",
        recordId: customerId,
        archivedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    for (const task of tasks) {
      const id = `sr-${task.id}`;
      notifications.push({
        id,
        type: "SERVICE_REQUEST",
        title: `Support Ticket: ${task.title}`,
        subtitle: `Status: ${task.status}`,
        time: task.updatedAt ? new Date(task.updatedAt).toLocaleDateString("en-IN") : "Recent",
        severity: task.status === "COMPLETED" ? "SUCCESS" : "INFO",
        read: readSet.has(id),
      });
    }

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Client Notifications Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const customerId = auth.customer.id;

    const payload = await request.json().catch(() => ({}));
    const { notificationId, markAllRead, notificationIds } = payload;

    const readKey = `client-reads:${customerId}`;
    const existing = await prisma.task.findUnique({
      where: { sourceKey: readKey },
      select: { metadata: true }
    });
    const currentReadIds = new Set(Array.isArray(existing?.metadata?.readIds) ? existing.metadata.readIds : []);

    if (markAllRead && Array.isArray(notificationIds)) {
      notificationIds.forEach(id => currentReadIds.add(String(id)));
    } else if (notificationId) {
      currentReadIds.add(String(notificationId));
    }

    const updatedReadList = Array.from(currentReadIds);
    await prisma.task.upsert({
      where: { sourceKey: readKey },
      create: {
        title: "Client read notifications",
        module: "CLIENT_PORTAL_SECURITY",
        type: "SERVICE_REQUEST",
        status: "COMPLETED",
        recordId: customerId,
        sourceKey: readKey,
        metadata: { readIds: updatedReadList },
        completedAt: new Date(),
        archivedAt: new Date(),
      },
      update: {
        metadata: { readIds: updatedReadList },
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({ success: true, message: "Notifications marked as read", readCount: updatedReadList.length });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
