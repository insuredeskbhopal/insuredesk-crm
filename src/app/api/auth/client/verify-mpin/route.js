import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyClientMpin } from "@/lib/client-portal/credentials";

export async function POST(request) {
  try {
    const { customerId, mpin } = await request.json();

    if (!customerId || !mpin) {
      return NextResponse.json({ success: false, error: "Customer ID and MPIN are required" }, { status: 400 });
    }

    const cleanMpin = mpin.replace(/[^0-9]/g, "");
    if (cleanMpin.length !== 4) {
      return NextResponse.json({ success: false, error: "MPIN must be a 4-digit code" }, { status: 400 });
    }

    const customer = await prisma.clientAccount.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        deletedAt: true
      }
    });

    if (!customer || customer.deletedAt) {
      return NextResponse.json({ success: false, error: "Client account not found" }, { status: 404 });
    }

    if (!customer.phone) {
      return NextResponse.json({ success: false, error: "No mobile number associated with this profile" }, { status: 400 });
    }

    if (!(await verifyClientMpin(customer, cleanMpin))) {
      return NextResponse.json({ success: false, error: "Incorrect MPIN details" }, { status: 401 });
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
