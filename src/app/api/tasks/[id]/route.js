import { NextResponse } from "next/server";
import { requireSession, canWriteOperations } from "@/lib/auth/session";
import { updateTaskStatus } from "@/lib/operations-center/engine";

export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set([
  "DRAFT",
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_INSURANCE_COMPANY",
  "WAITING_DOCUMENTS",
  "ESCALATED",
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
]);

export async function PATCH(request, context) {
  try {
    const auth = await requireSession(request);
    if (auth.response) return auth.response;
    if (!canWriteOperations(auth.session)) {
      return NextResponse.json({ error: "Viewers cannot modify tasks." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const status = String(body.status || "")
      .trim()
      .toUpperCase();
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid task status." }, { status: 422 });
    }

    const task = await updateTaskStatus(auth.session, id, status);
    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Task could not be updated." },
      { status: 500 },
    );
  }
}
