import { getPolicySchema } from "@/lib/policies/field-setup";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const schema = await getPolicySchema({
    bankSourceId: searchParams.get("bankSourceId") || undefined,
    companyId: searchParams.get("companyId") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    policyTypeId: searchParams.get("policyTypeId") || undefined,
  });

  if (!schema) {
    return Response.json({ error: "No active schema found." }, { status: 404 });
  }

  return Response.json(schema);
}
