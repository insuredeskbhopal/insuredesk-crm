import { NextResponse } from "next/server";
import { requireClient } from "@/lib/client-portal/session";
import { setClientMpin, verifyClientMpin } from "@/lib/client-portal/credentials";

export async function PATCH(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const { currentMpin, newMpin } = await request.json();
    const cleanNewMpin = String(newMpin || "").replace(/\D/g, "");
    if (cleanNewMpin.length !== 4) {
      return NextResponse.json({ success: false, error: "New MPIN must contain exactly four digits" }, { status: 400 });
    }
    if (!(await verifyClientMpin(auth.customer, currentMpin))) {
      return NextResponse.json({ success: false, error: "Current MPIN is incorrect" }, { status: 400 });
    }
    if (String(currentMpin) === cleanNewMpin) {
      return NextResponse.json({ success: false, error: "Choose a different MPIN" }, { status: 400 });
    }

    await setClientMpin(auth.customer.id, cleanNewMpin);
    return NextResponse.json({ success: true, message: "MPIN changed successfully" });
  } catch (error) {
    console.error("Client MPIN update error:", error);
    return NextResponse.json({ success: false, error: "MPIN could not be changed" }, { status: 500 });
  }
}
