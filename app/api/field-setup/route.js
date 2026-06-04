import { createFieldSetup, getFieldSetupCatalog } from "@/lib/policies/field-setup";

export async function GET() {
  return Response.json(await getFieldSetupCatalog());
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const schema = await createFieldSetup(payload);
    return Response.json(schema, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Field setup could not be saved." }, { status: 400 });
  }
}
