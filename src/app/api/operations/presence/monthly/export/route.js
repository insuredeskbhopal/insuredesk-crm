import { verifyJWT } from "@/lib/auth";
import { calculateMonthlyAttendance } from "@/lib/presence/monthly-attendance";
import { generateAttendanceXlsx } from "@/lib/presence/attendance-xlsx-export";

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

    // Reuse the same calculation that powers the UI
    const data = await calculateMonthlyAttendance({
      monthStr: month,
      userId: session.id,
      isRestrictedAgent,
    });

    if (!data.success) {
      return Response.json({ error: "Failed to calculate attendance" }, { status: 500 });
    }

    const buffer = await generateAttendanceXlsx(data);

    // Build filename: Bima_Headquarter_Attendance_11-Sep-2026_to_10-Oct-2026.xlsx
    const startFmt = formatFilenameDate(data.startDate);
    const endFmt = formatFilenameDate(data.endDate);
    const filename = `Bima_Headquarter_Attendance_${startFmt}_to_${endFmt}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Failed to export attendance XLSX:", err);
    return Response.json(
      { error: "Failed to generate attendance report", details: err?.message },
      { status: 500 }
    );
  }
}

function formatFilenameDate(dateStr) {
  if (!dateStr) return "unknown";
  const d = new Date(`${dateStr}T12:00:00+05:30`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
}
