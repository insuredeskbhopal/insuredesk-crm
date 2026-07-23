import { NextResponse } from "next/server";
import { requireSession, canWriteOperations } from "@/lib/auth/session";
import { updateTaskStatus } from "@/lib/operations-center/engine";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { prisma } from "@/lib/db/prisma";

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
const SPECIALIZED_WORKFLOW_MODULES = new Set([
  "CLIENT_ID_REQUEST",
  "CLIENT_PORTAL_SECURITY",
  "CLIENT_PORTAL_PROFILE",
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
    const hasQuoteUpdate = body.quoteAmount !== undefined || body.paymentLink !== undefined || body.quoteNote !== undefined;

    if (hasQuoteUpdate) {
      const task = await prisma.task.findFirst({
        where: { id, organizationId: auth.session.organizationId, module: "CLIENT_PORTAL", archivedAt: null },
        select: { id: true, metadata: true, amount: true },
      });
      if (!task || !["NEW_POLICY_QUOTE", "RENEWAL_QUOTE"].includes(task.metadata?.requestType)) {
        return NextResponse.json({ error: "Client quotation task not found." }, { status: 404 });
      }

      const amount = body.quoteAmount === undefined ? task.amount?.toString() : String(body.quoteAmount).replace(/[^0-9.]/g, "");
      if (!amount || Number(amount) <= 0) {
        return NextResponse.json({ error: "Enter a valid quotation amount." }, { status: 422 });
      }
      const rawPaymentLink = String(body.paymentLink || "").trim();
      if (rawPaymentLink && !/^https:\/\//i.test(rawPaymentLink)) {
        return NextResponse.json({ error: "Payment link must start with https://" }, { status: 422 });
      }
      if (rawPaymentLink && !task.metadata?.paymentRequested) {
        return NextResponse.json({ error: "Publish the quotation first. Add a payment link only after the client requests it." }, { status: 422 });
      }

      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          amount,
          status: "WAITING_CUSTOMER",
          metadata: {
            ...(task.metadata || {}),
            quoteNote: String(body.quoteNote || "").trim().slice(0, 2000),
            paymentLink: rawPaymentLink,
            quotePublishedAt: new Date().toISOString(),
            paymentRequested: Boolean(task.metadata?.paymentRequested),
          },
        },
        select: { id: true, title: true, amount: true, status: true, metadata: true, updatedAt: true },
      });
      return NextResponse.json({ success: true, task: { ...updated, amount: updated.amount?.toString() || null } });
    }

    const status = String(body.status || "")
      .trim()
      .toUpperCase();
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid task status." }, { status: 422 });
    }

    const workflowTask = await prisma.task.findFirst({
      where: {
        id,
        ...(auth.session.role === "SUPER_ADMIN" && !auth.session.organizationId
          ? {}
          : { organizationId: auth.session.organizationId ?? null }),
      },
      select: { module: true },
    });
    if (!workflowTask) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    if (SPECIALIZED_WORKFLOW_MODULES.has(workflowTask.module)) {
      return NextResponse.json(
        { error: "Use this task's dedicated workflow action instead of changing its status directly." },
        { status: 409 },
      );
    }

    const task = await updateTaskStatus(auth.session, id, status);
    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { success: false, error: getUserFacingErrorMessage(error, "Task could not be updated.") },
      { status: 500 },
    );
  }
}
