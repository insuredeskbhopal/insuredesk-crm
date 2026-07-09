import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";

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

    const where =
      user.role === "SUPER_ADMIN" && !user.organizationId
        ? { role: { not: "VIEWER" } }
        : { organizationId: user.organizationId || null, role: { not: "VIEWER" } };

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return Response.json({
      users: users.map((member) => ({
        id: member.id,
        name: member.name || member.email,
        email: member.email,
        role: member.role,
      })),
    });
  } catch (error) {
    console.error("Renewals team fetch failed:", error);
    return Response.json({ error: "Failed to load team members." }, { status: 500 });
  }
}
