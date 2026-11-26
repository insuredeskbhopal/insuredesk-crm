import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signJWT } from "@/lib/auth";
import { verifyClientMpinWithVersion } from "@/lib/client-portal/credentials";
import { normalizeClientCode } from "@/lib/client-accounts/utils";
import { normalizeClientId } from "@/lib/client-accounts/server";

export async function OPTIONS(request) {
  const origin = request.headers.get("origin") || "";
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const allowedOrigins = new Set(
    [
      "https://bimaheadquarter.com",
      "https://www.bimaheadquarter.com",
      ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://127.0.0.1:3000"] : []),
      ...(configured ? [configured] : []),
    ],
  );
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...(allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request) {
  try {
    const { customerId, phone, mpin } = await request.json();
    const rawInput = String(customerId || phone || "").trim();

    if (!rawInput || !mpin) {
      return NextResponse.json({ success: false, error: "Mobile number or Client ID and MPIN are required" }, { status: 400 });
    }

    const normalizedCustomerId = normalizeClientId(rawInput);
    const normalizedClientCode = normalizeClientCode(rawInput);
    const cleanPhone = rawInput.replace(/[^0-9]/g, "").slice(-10);
    const cleanMpin = String(mpin || "").replace(/[^0-9]/g, "");

    if (cleanMpin.length < 4 || cleanMpin.length > 6) {
      return NextResponse.json({ success: false, error: "Client MPIN must be a 4 to 6-digit numeric code" }, { status: 400 });
    }

    const selectAccountFields = {
      id: true,
      clientCode: true,
      name: true,
      email: true,
      phone: true,
      organizationId: true,
      deletedAt: true,
    };

    let customer = null;
    if (normalizedCustomerId) {
      customer = await prisma.clientAccount.findUnique({
        where: { id: normalizedCustomerId },
        select: selectAccountFields,
      });
    } else if (normalizedClientCode) {
      customer = await prisma.clientAccount.findUnique({
        where: { clientCode: normalizedClientCode },
        select: selectAccountFields,
      });
    } else if (cleanPhone.length === 10) {
      const phoneMatches =
        typeof prisma.clientAccount.findMany === "function"
          ? await prisma.clientAccount.findMany({
              where: {
                phone: cleanPhone,
                deletedAt: null,
              },
              select: selectAccountFields,
              take: 3,
            })
          : (() => null)();

      if (Array.isArray(phoneMatches)) {
        if (phoneMatches.length > 1) {
          return NextResponse.json(
            {
              success: false,
              code: "MULTIPLE_ACCOUNTS",
              requiresClientId: true,
              error: "Multiple client accounts share this mobile number. Please sign in using your Client ID (BHQ-...).",
            },
            { status: 409 },
          );
        }
        customer = phoneMatches[0] || null;
      } else {
        customer = await prisma.clientAccount.findFirst({
          where: {
            phone: { contains: cleanPhone },
            deletedAt: null,
          },
          select: selectAccountFields,
        });
      }
    }

    if (!customer || customer.deletedAt) {
      return NextResponse.json({
        success: false,
        error: cleanPhone.length === 10
          ? "Account not found. If your policy was recently added, please verify your mobile number via OTP first."
          : "Invalid Client ID or MPIN.",
      }, { status: 401 });
    }

    if (!customer.phone) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    const cleanDbPhone = customer.phone.replace(/[^0-9]/g, "");
    const mpinVerification = await verifyClientMpinWithVersion(customer, cleanMpin);
    if (!mpinVerification.valid) {
      const existingCred = await prisma.task.findUnique({
        where: { sourceKey: `client-credential:${customer.id}` },
        select: { metadata: true },
      });
      if (!existingCred?.metadata?.mpinHash) {
        return NextResponse.json(
          {
            success: false,
            code: "OTP_SETUP_REQUIRED",
            error: "First-time portal setup requires OTP verification. Please use Set / Reset MPIN with OTP.",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    // Sign the JWT token specifically for the client portal
    const token = await signJWT({
      role: "CLIENT",
      customerId: customer.id,
      clientCode: customer.clientCode || "",
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
        clientCode: customer.clientCode || "",
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
    console.error("Client ID login error stack:", error.stack || error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
