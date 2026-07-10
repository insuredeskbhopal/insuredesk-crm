import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signJWT } from "@/lib/auth";

export async function POST(request) {
  try {
    const { customerId, mpin } = await request.json();

    if (!customerId || !mpin) {
      return NextResponse.json({ success: false, error: "Client ID and Client MPIN are required" }, { status: 400 });
    }

    const cleanMpin = mpin.replace(/[^0-9]/g, "");
    if (cleanMpin.length !== 4) {
      return NextResponse.json({ success: false, error: "Client MPIN must be a 4-digit code" }, { status: 400 });
    }

    // Lookup the CustomerProfile
    const customer = await prisma.customerProfile.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        organizationId: true,
        deletedAt: true
      }
    });

    if (!customer || customer.deletedAt) {
      return NextResponse.json({ success: false, error: "Client profile not found" }, { status: 404 });
    }

    if (!customer.phone) {
      return NextResponse.json({ success: false, error: "No mobile number associated with this profile" }, { status: 400 });
    }

    const cleanDbPhone = customer.phone.replace(/[^0-9]/g, "");
    if (cleanDbPhone.slice(-4) !== cleanMpin) {
      return NextResponse.json({ success: false, error: "Incorrect Client MPIN details" }, { status: 401 });
    }

    // Sign the JWT token specifically for the client portal
    const token = await signJWT({
      role: "CLIENT",
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      phone: cleanDbPhone,
      organizationId: customer.organizationId
    });

    // Set secure HTTP-only cookie matching standard session settings
    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
      user: {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        role: "CLIENT",
        organizationId: customer.organizationId
      }
    });

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Client ID login error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
