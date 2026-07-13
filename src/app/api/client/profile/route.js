import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifyJWT(token);
    if (
      !session ||
      session.role !== "CLIENT" ||
      !session.customerId ||
      session.organizationId === undefined
    ) {
      return NextResponse.json({ success: false, error: "Access Denied" }, { status: 403 });
    }

    const customer = await prisma.clientAccount.findFirst({
      where: {
        id: session.customerId,
        organizationId: session.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return clearClientSession({ success: false, error: "Client session expired" }, 401);
    }

    const settings = prisma.task?.findUnique
      ? await prisma.task.findUnique({
          where: { sourceKey: `client-profile:${customer.id}` },
          select: { metadata: true },
        })
      : null;

    return NextResponse.json({
      success: true,
      profile: {
        ...customer,
        address: settings?.metadata?.address || "",
        city: settings?.metadata?.city || "",
        state: settings?.metadata?.state || "",
        pincode: settings?.metadata?.pincode || "",
        communicationPreferences: settings?.metadata?.communicationPreferences || {
          email: true,
          whatsapp: true,
          policyReminders: true,
          claimUpdates: true,
          paymentReminders: true,
        },
      },
    });
  } catch (error) {
    console.error("Client Profile Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const session = token ? await verifyJWT(token) : null;
    if (!session || session.role !== "CLIENT" || !session.customerId || session.organizationId === undefined) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const phone = String(body.phone || "").replace(/[^0-9+]/g, "").slice(0, 16);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 180);
    if (phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ success: false, error: "Enter a valid mobile number" }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address" }, { status: 400 });
    }

    const customer = await prisma.clientAccount.update({
      where: { id: session.customerId },
      data: { phone, email: email || null },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    });
    const metadata = {
      address: String(body.address || "").trim().slice(0, 500),
      city: String(body.city || "").trim().slice(0, 100),
      state: String(body.state || "").trim().slice(0, 100),
      pincode: String(body.pincode || "").replace(/\D/g, "").slice(0, 6),
      communicationPreferences: {
        email: Boolean(body.communicationPreferences?.email),
        whatsapp: Boolean(body.communicationPreferences?.whatsapp),
        policyReminders: Boolean(body.communicationPreferences?.policyReminders),
        claimUpdates: Boolean(body.communicationPreferences?.claimUpdates),
        paymentReminders: Boolean(body.communicationPreferences?.paymentReminders),
      },
    };

    await prisma.task.upsert({
      where: { sourceKey: `client-profile:${customer.id}` },
      create: {
        organizationId: session.organizationId,
        title: "Client portal profile settings",
        description: "Client-managed profile and communication preferences.",
        type: "SERVICE_REQUEST",
        status: "COMPLETED",
        priority: "MEDIUM",
        module: "CLIENT_PORTAL_PROFILE",
        recordId: customer.id,
        recordLabel: customer.name,
        customerName: customer.name,
        customerMobile: customer.phone,
        sourceKey: `client-profile:${customer.id}`,
        metadata,
        completedAt: new Date(),
        archivedAt: new Date(),
      },
      update: { customerMobile: customer.phone, metadata, completedAt: new Date(), archivedAt: new Date() },
    });

    return NextResponse.json({ success: true, profile: { ...customer, ...metadata } });
  } catch (error) {
    console.error("Client profile update error:", error);
    return NextResponse.json({ success: false, error: "Profile could not be updated" }, { status: 500 });
  }
}

function clearClientSession(payload, status) {
  const response = NextResponse.json(payload, { status });
  response.cookies.set({
    name: "token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
