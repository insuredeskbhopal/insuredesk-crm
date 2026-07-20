import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getWhatsAppGroups, refreshWhatsAppGroups } from "@/lib/whatsapp/whatsapp-client";

export const runtime = "nodejs";

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session) return { errorResponse: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  return session;
}

export async function GET(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;
    return NextResponse.json({ success: true, groups: await getWhatsAppGroups() });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to load WhatsApp groups" }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;
    if (session.role === "VIEWER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    return NextResponse.json({ success: true, groups: await refreshWhatsAppGroups() });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to refresh WhatsApp groups" }, { status: 503 });
  }
}
