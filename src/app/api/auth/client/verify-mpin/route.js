import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyClientMpin } from "@/lib/client-portal/credentials";
import { normalizeClientId } from "@/lib/client-accounts/server";

export async function POST(request) {
  try {
    const { customerId, mpin } = await request.json();

    if (!customerId || !mpin) {
      return NextResponse.json({ success: false, error: "Customer ID and MPIN are required" }, { status: 400 });
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
        deletedAt: true
      }
    });

    if (!customer || customer.deletedAt) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    if (!customer.phone) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    if (!(await verifyClientMpin(customer, cleanMpin))) {
      return NextResponse.json({ success: false, error: "Invalid Client ID or MPIN" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: "Customer verified successfully",
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email
      }
    });
  } catch (error) {
    console.error("Verify MPIN error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
