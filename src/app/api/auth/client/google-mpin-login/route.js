import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signJWT } from "@/lib/auth";

export async function POST(request) {
  try {
    const { googleEmail, customerId, mpin } = await request.json();

    if (!googleEmail) {
      return NextResponse.json({ success: false, error: "Google email is required" }, { status: 400 });
    }

    // ── AUTO-LOGIN: Check if this Google email is already linked to a profile ──
    if (!customerId && !mpin) {
      const linked = await prisma.customerProfile.findFirst({
        where: { googleEmail: googleEmail.toLowerCase(), deletedAt: null },
        select: { id: true, name: true, email: true, phone: true, organizationId: true },
      });

      if (!linked) {
        return NextResponse.json({ success: false, linked: false, error: "Google email not linked yet" }, { status: 200 });
      }

      // Issue token directly — no MPIN needed on subsequent logins
      const token = await signJWT({
        role: "CLIENT",
        customerId: linked.id,
        email: linked.email,
        name: linked.name,
        phone: linked.phone?.replace(/[^0-9]/g, ""),
        organizationId: linked.organizationId,
      });

      const response = NextResponse.json({
        success: true,
        linked: true,
        message: "Auto-logged in via linked Google account",
        user: {
          customerId: linked.id,
          email: linked.email,
          name: linked.name,
          role: "CLIENT",
          organizationId: linked.organizationId,
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

    // Persist the Google email link on the CustomerProfile (one-time)
    if (!customer.googleEmail) {
      await prisma.customerProfile.update({
        where: { id: customer.id },
        data: { googleEmail: googleEmail.toLowerCase() },
      });
    }

    const token = await signJWT({
      role: "CLIENT",
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      phone: cleanDbPhone,
      organizationId: customer.organizationId,
    });

    const response = NextResponse.json({
      success: true,
      linked: true,
      message: "Account linked & logged in successfully",
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
  } catch (error) {
    console.error("Google MPIN login error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
