import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOwnedPolicy, requireClient } from "@/lib/client-portal/session";

const REQUEST_TYPES = {
  NEW_POLICY_QUOTE: { type: "SERVICE_REQUEST", title: "New policy quotation request", priority: "HIGH" },
  RENEWAL_QUOTE: { type: "RENEWAL", title: "Renewal quotation request", priority: "HIGH" },
  SUPPORT: { type: "SERVICE_REQUEST", title: "Client support ticket", priority: "MEDIUM" },
  VEHICLE_CORRECTION: { type: "ENDORSEMENT", title: "Vehicle details correction", priority: "MEDIUM" },
  NOMINEE_CHANGE: { type: "ENDORSEMENT", title: "Nominee change request", priority: "MEDIUM" },
  CONTACT_CHANGE: { type: "ENDORSEMENT", title: "Contact details change request", priority: "MEDIUM" },
};

export async function GET(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;

    const requests = await prisma.task.findMany({
      where: {
        organizationId: auth.organizationId,
        module: "CLIENT_PORTAL",
        recordId: auth.customer.id,
        archivedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        priority: true,
        policyNumber: true,
        amount: true,
        dueAt: true,
        completedAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        comments: {
          orderBy: { createdAt: "asc" },
          select: { id: true, comment: true, createdAt: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      requests: requests.map((item) => ({ ...item, amount: item.amount?.toString() || null })),
    });
  } catch (error) {
    console.error("Client service requests error:", error);
    return NextResponse.json({ success: false, error: "Requests could not be loaded" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    const requestType = String(body.requestType || "").toUpperCase();
    const config = REQUEST_TYPES[requestType];
    if (!config) return NextResponse.json({ success: false, error: "Invalid request type" }, { status: 400 });

    const policyNo = String(body.policyNo || "").trim();
    if (policyNo) {
      const policy = await getOwnedPolicy({
        customerId: auth.customer.id,
        organizationId: auth.organizationId,
        policyNo,
      });
      if (!policy) return NextResponse.json({ success: false, error: "Policy not found for this client" }, { status: 403 });
    }

    const details = String(body.details || "").trim().slice(0, 4000);
    if (["NEW_POLICY_QUOTE", "SUPPORT", "VEHICLE_CORRECTION", "NOMINEE_CHANGE", "CONTACT_CHANGE"].includes(requestType) && !details) {
      return NextResponse.json({ success: false, error: "Please provide request details" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        organizationId: auth.organizationId,
        title: config.title,
        description: details || `${config.title} submitted from the secured client portal.`,
        type: config.type,
        status: "OPEN",
        priority: config.priority,
        module: "CLIENT_PORTAL",
        recordId: auth.customer.id,
        recordLabel: auth.customer.name,
        customerName: auth.customer.name,
        customerMobile: auth.customer.phone,
        policyNumber: policyNo || null,
        amount: body.amount ? String(body.amount).replace(/[^0-9.]/g, "") || null : null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        metadata: {
          requestType,
          clientId: auth.customer.id,
          email: auth.customer.email || "",
          preferredContact: body.preferredContact || "PHONE",
          submittedValues: body.values || {},
        },
      },
      select: { id: true, title: true, type: true, status: true, policyNumber: true, metadata: true, createdAt: true },
    });

    return NextResponse.json({ success: true, request: task });
  } catch (error) {
    console.error("Client service request create error:", error);
    return NextResponse.json({ success: false, error: "Request could not be submitted" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (body.action !== "REQUEST_PAYMENT_LINK" || !body.requestId) {
      return NextResponse.json({ success: false, error: "Invalid quotation action" }, { status: 400 });
    }

    const task = await prisma.task.findFirst({
      where: {
        id: body.requestId,
        organizationId: auth.organizationId,
        module: "CLIENT_PORTAL",
        recordId: auth.customer.id,
        archivedAt: null,
      },
      select: { id: true, metadata: true, amount: true },
    });
    if (!task || !task.amount) {
      return NextResponse.json({ success: false, error: "The agent must publish a quotation before payment can be requested" }, { status: 400 });
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "OPEN",
        metadata: { ...(task.metadata || {}), paymentRequested: true, paymentRequestedAt: new Date().toISOString() },
        comments: { create: { comment: "Client requested a secure payment link." } },
      },
      select: { id: true, status: true, metadata: true, updatedAt: true },
    });
    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Client payment-link request error:", error);
    return NextResponse.json({ success: false, error: "Payment link request could not be submitted" }, { status: 500 });
  }
}
