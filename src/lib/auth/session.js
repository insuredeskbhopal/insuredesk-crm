import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

export async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const session = await verifyJWT(token);
  if (!session) {
    return { response: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }

  return { session };
}

export function getActorId(session) {
  return session?.userId || session?.id || null;
}

export function canWriteOperations(session) {
  return Boolean(session && session.role !== "VIEWER");
}
