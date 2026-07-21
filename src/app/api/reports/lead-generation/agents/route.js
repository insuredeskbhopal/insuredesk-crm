import { verifyJWT } from "@/lib/auth";
import { loadLeadAgentReport } from "@/lib/reports/lead-generation";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const session = await verifyJWT(token);
    if (!session) return Response.json({ error: "Invalid or expired session" }, { status: 401 });
    if (session.role !== "SUPER_ADMIN") {
      return Response.json({ error: "Super Admin access is required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const report = await loadLeadAgentReport({
      session,
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      q: searchParams.get("q"),
    });
    return Response.json({ success: true, ...report });
  } catch (error) {
    console.error("Lead agent report failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Lead generation report could not be loaded." }, { status: 500 });
  }
}
