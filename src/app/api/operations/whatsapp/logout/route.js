import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { logoutWhatsApp } from "@/lib/whatsapp/whatsapp-client";

export const runtime = "nodejs";

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session) {
    return { errorResponse: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }
  return session;
}

export async function POST(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log("Requesting WhatsApp logout...");
    const logoutResponse = await logoutWhatsApp();

    return NextResponse.json({
      success: logoutResponse.success || false,
      message: logoutResponse.message || logoutResponse.error || "Logged out",
    });
  } catch (error) {
    console.error("Failed to logout WhatsApp:", error);
    return NextResponse.json(
      { error: error.message || "Failed to logout" },
      { status: 500 }
    );
  }
}
