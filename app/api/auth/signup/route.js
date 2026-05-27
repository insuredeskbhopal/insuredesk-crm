import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Public signup is disabled. Ask the super admin to create your account." },
    { status: 403 }
  );
}
