import { verifyJWT } from "@/lib/auth";
import insuranceCompanyMaster from "@/lib/master/insurance-companies.cjs";

export const dynamic = "force-dynamic";
const { getInsuranceCompanyNames } = insuranceCompanyMaster;

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

    return Response.json({ companies: getInsuranceCompanyNames() });
  } catch (error) {
    console.error("Renewals companies fetch failed:", error);
    return Response.json({ error: "Failed to load companies." }, { status: 500 });
  }
}
