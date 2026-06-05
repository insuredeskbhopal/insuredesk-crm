import { verifyJWT } from "@/lib/auth";

export const dynamic = "force-dynamic";

const POLICY_TYPES = [
  "Motor Policy",
  "Health Policy",
  "Life Policy",
  "Fire Policy",
  "Marine Policy",
  "Travel Policy",
  "Commercial Policy",
  "Other Policy"
];

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    return Response.json({ policyTypes: POLICY_TYPES });
  } catch (error) {
    console.error("Renewals policy-types fetch failed:", error);
    return Response.json({ error: "Failed to load policy types." }, { status: 500 });
  }
}
