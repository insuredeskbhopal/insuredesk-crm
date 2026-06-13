import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get("policyId");

    if (!policyId) {
      return Response.json({ error: "Missing policyId parameter" }, { status: 400 });
    }

    const tenantFilter = getTenantFilter(user, "read");

    // Verify policy access
    const policy = await prisma.policyRecord.findFirst({
      where: {
        id: policyId,
        ...tenantFilter
      }
    });

    if (!policy) {
      return Response.json({ error: "Policy not found or access denied" }, { status: 404 });
    }

    // Query audit logs
    const dbLogs = await prisma.auditLog.findMany({
      where: {
        entityId: policyId,
        entityType: "PolicyRecord"
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Format logs into changes list
    const formattedLogs = [];

    for (const log of dbLogs) {
      const userName = log.user?.name || log.user?.email || "System/User";
      const timestamp = log.createdAt.toISOString();
      const metadata = log.metadata || {};
      
      let actionLabel = log.action;
      let changes = [];

      switch (log.action) {
        case "RENEWAL_EDITED":
          actionLabel = "Renewal Edited";
          changes = Array.isArray(metadata.changes) ? metadata.changes : [];
          break;

        case "RENEWAL_REASSIGNED":
          actionLabel = "User Reassigned";
          changes = [
            {
              field: "Assigned User",
              oldValue: "Previous Agent",
              newValue: metadata.assignedTo || "Unassigned"
            }
          ];
          break;

        case "RENEWAL_STATUS_CHANGED":
          actionLabel = "Status Changed";
          changes = [
            {
              field: "Renewal Status",
              oldValue: metadata.oldStatus || "Active",
              newValue: metadata.newStatus || "Active"
            }
          ];
          break;

        case "RENEWAL_REMARK_ADDED":
          actionLabel = "Remark Added";
          changes = [
            {
              field: "Remark",
              oldValue: "N/A",
              newValue: metadata.remark || "New follow-up remark added"
            }
          ];
          if (metadata.nextFollowUpDate) {
            changes.push({
              field: "Next Follow-Up",
              oldValue: "N/A",
              newValue: metadata.nextFollowUpDate
            });
          }
          break;

        case "POLICY_RENEWED":
          actionLabel = "Marked Renewed";
          changes = [
            {
              field: "Renewal Status",
              oldValue: "Active",
              newValue: "Renewed"
            }
          ];
          break;

        case "POLICY_MARK_LOST":
          actionLabel = "Marked Lost";
          changes = [
            {
              field: "Renewal Status",
              oldValue: "Active",
              newValue: `Lost / Not Interested (${metadata.lostReason || "No Reason Specified"})`
            }
          ];
          if (metadata.remarks) {
            changes.push({
              field: "Lost Notes",
              oldValue: "N/A",
              newValue: metadata.remarks
            });
          }
          break;

        case "WHATSAPP_REMINDER_SENT":
          actionLabel = "WhatsApp Opened";
          changes = [
            {
              field: "WhatsApp Message",
              oldValue: "N/A",
              newValue: `Opened chat for ${metadata.contactNumber || "customer"}`
            }
          ];
          break;

        case "POLICY_RECORD_UPDATE":
          actionLabel = "Policy Updated";
          changes = [
            {
              field: "File Metadata",
              oldValue: "N/A",
              newValue: metadata.sourceFile || "Policy updated"
            }
          ];
          break;

        default:
          // Try to fallback
          actionLabel = log.action.replace(/_/g, " ");
          changes = [
            {
              field: "Action Details",
              oldValue: "N/A",
              newValue: JSON.stringify(metadata)
            }
          ];
      }

      formattedLogs.push({
        id: log.id,
        action: actionLabel,
        userName,
        timestamp,
        changes
      });
    }

    return Response.json({ success: true, logs: formattedLogs });
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    return Response.json({ error: "Failed to load audit logs." }, { status: 500 });
  }
}
