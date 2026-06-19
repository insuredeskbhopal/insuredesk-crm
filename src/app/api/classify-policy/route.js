import { classifyPolicyText } from "@/lib/policies/classifier";

export const runtime = "nodejs";

export async function POST(request) {
  const payload = await request.json();
  const rawText = String(payload.rawText || "");

  if (!rawText.trim()) {
    return Response.json({ error: "rawText is required." }, { status: 400 });
  }

  return Response.json(await classifyPolicyText(rawText));
}
