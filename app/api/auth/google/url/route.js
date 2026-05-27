import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Google login is disabled. Use your admin-created account." },
    { status: 403 }
  );
}
