import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import {
  getWhatsAppSessions,
  createWhatsAppSession,
  setPrimaryWhatsAppSession,
  pauseWhatsAppSession,
  logoutWhatsAppSession,
  deleteWhatsAppSession,
  getWhatsAppMetrics,
} from "@/lib/whatsapp/whatsapp-client";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN"];

async function requireAdminSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  const session = await verifyJWT(token);
  if (!session) {
    return { errorResponse: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }
  const role = session.role || "USER";
  if (!ALLOWED_ROLES.includes(role)) {
    return {
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Admin privileges required to manage WhatsApp accounts" },
        { status: 403 }
      ),
    };
  }
  return session;
}

export async function GET(request) {
  try {
    const session = await requireAdminSession(request);
    if (session.errorResponse) return session.errorResponse;

    const accounts = await getWhatsAppSessions();
    const metrics = await getWhatsAppMetrics();

    return NextResponse.json({
      success: true,
      accounts,
      metrics: metrics.success ? metrics : null,
    });
  } catch (error) {
    console.error("GET /api/operations/whatsapp/sessions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch WhatsApp sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await requireAdminSession(request);
    if (session.errorResponse) return session.errorResponse;

    const body = await request.json().catch(() => ({}));
    const { action, accountId, label } = body;

    console.log(`[Audit][WhatsApp] Admin '${session.email}' executed action '${action}' for account '${accountId || label}'`);

    switch (action) {
      case "create": {
        const result = await createWhatsAppSession(label);
        return NextResponse.json(result);
      }
      case "set-default": {
        if (!accountId) {
          return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
        }
        const result = await setPrimaryWhatsAppSession(accountId);
        return NextResponse.json(result);
      }
      case "pause": {
        if (!accountId) {
          return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
        }
        const result = await pauseWhatsAppSession(accountId);
        return NextResponse.json(result);
      }
      case "logout": {
        if (!accountId) {
          return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
        }
        const result = await logoutWhatsAppSession(accountId);
        return NextResponse.json(result);
      }
      case "delete": {
        if (!accountId) {
          return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
        }
        const result = await deleteWhatsAppSession(accountId);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json(
          { error: `Unsupported action '${action}'` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("POST /api/operations/whatsapp/sessions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute WhatsApp account action" },
      { status: 500 }
    );
  }
}
