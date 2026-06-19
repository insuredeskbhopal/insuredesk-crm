import { createFieldSetup, getFieldSetupCatalog } from "@/lib/policies/field-setup";
import { verifyJWT } from "@/lib/auth";

async function requireAuthenticatedUser(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return { response: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const user = await verifyJWT(token);
  if (!user) {
    return { response: Response.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }

  return { user };
}

export async function GET(request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  return Response.json(await getFieldSetupCatalog());
}

export async function POST(request) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.response) return auth.response;
    if (!["SUPER_ADMIN", "ADMIN"].includes(auth.user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = await request.json();
    const schema = await createFieldSetup(payload);
    return Response.json(schema, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Field setup could not be saved." },
      { status: 400 },
    );
  }
}
