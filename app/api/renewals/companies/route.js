import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";
import { getTenantFilter } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

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

    const tenantFilter = getTenantFilter(user, "read");

    const records = await prisma.policyRecord.findMany({
      where: {
        ...tenantFilter,
        isActivePolicy: true
      },
      select: {
        selectedCompany: true,
        data: true,
        reviewedData: true
      }
    });

    const companies = new Set();
    records.forEach((r) => {
      const payload = r.reviewedData || r.data || {};
      const company = r.selectedCompany || payload.insuranceCompany || payload.companyName || payload.insurerName || "";
      if (company.trim()) {
        companies.add(company.trim());
      }
    });

    return Response.json({ companies: Array.from(companies).sort() });
  } catch (error) {
    console.error("Renewals companies fetch failed:", error);
    return Response.json({ error: "Failed to load companies." }, { status: 500 });
  }
}
