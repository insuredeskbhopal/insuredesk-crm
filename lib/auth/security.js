const ADMIN_HEADER = "x-admin-token";
const DELETE_CONFIRMATION_HEADER = "x-confirm-delete";
const DELETE_CONFIRMATION_VALUE = "DELETE_ALL_POLICY_RECORDS";

export function requireAdmin(request) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return null;
  }

  const received = request.headers.get(ADMIN_HEADER);
  if (received === expected) {
    return null;
  }

  return Response.json({ error: "Unauthorized." }, { status: 401 });
}

export function requireDeleteConfirmation(request) {
  const confirmed = request.headers.get(DELETE_CONFIRMATION_HEADER);
  if (confirmed !== DELETE_CONFIRMATION_VALUE) {
    return Response.json(
      {
        error: `Missing ${DELETE_CONFIRMATION_HEADER}: ${DELETE_CONFIRMATION_VALUE}`,
      },
      { status: 428 },
    );
  }

  return requireAdmin(request);
}

export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
};
