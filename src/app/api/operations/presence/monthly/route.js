import { verifyJWT } from "@/lib/auth";
import { calculateMonthlyAttendance } from "@/lib/presence/monthly-attendance";

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

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // e.g. "2026-09"
    const isRestrictedAgent = session.role === "AGENT";

    const data = await calculateMonthlyAttendance({
      monthStr: month,
      userId: session.id,
      isRestrictedAgent,
    });

    return Response.json(data);
  } catch (err) {
    console.error("Failed to calculate monthly attendance:", err);
    return Response.json(
      { error: "Failed to calculate monthly attendance", details: err?.message },
      { status: 500 }
    );
  }
}
