import { verifyJWT } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.role)) {
      return Response.json({ error: "Forbidden: Management only" }, { status: 403 });
    }

    const body = await request.json();
    const { incidentId, action, resolutionNotes } = body; // action: 'RESOLVE' | 'EXCUSE'

    if (!incidentId) {
      return Response.json({ error: "incidentId is required" }, { status: 400 });
    }

    const incident = await prisma.presenceIncident.findUnique({
      where: { id: incidentId },
      include: { user: true },
    });

    if (!incident) {
      return Response.json({ error: "Incident not found" }, { status: 404 });
    }

    const now = new Date();
    const newStatus = action === "EXCUSE" ? "EXCUSED" : "RESOLVED";

    await prisma.presenceIncident.update({
      where: { id: incidentId },
      data: {
        status: newStatus,
        endedAt: incident.endedAt || now,
        resolution: resolutionNotes || `Administrative action by ${session.name || session.email}`,
        reviewedBy: session.name || session.email,
        reviewedAt: now,
      },
    });

    await prisma.presenceEvent.create({
      data: {
        userId: incident.userId,
        dailyPresenceId: incident.dailyPresenceId,
        incidentId: incident.id,
        eventType: `INCIDENT_${newStatus}`,
        description: `Marked as ${newStatus} by ${session.name || session.email}. Notes: ${resolutionNotes || "None"}`,
      },
    });

    return Response.json({
      success: true,
      message: `Incident marked as ${newStatus}`,
    });
  } catch (error) {
    console.error("Error in POST /api/operations/presence/escalations:", error);
    return Response.json({ error: "Failed to update incident" }, { status: 500 });
  }
}
