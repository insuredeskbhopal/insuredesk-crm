import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signJWT } from "@/lib/auth";
import { getClientCredentialVersion, withVerifiedClientMpin } from "@/lib/client-portal/credentials";
import { getVerifiedGoogleEmail } from "@/lib/client-portal/google";
import { findActiveClientAccount, normalizeClientId, withClientIdLock } from "@/lib/client-accounts/server";

export async function POST(request) {
  try {
    const { accessToken, customerId, mpin } = await request.json();
    const normalizedGoogleEmail = await getVerifiedGoogleEmail(accessToken);

    if (!normalizedGoogleEmail) {
      return NextResponse.json(
        { success: false, error: "Google identity could not be verified" },
        { status: 401 },
      );
    }

    // ── AUTO-LOGIN: Check if this Google email is already linked to a profile ──
    if (!customerId && !mpin) {
      const linked = await prisma.clientAccount.findFirst({
        where: { googleEmail: normalizedGoogleEmail, deletedAt: null },
        select: { id: true, name: true, email: true, phone: true, organizationId: true },
      });

      if (linked) {
        return createClientLoginResponse(linked, "Auto-logged in via linked Google account");
      }

      return NextResponse.json(
        { success: false, linked: false, error: "Google email not linked yet" },
        { status: 200 },
      );
    }

    // ── FIRST-TIME LINK: Verify Client ID + MPIN, then persist the Google email ──
    if (!customerId || !mpin) {
      return NextResponse.json(
        { success: false, error: "Customer ID and MPIN are required" },
        { status: 400 },
      );
    }

    const normalizedCustomerId = normalizeClientId(customerId);
    const cleanMpin = String(mpin || "").replace(/[^0-9]/g, "");
    if (!normalizedCustomerId) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }
    if (cleanMpin.length !== 4) {
      return NextResponse.json({ success: false, error: "MPIN must be a 4-digit code" }, { status: 400 });
    }

    const customer = await prisma.clientAccount.findUnique({
      where: { id: normalizedCustomerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        organizationId: true,
        deletedAt: true,
        googleEmail: true,
      },
    });

    if (!customer || customer.deletedAt) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    if (!customer.phone) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    const mpinVerification = await withVerifiedClientMpin(customer, cleanMpin, (credentialDatabase) =>
      withClientIdLock(
        customer.id,
        async (database) => {
          const activeCustomer = await findActiveClientAccount(
            customer.id,
            customer.organizationId,
            database,
          );
          if (!activeCustomer) return { inactive: true };

          const existingGoogleLink = await database.clientAccount.findFirst({
            where: {
              googleEmail: normalizedGoogleEmail,
              deletedAt: null,
              NOT: { id: activeCustomer.id },
            },
            select: { id: true },
          });
          if (existingGoogleLink) return { conflict: true };

          await database.clientAccount.update({
            where: { id: activeCustomer.id },
            data: { googleEmail: normalizedGoogleEmail },
          });
          return { customer: activeCustomer };
        },
        credentialDatabase,
      ),
    );
    if (!mpinVerification.valid) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }
    const linkResult = mpinVerification.value;

    if (linkResult.inactive) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }
    if (linkResult.conflict) {
      return NextResponse.json(
        { success: false, error: "This Google account is already linked to another client profile" },
        { status: 409 },
      );
    }

    return createClientLoginResponse(
      linkResult.customer,
      "Account linked & logged in successfully",
      mpinVerification.credentialVersion,
    );
  } catch (error) {
    console.error("Google MPIN login error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "This Google account is already linked to another client profile" },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

async function createClientLoginResponse(customer, message, verifiedCredentialVersion) {
  const credentialVersion = verifiedCredentialVersion ?? (await getClientCredentialVersion(customer.id));
  const token = await signJWT({
    role: "CLIENT",
    customerId: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone?.replace(/[^0-9]/g, ""),
    organizationId: customer.organizationId,
    credentialVersion,
  });

  const response = NextResponse.json({
    success: true,
    linked: true,
    message,
    user: {
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      role: "CLIENT",
      organizationId: customer.organizationId,
    },
  });

  response.cookies.set({
    name: "token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return response;
}
