import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const token = request.cookies.get("token")?.value;
  const user = token ? await verifyJWT(token) : null;
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const portfolios = await prisma.customerProfile.findMany({
    where: {
      deletedAt: null,
      ...(user.role === "SUPER_ADMIN" ? {} : { organizationId: user.organizationId || null }),
    },
    select: { id: true, name: true, phone: true, email: true, contactPersonName: true },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });

  return Response.json({ portfolios });
}
