import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signJWT } from "@/lib/auth";
import { verifyClientMpinWithVersion } from "@/lib/client-portal/credentials";
import { normalizeClientId } from "@/lib/client-accounts/server";

export async function POST(request) {
  try {
    const { customerId, mpin } = await request.json();

    if (!customerId || !mpin) {
      return NextResponse.json({ success: false, error: "Client ID and Client MPIN are required" }, { status: 400 });
    }

    const rawInput = String(customerId || "").trim();
    const normalizedCustomerId = normalizeClientId(rawInput);
    const cleanPhone = rawInput.replace(/[^0-9]/g, "").slice(-10);
    const cleanMpin = String(mpin || "").replace(/[^0-9]/g, "");

    if (cleanMpin.length < 4 || cleanMpin.length > 6) {
      return NextResponse.json({ success: false, error: "Client MPIN must be a 4 to 6-digit numeric code" }, { status: 400 });
    }

    let customer = null;
    if (normalizedCustomerId) {
      customer = await prisma.clientAccount.findUnique({
        where: { id: normalizedCustomerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          organizationId: true,
          deletedAt: true
        }
      });
    } else if (cleanPhone.length === 10) {
      customer = await prisma.clientAccount.findFirst({
        where: {
          phone: { contains: cleanPhone },
          deletedAt: null
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          organizationId: true,
          deletedAt: true
        }
      });
    }

    if (!customer || customer.deletedAt) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    if (!customer.phone) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    const cleanDbPhone = customer.phone.replace(/[^0-9]/g, "");
    const mpinVerification = await verifyClientMpinWithVersion(customer, cleanMpin);
    if (!mpinVerification.valid) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    // Sign the JWT token specifically for the client portal
    const token = await signJWT({
      role: "CLIENT",
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      phone: cleanDbPhone,
      organizationId: customer.organizationId,
      credentialVersion: mpinVerification.credentialVersion,
    });

    // Set secure HTTP-only cookie matching standard session settings
    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
      token,
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
