import { verifyJWT } from "@/lib/auth";
import { recordHeartbeat, getISTDateInfo } from "@/lib/presence/presence-monitor";
import { prisma } from "@/lib/db/prisma";

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || !session.id) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Could be empty or beacon string
    }

    const tabId = body.tabId || "default-tab";
    const visibilityState = body.visibilityState || "visible";
    const action = body.action || "heartbeat"; // 'heartbeat' | 'close'
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const result = await recordHeartbeat({
      userId: session.id,
      tabId,
      visibilityState,
      action,
      ipAddress,
      userAgent,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Error in POST /api/user/presence:", error);
    return Response.json({ error: "Failed to record presence" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (!session || !session.id) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const ist = getISTDateInfo();
    const daily = await prisma.dailyPresence.findUnique({
      where: {
        userId_workDate: {
          userId: session.id,
          workDate: ist.workDate,
        },
      },
      include: {
        sessions: {
          where: { endedAt: null },
          select: { tabId: true, visibilityState: true, lastHeartbeatAt: true },
        },
        incidents: {
          orderBy: { startedAt: "desc" },
          take: 3,
        },
      },
    });

    return Response.json({
      success: true,
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      ist,
      presence: daily || {
        currentStatus: "ONLINE",
        warningCount: 0,
        sessions: [],
      },
    });
  } catch (error) {
    console.error("Error in GET /api/user/presence:", error);
    return Response.json({ error: "Failed to fetch presence status" }, { status: 500 });
  }
}
