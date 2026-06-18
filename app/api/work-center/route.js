import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getOperationsSummary } from "@/lib/operations-center/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;

    const data = await getOperationsSummary(auth.session);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("Failed to load work center:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Work center could not be loaded." },
      { status: 500 },
    );
  }
}
