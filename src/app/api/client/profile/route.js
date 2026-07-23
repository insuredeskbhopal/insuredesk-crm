import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireClient } from "@/lib/client-portal/session";
import { normalizeIndianPhone } from "@/lib/customer-profiles/utils";
import { withClientIdLock, withClientPhoneLock } from "@/lib/client-accounts/server";

export async function GET(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const customer = auth.customer;

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
    const auth = await requireClient(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const phone = normalizeIndianPhone(body.phone || "");
    const email = String(body.email || "").trim().toLowerCase().slice(0, 180);
    if (!phone) {
      return NextResponse.json({ success: false, error: "Enter a valid mobile number" }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address" }, { status: 400 });
    }

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

    const result = await withClientPhoneLock(auth.organizationId, phone, async (database) => {
      const duplicatePhone = await database.clientAccount.findFirst({
        where: {
          organizationId: auth.organizationId,
          phone,
          deletedAt: null,
          NOT: { id: auth.customer.id },
        },
        select: { id: true },
      });
      if (duplicatePhone) return { duplicatePhone };

      return withClientIdLock(
        auth.customer.id,
        async (lockedDatabase) => {
          const current = await lockedDatabase.clientAccount.findFirst({
            where: { id: auth.customer.id, organizationId: auth.organizationId, deletedAt: null },
            select: { id: true },
          });
          if (!current) return { sessionExpired: true };

          const customer = await lockedDatabase.clientAccount.update({
            where: { id: auth.customer.id },
            data: { phone, email: email || null },
            select: { id: true, name: true, phone: true, email: true, createdAt: true },
          });
          await lockedDatabase.task.upsert({
            where: { sourceKey: `client-profile:${customer.id}` },
            create: {
              organizationId: auth.organizationId,
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
          return { customer };
        },
        database,
      );
    });
    if (result.duplicatePhone) {
      return NextResponse.json(
        { success: false, error: "This mobile number already belongs to another Client ID" },
        { status: 409 },
      );
    }
    if (result.sessionExpired) {
      return NextResponse.json({ success: false, error: "Client session expired" }, { status: 401 });
    }

    const customer = result.customer;

    return NextResponse.json({ success: true, profile: { ...customer, ...metadata } });
  } catch (error) {
    console.error("Client profile update error:", error);
    return NextResponse.json({ success: false, error: "Profile could not be updated" }, { status: 500 });
  }
}
