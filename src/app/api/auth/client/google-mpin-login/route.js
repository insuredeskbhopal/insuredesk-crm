import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signJWT } from "@/lib/auth";

export async function POST(request) {
  try {
    const { googleEmail, customerId, mpin } = await request.json();
    const normalizedGoogleEmail = String(googleEmail || "").trim().toLowerCase();

    if (!normalizedGoogleEmail) {
      return NextResponse.json({ success: false, error: "Google email is required" }, { status: 400 });
    }

    // ── AUTO-LOGIN: Check if this Google email is already linked to a profile ──
    if (!customerId && !mpin) {
      const linked = await prisma.customerProfile.findFirst({
        where: { googleEmail: normalizedGoogleEmail, deletedAt: null },
        select: { id: true, name: true, email: true, phone: true, organizationId: true },
      });

      if (linked) {
        return createClientLoginResponse(linked, "Auto-logged in via linked Google account");
      }

      const matchingProfiles = await prisma.customerProfile.findMany({
        where: { email: { equals: normalizedGoogleEmail, mode: "insensitive" }, deletedAt: null },
        take: 2,
        select: { id: true, name: true, email: true, phone: true, organizationId: true },
      });

      if (matchingProfiles.length === 1) {
        const matched = await prisma.customerProfile.update({
          where: { id: matchingProfiles[0].id },
          data: { googleEmail: normalizedGoogleEmail },
          select: { id: true, name: true, email: true, phone: true, organizationId: true },
        });

        return createClientLoginResponse(matched, "Auto-linked and logged in via Google account");
      }

      if (matchingProfiles.length > 1) {
        return NextResponse.json(
          {
            success: false,
            linked: false,
            error: "Multiple client profiles use this email. Please link once using Client ID and MPIN.",
          },
          { status: 200 },
        );
      }

      return NextResponse.json({ success: false, linked: false, error: "Google email not linked yet" }, { status: 200 });
    }

    // ── FIRST-TIME LINK: Verify Client ID + MPIN, then persist the Google email ──
    if (!customerId || !mpin) {
      return NextResponse.json({ success: false, error: "Customer ID and MPIN are required" }, { status: 400 });
    }

    const cleanMpin = mpin.replace(/[^0-9]/g, "");
    if (cleanMpin.length !== 4) {
      return NextResponse.json({ success: false, error: "MPIN must be a 4-digit code" }, { status: 400 });
    }

    const customer = await prisma.customerProfile.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true, phone: true, organizationId: true, deletedAt: true, googleEmail: true },
    });

    if (!customer || customer.deletedAt) {
      return NextResponse.json({ success: false, error: "Customer profile not found" }, { status: 404 });
    }

    if (!customer.phone) {
      return NextResponse.json({ success: false, error: "No mobile number associated with this profile" }, { status: 400 });
    }

    const cleanDbPhone = customer.phone.replace(/[^0-9]/g, "");
    if (cleanDbPhone.slice(-4) !== cleanMpin) {
      return NextResponse.json({ success: false, error: "Incorrect MPIN details" }, { status: 401 });
    }

    const existingGoogleLink = await prisma.customerProfile.findFirst({
      where: {
        googleEmail: normalizedGoogleEmail,
        deletedAt: null,
        NOT: { id: customer.id },
      },
      select: { id: true },
    });

    if (existingGoogleLink) {
      return NextResponse.json(
        { success: false, error: "This Google account is already linked to another client profile" },
        { status: 409 },
      );
    }

    // Persist/update the Google email link on the CustomerProfile (one-time setup)
    if (customer.googleEmail !== normalizedGoogleEmail) {
      await prisma.customerProfile.update({
        where: { id: customer.id },
        data: { googleEmail: normalizedGoogleEmail },
      });
    }

    return createClientLoginResponse(
      { ...customer, phone: cleanDbPhone },
      "Account linked & logged in successfully",
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

async function createClientLoginResponse(customer, message) {
  const token = await signJWT({
    role: "CLIENT",
    customerId: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone?.replace(/[^0-9]/g, ""),
    organizationId: customer.organizationId,
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
