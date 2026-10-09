import { POST as manageAccount } from "../sessions/route";

export const runtime = "nodejs";

// Keep legacy callers on the same ownership checks as account management.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  return manageAccount({
    cookies: request.cookies,
    json: async () => ({ action: "logout", accountId: body.accountId }),
  });
}
