import { NextResponse } from "next/server";
import { requireClient } from "@/lib/client-portal/session";
import { setClientMpin, verifyClientMpinWithVersion } from "@/lib/client-portal/credentials";

export async function PATCH(request) {
  try {
    const auth = await requireClient(request);
    if (auth.error) return auth.error;
    const { currentMpin, newMpin } = await request.json();
    const cleanCurrentMpin = String(currentMpin || "").replace(/\D/g, "");
    const cleanNewMpin = String(newMpin || "").replace(/\D/g, "");
    if (cleanNewMpin.length !== 4) {
      return NextResponse.json({ success: false, error: "New MPIN must contain exactly four digits" }, { status: 400 });
    }
    const verification = await verifyClientMpinWithVersion(auth.customer, cleanCurrentMpin);
    if (!verification.valid) {
      return NextResponse.json({ success: false, error: "Current MPIN is incorrect" }, { status: 400 });
    }
    if (cleanCurrentMpin === cleanNewMpin) {
      return NextResponse.json({ success: false, error: "Choose a different MPIN" }, { status: 400 });
    }

    await setClientMpin(auth.customer.id, cleanNewMpin, verification.credentialVersion);
    return NextResponse.json({ success: true, message: "MPIN changed successfully" });
  } catch (error) {
    if (error?.code === "CREDENTIAL_VERSION_CONFLICT") {
      return NextResponse.json(
        { success: false, error: "Your MPIN changed in another session. Please sign in again." },
        { status: 409 },
      );
    }
    console.error("Client MPIN update error:", error);
    return NextResponse.json({ success: false, error: "MPIN could not be changed" }, { status: 500 });
  }
}
