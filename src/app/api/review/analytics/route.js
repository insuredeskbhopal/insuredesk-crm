import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getReviewAnalyticsData } from "@/lib/review/storage";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // Enforce CRM authorization: only authenticated CRM users can view review analytics
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized access. CRM login required." }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 });
    }

    const data = await getReviewAnalyticsData();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("[Review Analytics API] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to retrieve analytics data" }, { status: 500 });
  }
}
